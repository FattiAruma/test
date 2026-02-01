// apps/SettingsApp.js
import { reactive, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        apiConfig: Object,
        modelList: Array,
        savedApis: Array
    },
    emits: ['close', 'update:modelList'],
    setup(props, { emit }) {
        const apiStatus = reactive({ loading: false, msg: '', type: '', errorType: '' });
        const storageInfo = reactive({ used: 0, quota: 0, percent: 0, usedStr: '0 B', quotaStr: '0 B' });

        const formatSize = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const STORAGE_KEY = 'mySpaceData_v6_vue_split';

        const compactStorage = async () => {
            if (apiStatus.loading) return;
            if (!confirm("这将重置数据库以清除碎片并释放空间。\n(您的数据不会丢失，但建议先备份)")) return;
            
            apiStatus.loading = true;
            apiStatus.msg = "正在整理数据库...";
            apiStatus.type = "info";
            
            try {
                // 1. 读取当前数据
                const currentData = await localforage.getItem(STORAGE_KEY);
                if (!currentData) throw new Error("读取数据失败，取消操作");
                
                // 2. 清空数据库 (这将清除所有碎片和日志)
                await localforage.clear();
                
                // 3. 重新写入数据
                await localforage.setItem(STORAGE_KEY, currentData);
                
                // 4. 刷新显示
                await updateStorage();
                
                apiStatus.msg = "✅ 空间已释放";
                apiStatus.type = "success";
            } catch (e) {
                console.error("Compact failed", e);
                apiStatus.msg = "❌ 整理失败: " + e.message;
                apiStatus.type = "error";
            } finally {
                apiStatus.loading = false;
                setTimeout(() => {
                    if (apiStatus.msg.includes('整理')) apiStatus.msg = '';
                }, 3000);
            }
        };

        const updateStorage = async () => {
            let totalUsed = 0;
            let totalQuota = 0;

            // 1. 计算 LocalStorage 使用量 (字符数 * 2 近似字节)
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const val = localStorage.getItem(key);
                    if (key && val) {
                        totalUsed += (key.length + val.length) * 2;
                    }
                }
                console.log("LocalStorage used:", totalUsed);
            } catch (e) {
                console.warn("LocalStorage access error:", e);
            }

            // 2. 获取浏览器存储估算 (IndexedDB, Cache 等)
            // 由于已升级到 IndexedDB 存储，现在可以使用完整的磁盘配额
            if (navigator.storage && navigator.storage.estimate) {
                try {
                    const estimate = await navigator.storage.estimate();
                    // 使用浏览器报告的总使用量 (通常包含 IndexedDB, Cache, Service Worker 等)
                    if (estimate.usage) totalUsed = estimate.usage;
                    totalQuota = estimate.quota || 0;
                } catch (e) {
                    console.error("Storage estimate failed", e);
                }
            }

            // 3. 如果无法获取配额或配额为0，设置默认显示值
            if (totalQuota === 0) {
                totalQuota = 1024 * 1024 * 1024; // 1GB
            }

            storageInfo.used = totalUsed;
            storageInfo.quota = totalQuota;
            
            // 计算百分比
            if (storageInfo.quota > 0) {
                storageInfo.percent = Math.min((storageInfo.used / storageInfo.quota) * 100, 100);
            } else {
                storageInfo.percent = 0;
            }
            
            storageInfo.usedStr = formatSize(storageInfo.used);
            storageInfo.quotaStr = formatSize(storageInfo.quota);
        };

        watch(() => props.isOpen, (newVal) => {
            if (newVal) {
                updateStorage();
            }
        });

        // 初始化调用
        updateStorage();

        const saveCurrentApi = () => {
            if (!props.apiConfig.endpoint || !props.apiConfig.key) {
                alert("请先填写地址和密钥");
                return;
            }
            const name = prompt("给这个配置起个名字 (例如: GPT-4):", "新的配置");
            if (name) {
                props.savedApis.push({
                    name: name,
                    endpoint: props.apiConfig.endpoint,
                    key: props.apiConfig.key
                });
            }
        };

        const loadSavedApi = (index) => {
            const api = props.savedApis[index];
            if (api) {
                props.apiConfig.endpoint = api.endpoint;
                props.apiConfig.key = api.key;
                apiStatus.msg = `已填入配置: ${api.name}`;
                apiStatus.type = 'success';
                setTimeout(() => apiStatus.msg = '', 2000);
            }
        };

        const deleteSavedApi = (index) => {
            if(confirm("确定删除这个保存的配置吗？")) {
                props.savedApis.splice(index, 1);
            }
        };

        // === 核心修改：使用严格的 API 验证逻辑 ===
        const fetchModels = async () => {
            emit('update:modelList', []); // 清空列表
            props.apiConfig.model = ''; 
            apiStatus.msg = ''; apiStatus.type = ''; apiStatus.errorType = '';
            
            if (!props.apiConfig.endpoint) { apiStatus.msg = '请填写接口地址'; apiStatus.type = 'error'; apiStatus.errorType = 'url'; return; }
            if (!props.apiConfig.key) { apiStatus.msg = '请填写 API 密钥'; apiStatus.type = 'error'; apiStatus.errorType = 'key'; return; }

            apiStatus.loading = true;
            // 规范化 URL
            let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

            try {
                // 1. 获取模型列表
                const listRes = await fetch(`${baseUrl}/v1/models`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${props.apiConfig.key}` }
                });

                if (!listRes.ok) {
                   if (listRes.status === 401) throw new Error('获取列表失败：密钥无效 (401)');
                   throw new Error(`获取列表失败 (状态码: ${listRes.status})`);
                }
                const listData = await listRes.json();
                
                // 严格检查返回数据结构
                if (!listData.data || !Array.isArray(listData.data)) throw new Error('模型列表格式异常');
                
                const candidates = listData.data.map(m => m.id).sort();
                if (candidates.length === 0) throw new Error('未找到可用模型');

                // 2. 选择一个非 Embedding/Dall-E 模型进行测试
                let testModel = candidates.find(m => {
                    const low = m.toLowerCase();
                    return !low.includes('embedding') && !low.includes('dall-e') && !low.includes('whisper');
                }) || candidates[0];

                // 3. 发送真实对话请求验证 (Verify)
                const verifyRes = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${props.apiConfig.key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: testModel, messages: [{role: "user", content: "hi"}], max_tokens: 1 })
                });

                if (!verifyRes.ok) {
                    if (verifyRes.status === 401) throw new Error('密钥错误或无效 (401)');
                    if (verifyRes.status === 429) throw new Error('密钥有效但无额度 (429)');
                    throw new Error(`验证未通过 (状态码: ${verifyRes.status})`);
                }
                
                const verifyData = await verifyRes.json();
                // 严格检查业务错误
                if (verifyData.error) throw new Error(`验证失败: ${verifyData.error.message || '服务器返回错误'}`);
                if (!verifyData.choices || verifyData.choices.length === 0) throw new Error('验证失败: 响应内容不符合预期');

                // 4. 验证全部通过
                emit('update:modelList', candidates);
                apiStatus.msg = '✅ 验证通过，密钥有效';
                apiStatus.type = 'success';
                
                if (!props.apiConfig.model || !candidates.includes(props.apiConfig.model)) {
                    props.apiConfig.model = testModel; 
                }

            } catch (e) {
                // 5. 错误处理
                apiStatus.msg = `❌ ${e.message}`;
                apiStatus.type = 'error';
                if (e.message.includes('密钥') || e.message.includes('401') || e.message.includes('429')) {
                    apiStatus.errorType = 'key';
                } else if (e.message.includes('地址') || e.message.includes('fetch')) {
                    apiStatus.errorType = 'url';
                }
                emit('update:modelList', []);
                props.apiConfig.model = '';
            } finally {
                apiStatus.loading = false;
            }
        };

        // 初始化溫度值（如果未設置則預設為 1）
        if (props.apiConfig.temperature === undefined) {
            props.apiConfig.temperature = 1;
        }

        return { apiStatus, saveCurrentApi, loadSavedApi, deleteSavedApi, fetchModels, storageInfo, updateStorage, compactStorage };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header" style="height: 60px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-bottom: none;">
            <div class="app-header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">系统设置</div>
            <div class="app-header-close" @click="$emit('close')">完成</div>
        </div>
        <div class="app-content">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">API 连接</div>
            
            <div class="api-card">
                <div class="saved-api-container" v-if="savedApis.length > 0">
                    <div class="saved-api-chip" v-for="(api, index) in savedApis" :key="index" @click="loadSavedApi(index)">
                        <span>{{ api.name }}</span>
                        <span class="delete-btn" @click.stop="deleteSavedApi(index)">×</span>
                    </div>
                </div>

                <div class="input-row">
                    <span class="input-label">接口地址 (Base URL)</span>
                    <input type="text" class="settings-input" :class="{ error: apiStatus.errorType === 'url' }" v-model="apiConfig.endpoint" placeholder="例如: https://api.openai.com">
                </div>
                <div class="input-row">
                    <span class="input-label">API 密钥 (Key)</span>
                    <input type="password" class="settings-input" :class="{ error: apiStatus.errorType === 'key' }" v-model="apiConfig.key" placeholder="sk-xxxxxxxx">
                </div>
                
                <div class="btn-group">
                    <button class="btn-base btn-save" @click="saveCurrentApi">💾 保存</button>
                    <button class="btn-base btn-verify" @click="fetchModels" :disabled="apiStatus.loading">
                        {{ apiStatus.loading ? '正在验证...' : '验证并获取' }}
                    </button>
                </div>

                <div class="status-msg" :class="apiStatus.type">{{ apiStatus.msg }}</div>
            </div>

            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">模型选择</div>
            <div class="settings-group">
                <div class="settings-item">
                    <span class="item-label">AI 模型</span>
                    <select v-model="apiConfig.model" style="border: none; background: transparent; font-size: 14px; color: var(--accent-color); outline: none; text-align: right; max-width: 150px;" :disabled="modelList.length === 0">
                        <option value="" disabled>请先获取模型</option>
                        <option v-for="m in modelList" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <span class="item-arrow" v-if="modelList.length === 0">🔒</span>
                </div>
                <!-- 新增溫度調整條 -->
                <div class="settings-item" style="margin-top: 16px;">
                    <span class="item-label">温度</span>
                    <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        v-model.number="apiConfig.temperature"
                        style="width: 150px; margin: 0 10px; accent-color: var(--accent-color);"
                    >
                    <span style="font-size: 13px; color: var(--accent-color); min-width: 32px; display: inline-block; text-align: right;">
                        {{ apiConfig.temperature.toFixed(1) }}
                    </span>
                </div>
            </div>

            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span>存储空间</span>
                <div style="margin-right: 15px;">
                    <span @click="compactStorage" style="color: #ff9500; cursor: pointer; margin-right: 10px; font-size: 12px;">🧹 压缩空间</span>
                    <span @click="updateStorage" style="color: var(--accent-color); cursor: pointer;">🔄 刷新</span>
                </div>
            </div>
            <div class="settings-group" style="padding: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                    <span>已用容量</span>
                    <span style="color: #888;">{{ storageInfo.usedStr }} / {{ storageInfo.quotaStr }}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                    <div :style="{ width: storageInfo.percent + '%', background: 'var(--accent-color)' }" style="height: 100%; transition: width 0.3s ease;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                    <span style="font-size: 12px; color: #aaa;">统计可能有延迟</span>
                    <span style="font-size: 12px; color: #aaa;">{{ storageInfo.percent.toFixed(1) }}% 已使用</span>
                </div>
            </div>
        </div>
    </div>
    `
};
