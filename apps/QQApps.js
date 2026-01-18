// apps/QQApps.js
import { ref, reactive, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        apiConfig: Object,
        qqData: Object
    },
    emits: ['close'],
    setup(props, { emit }) {
        const isQQSettingsOpen = ref(false);
        const tempQQSettings = reactive({});
        const chatContainer = ref(null);
        const fileInput = ref(null);
        const uploadTarget = ref('');

        const getCurrentChat = () => {
            return props.qqData.chatList.find(c => c.id === props.qqData.currentChatId) || {};
        };

        const handleQQCreate = () => {
            const name = prompt("请输入 AI 的本名：", "");
            if (!name) return;
            const remark = prompt("请输入备注名 (可选)：", name);
            const newChat = {
                id: Date.now(),
                name: name,
                remark: remark || name,
                avatar: '', userAvatar: '', gender: '未知',
                aiPersona: '', userPersona: '',
                messages: [], lastMsg: '', lastTime: '刚刚'
            };
            props.qqData.chatList.unshift(newChat);
        };

        const enterChat = (id) => {
            props.qqData.currentChatId = id;
            nextTick(() => scrollChatToBottom());
        };

        const scrollChatToBottom = () => {
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
        };

        const openQQSettings = () => {
            const chat = getCurrentChat();
            Object.assign(tempQQSettings, JSON.parse(JSON.stringify(chat)));
            isQQSettingsOpen.value = true;
        };

        const saveQQSettings = () => {
            const chatIndex = props.qqData.chatList.findIndex(c => c.id === props.qqData.currentChatId);
            if (chatIndex !== -1) {
                Object.assign(props.qqData.chatList[chatIndex], tempQQSettings);
            }
            isQQSettingsOpen.value = false;
        };

        const deleteCurrentChat = () => {
            if (confirm("确定要删除这个好友和所有聊天记录吗？")) {
                const index = props.qqData.chatList.findIndex(c => c.id === props.qqData.currentChatId);
                if (index !== -1) props.qqData.chatList.splice(index, 1);
                isQQSettingsOpen.value = false;
                props.qqData.currentChatId = null;
            }
        };

        const triggerAvatarUpload = (target) => {
            uploadTarget.value = target;
            fileInput.value.click();
        };

        const handleFileChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (ev) => {
                    const url = ev.target.result;
                    if(uploadTarget.value === 'ai') tempQQSettings.avatar = url;
                    else tempQQSettings.userAvatar = url;
                };
            }
            e.target.value = '';
        };

        const sendQQMessage = async () => {
            if (!props.qqData.inputMsg.trim() || props.qqData.isSending) return;
            if (!props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ 请先去【设置】App 配置 API 连接！");
                return;
            }

            const chat = props.qqData.chatList.find(c => c.id === props.qqData.currentChatId);
            const userContent = props.qqData.inputMsg;
            props.qqData.inputMsg = '';

            // 添加用户消息
            chat.messages.push({ role: 'user', content: userContent });
            chat.lastMsg = userContent;
            chat.lastTime = new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0');
            nextTick(() => scrollChatToBottom());

            props.qqData.isSending = true;
            try {
                let systemPrompt = `你扮演：${chat.name}。${chat.gender !== '未知' ? '性别：'+chat.gender+'。' : ''}`;
                if (chat.remark && chat.remark !== chat.name) systemPrompt += `用户对你的备注是：${chat.remark}。`;
                if (chat.aiPersona) systemPrompt += `\n你的详细人设：${chat.aiPersona}`;
                if (chat.userPersona) systemPrompt += `\n对话用户（我）的设定：${chat.userPersona}`;
                systemPrompt += `\n请沉浸在角色中回复，不要输出任何“作为AI”的废话，直接回复内容。`;

                const contextMessages = [
                    { role: "system", content: systemPrompt },
                    ...chat.messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
                ];

                let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
                if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

                const res = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${props.apiConfig.key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: props.apiConfig.model || 'gpt-3.5-turbo',
                        messages: contextMessages,
                        max_tokens: 500
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const data = await res.json();
                const aiContent = data.choices[0].message.content;

                chat.messages.push({ role: 'assistant', content: aiContent });
                chat.lastMsg = aiContent;
                nextTick(() => scrollChatToBottom());

            } catch (e) {
                alert("发送失败: " + e.message);
                chat.messages.push({ role: 'system', content: `[系统错误] ${e.message}` });
            } finally {
                props.qqData.isSending = false;
            }
        };

        return {
            isQQSettingsOpen, tempQQSettings, chatContainer, fileInput,
            getCurrentChat, handleQQCreate, enterChat, openQQSettings,
            saveQQSettings, deleteCurrentChat, triggerAvatarUpload,
            handleFileChange, sendQQMessage
        };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div v-if="!qqData.currentChatId" style="display:flex; flex-direction:column; height:100%;">
            <div class="app-header">
                <div class="app-header-title">消息</div>
                <div class="app-header-close" @click="handleQQCreate" style="font-size: 24px; font-weight: 300; right: 15px;">+</div>
                <div class="app-header-left" @click="$emit('close')" style="left: 15px; font-weight: 400;">关闭</div>
            </div>
            <div class="app-content" style="padding: 0;">
                <div class="qq-list">
                    <div class="qq-list-item" v-for="chat in qqData.chatList" :key="chat.id" @click="enterChat(chat.id)">
                        <div class="qq-avatar" :style="chat.avatar ? { backgroundImage: 'url(' + chat.avatar + ')' } : {}"></div>
                        <div class="qq-info">
                            <div class="qq-name-row">
                                <span class="qq-name">{{ chat.remark || chat.name }}</span>
                                <span class="qq-time" v-if="chat.lastTime">{{ chat.lastTime }}</span>
                            </div>
                            <div class="qq-last-msg">{{ chat.lastMsg || '暂无消息' }}</div>
                        </div>
                    </div>
                    <div v-if="qqData.chatList.length === 0" style="text-align: center; color: #999; margin-top: 50px; font-size: 14px;">
                        点击右上角 + 号创建角色
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="chat-container" style="height:100%;">
            <div class="app-header">
                <div class="app-header-left" @click="qqData.currentChatId = null">
                    <span style="font-size: 20px;">‹</span> <span style="font-size: 16px;">消息</span>
                </div>
                <div class="app-header-title">{{ getCurrentChat().remark || getCurrentChat().name }}</div>
                <div class="app-header-close" @click="openQQSettings" style="font-size: 20px;">⚙️</div>
            </div>
            <div class="chat-scroll-area" ref="chatContainer">
                <div v-for="(msg, index) in getCurrentChat().messages" :key="index" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'">
                    <div class="chat-avatar-small" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')' }"></div>
                    <div class="chat-bubble">{{ msg.content }}</div>
                </div>
            </div>
            <div class="chat-input-bar">
                <input type="text" class="chat-input" v-model="qqData.inputMsg" @keypress.enter="sendQQMessage" placeholder="发消息..." :disabled="qqData.isSending">
                <button class="chat-send-btn" @click="sendQQMessage" :disabled="!qqData.inputMsg.trim() || qqData.isSending">发送</button>
            </div>
        </div>

        <div class="modal-overlay" v-if="isQQSettingsOpen" @click.self="isQQSettingsOpen = false">
            <div class="modal-content" style="max-height: 85vh;">
                <div class="modal-title">聊天设置</div>
                <div style="display:flex; justify-content: space-around; width: 100%; margin-bottom: 10px;">
                    <div style="display:flex; flex-direction:column; align-items:center;" @click="triggerAvatarUpload('ai')">
                        <div class="qq-setting-avatar" :style="{ backgroundImage: 'url(' + tempQQSettings.avatar + ')' }"></div>
                        <span style="font-size:12px; color:#666;">对方头像</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;" @click="triggerAvatarUpload('user')">
                        <div class="qq-setting-avatar" :style="{ backgroundImage: 'url(' + tempQQSettings.userAvatar + ')' }"></div>
                        <span style="font-size:12px; color:#666;">我的头像</span>
                    </div>
                </div>
                <div class="input-row"><span class="input-label">本名</span><input type="text" class="modal-input" v-model="tempQQSettings.name"></div>
                <div class="input-row"><span class="input-label">备注名</span><input type="text" class="modal-input" v-model="tempQQSettings.remark"></div>
                <div class="input-row"><span class="input-label">性别</span><input type="text" class="modal-input" v-model="tempQQSettings.gender"></div>
                <div class="input-row"><span class="input-label">对方设定 (Prompt)</span><textarea class="qq-textarea" v-model="tempQQSettings.aiPersona"></textarea></div>
                <div class="input-row"><span class="input-label">我的设定 (User Info)</span><textarea class="qq-textarea" v-model="tempQQSettings.userPersona"></textarea></div>

                <div style="display:flex; gap:10px; margin-top: 5px;">
                    <button class="modal-btn" style="color: #ff3b30; flex:1;" @click="deleteCurrentChat">删除好友</button>
                    <button class="modal-btn" style="color: #34c759; flex:2;" @click="saveQQSettings">保存修改</button>
                </div>
                <button class="modal-btn cancel" @click="isQQSettingsOpen = false">取消</button>
            </div>
        </div>
        <input type="file" ref="fileInput" hidden accept="image/*" @change="handleFileChange">
    </div>
    `
};
