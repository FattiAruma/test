// apps/SettingsApp.js
import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

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

        const fetchModels = async () => {
            emit('update:modelList', []); // clear list
            props.apiConfig.model = '';
            apiStatus.msg = ''; apiStatus.type = ''; apiStatus.errorType = '';
            
            if (!props.apiConfig.endpoint) { apiStatus.msg = '请填写接口地址'; apiStatus.type = 'error'; apiStatus.errorType = 'url'; return; }
            if (!props.apiConfig.key) { apiStatus.msg = '请填写 API 密钥'; apiStatus.type = 'error'; apiStatus.errorType = 'key'; return; }

            apiStatus.loading = true;
            let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

            try {
                const listRes = await fetch(`${baseUrl}/v1/models`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${props.apiConfig.key}` }
                });

                if (!listRes.ok) throw new Error(`获取列表失败 (状态码: ${listRes.status})`);
                const listData = await listRes.json();
                
                const candidates = listData.data.map(m => m.id).sort();
                if (candidates.length === 0) throw new Error('未找到可用模型');

                // 简单的验证逻辑
                let testModel = candidates.find(m => {
                    const low = m.toLowerCase();
                    return !low.includes('embedding') && !low.includes('dall-e') && !low.includes('whisper');
                }) || candidates[0];

                const verifyRes = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${props.apiConfig.key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: testModel, messages: [{role: "user", content: "hi"}], max_tokens: 1 })
                });

                if (!verifyRes.ok) throw new Error(`验证未通过 (状态码: ${verifyRes.status})`);
                
                emit('update:modelList', candidates);
                apiStatus.msg = '✅ 验证通过，密钥有效';
                apiStatus.type = 'success';
                props.apiConfig.model = testModel;

            } catch (e) {
                apiStatus.msg = `❌ ${e.message}`;
                apiStatus.type = 'error';
                if (e.message.includes('密钥') || e.message.includes('401')) apiStatus.errorType = 'key';
                else apiStatus.errorType = 'url';
            } finally {
                apiStatus.loading = false;
            }
        };

        return { apiStatus, saveCurrentApi, loadSavedApi, deleteSavedApi, fetchModels };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header">
            <div class="app-header-title">系统设置</div>
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
                    <select v-model="apiConfig.model" style="border: none; background: transparent; font-size: 14px; color: #007aff; outline: none; text-align: right; max-width: 150px;" :disabled="modelList.length === 0">
                        <option value="" disabled>请先获取模型</option>
                        <option v-for="m in modelList" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <span class="item-arrow" v-if="modelList.length === 0">🔒</span>
                </div>
            </div>
        </div>
    </div>
    `
};
