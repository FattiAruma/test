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

        // 简化验证逻辑：仅通过获取模型列表来验证
        const fetchModels = async () => {
            emit('update:modelList', []);
            props.apiConfig.model = '';
            apiStatus.msg = ''; apiStatus.type = ''; apiStatus.errorType = '';

            if (!props.apiConfig.endpoint) {
                apiStatus.msg = '请填写接口地址';
                apiStatus.type = 'error';
                apiStatus.errorType = 'url';
                return;
            }
            if (!props.apiConfig.key) {
                apiStatus.msg = '请填写 API 密钥';
                apiStatus.type = 'error';
                apiStatus.errorType = 'key';
                return;
            }

            apiStatus.loading = true;
            let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) {
                baseUrl = baseUrl.slice(0, -3);
            }

            try {
                // 1. 仅通过获取模型列表来验证端点和密钥
                const listRes = await fetch(`${baseUrl}/v1/models`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${props.apiConfig.key}` }
                });

                if (!listRes.ok) {
                    if (listRes.status === 401) throw new Error('密钥无效或不匹配 (401)');
                    throw new Error(`端点或网络错误 (状态码: ${listRes.status})`);
                }

                const listData = await listRes.json();
                if (!listData.data || !Array.isArray(listData.data)) {
                    throw new Error('模型列表格式异常');
                }

                const candidates = listData.data.map(m => m.id).sort();
                if (candidates.length === 0) {
                    throw new Error('未找到可用模型');
                }

                // 2. 验证成功，更新UI
                emit('update:modelList', candidates);
                apiStatus.msg = '✅ 验证成功，端点和密钥有效';
                apiStatus.type = 'success';

                // 3. 自动选择一个合适的模型
                let preferredModel = candidates.find(m => {
                    const low = m.toLowerCase();
                    return !low.includes('embedding') && !low.includes('dall-e') && !low.includes('whisper');
                }) || candidates[0];

                if (!props.apiConfig.model || !candidates.includes(props.apiConfig.model)) {
                    props.apiConfig.model = preferredModel;
                }

            } catch (e) {
                // 4. 错误处理
                apiStatus.msg = `❌ ${e.message}`;
                apiStatus.type = 'error';
                if (e.message.includes('密钥') || e.message.includes('401')) {
                    apiStatus.errorType = 'key';
                } else {
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

        return { apiStatus, saveCurrentApi, loadSavedApi, deleteSavedApi, fetchModels };
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

        </div>
    </div>
    `
};
