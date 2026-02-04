// apps/CheckphoneApp.js
import { ref, reactive, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        qqData: Object,
        apiConfig: Object, // 接收 apiConfig
    },
    emits: ['close'],
    setup(props, { emit }) {
        const selectedCharacter = ref(null);
        const currentApp = ref(null); // 当前打开的内部 app
        const isGenerating = ref(false); // 是否正在生成内容
        const qqContent = ref(null); // 存储生成的 QQ 内容
        const activeQQChat = ref(null); // 当前查看的 QQ 聊天

        const apps = reactive([
            { name: 'QQ', icon: '🐧' },
            { name: '相册', icon: '🖼️' },
            { name: '备忘录', icon: '📝' },
            { name: '钱包', icon: '💰' },
            { name: '电话', icon: '📞' },
            { name: '浏览器', icon: '🌐' },
            { name: '位置', icon: '📍' },
            { name: '日记', icon: '📔' },
        ]);

        const selectCharacter = (character) => {
            selectedCharacter.value = character;
        };

        const goBackToSelection = () => {
            selectedCharacter.value = null;
            // 重置内部状态
            currentApp.value = null;
            qqContent.value = null;
            activeQQChat.value = null;
        };
        
        const closeApp = () => {
            goBackToSelection(); // 调用它来重置所有状态
            emit('close');
        };

        const openApp = (appName) => {
            if (appName === 'QQ') {
                currentApp.value = 'QQ';
            } else {
                alert('该应用功能待开发');
            }
        };

        const goBackToHome = () => {
            currentApp.value = null;
            activeQQChat.value = null;
        };

        const viewQQChat = (chat) => {
            activeQQChat.value = chat;
        };

        const generateQQContent = async () => {
            if (isGenerating.value) return;
            if (!props.apiConfig || !props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ API 配置无效，请先在主界面的【设置】中配置。");
                return;
            }
            if (!confirm("确定要调用一次 API 生成内容吗？")) return;

            isGenerating.value = true;
            qqContent.value = null; // 清空旧内容

            try {
                const char = selectedCharacter.value;
                const userChatHistory = char.messages
                    .filter(m => m.role === 'user' || m.role === 'assistant')
                    .slice(-8)
                    .map(m => `${m.role === 'user' ? '我' : char.name}: ${m.content}`)
                    .join('\n');

                const npcListStr = (char.npcList && char.npcList.length > 0)
                    ? char.npcList.map(npc => `- ${npc.name} (关系: ${npc.relation}): ${npc.setting}`).join('\n')
                    : '无';

                const systemPrompt = `
你将扮演角色【${char.name}】并模拟其手机QQ的聊天内容。
你需要基于以下信息，虚构出符合角色性格和关系的聊天记录。

【角色信息】
- 你的名字: ${char.name}
- 你的人设: ${char.aiPersona || '未提供'}
- 玩家（我）的人设: ${char.userPersona || '未提供'}

【已知NPC列表】
${npcListStr}

【你和玩家的最近聊天记录 (参考)】
${userChatHistory || '暂无'}

【任务】
请生成一个包含 3 到 5 个聊天会话的列表。其中必须包含一个与“我”（玩家）的会话，以及几个与NPC的会话。
每个与NPC的会话需要虚构 8 条符合人设和关系的聊天记录。

【输出格式】
请严格返回一个 JSON 数组，不要包含任何其他说明文字。格式如下:
[
  {
    "name": "对方的备注名",
    "avatar": "对方的头像URL（可选）",
    "isUser": true,
    "messages": [
      { "role": "them", "content": "这是玩家发的最后一条消息摘要..." }
    ]
  },
  {
    "name": "NPC的名字",
    "avatar": "NPC的头像URL（可选）",
    "isUser": false,
    "messages": [
      { "role": "them", "content": "NPC说的话..." },
      { "role": "me", "content": "你说的话..." },
      { "role": "them", "content": "..." },
      { "role": "me", "content": "..." },
      { "role": "them", "content": "..." },
      { "role": "me", "content": "..." },
      { "role": "them", "content": "..." },
      { "role": "me", "content": "..." }
    ]
  }
]
`;
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
                        messages: [{ role: "system", content: systemPrompt }],
                        temperature: 0.8,
                        response_format: { type: "json_object" } // 请求 JSON 输出
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
                
                const data = await res.json();
                let content = data.choices[0].message.content;
                
                // 尝试解析 JSON
                // 有时候模型返回的 JSON 会被包裹在 ```json ... ``` 中
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    content = jsonMatch[1];
                }
                
                // 有时候模型会直接返回一个带键的 JSON 对象，而不是数组
                const parsedContent = JSON.parse(content);
                if (Array.isArray(parsedContent)) {
                    qqContent.value = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    // 尝试从常见的键中提取数组
                    const key = Object.keys(parsedContent).find(k => Array.isArray(parsedContent[k]));
                    if (key) {
                        qqContent.value = parsedContent[key];
                    } else {
                        throw new Error("API返回了非数组的JSON，且无法找到数组键。");
                    }
                } else {
                     throw new Error("API返回的JSON格式不正确。");
                }

            } catch (e) {
                console.error("生成QQ内容失败:", e);
                alert("生成失败: " + e.message);
            } finally {
                isGenerating.value = false;
            }
        };

        return {
            selectedCharacter,
            apps,
            selectCharacter,
            goBackToSelection,
            closeApp,
            currentApp,
            openApp,
            goBackToHome,
            isGenerating,
            qqContent,
            activeQQChat,
            viewQQChat,
            generateQQContent,
        };
    },
    template: `
    <div v-if="isOpen">
        <!-- Phone Screen (now the background) -->
        <div v-if="selectedCharacter" class="checkphone-phone-screen" @click.self="goBackToSelection">
            <div class="iphone-frame">
                <div class="iphone-screen">
                    <div class="iphone-content" :style="{ paddingTop: currentApp ? '0' : '50px', paddingLeft: currentApp ? '0' : '20px', paddingRight: currentApp ? '0' : '20px', paddingBottom: currentApp ? '0' : '20px', display: 'flex', flexDirection: 'column', height: '100%' }">
                        
                        <!-- App Home Screen -->
                        <div v-if="!currentApp" style="flex: 1;">
                            <!-- Top Widget -->
                            <div class="glass-box phone-widget">
                                <div class="qq-avatar widget-avatar" :style="{ backgroundImage: 'url(' + selectedCharacter.avatar + ')' }"></div>
                                <div class="widget-name">{{ selectedCharacter.name }}</div>
                            </div>

                            <!-- App Grid -->
                            <div class="phone-app-grid">
                                <div v-for="app in apps" :key="app.name" class="phone-app-item" @click="openApp(app.name)">
                                    <div class="phone-app-icon">{{ app.icon }}</div>
                                    <span class="phone-app-name">{{ app.name }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- QQ App Screen -->
                        <div v-else-if="currentApp === 'QQ'" class="checkphone-inner-app">
                            <!-- QQ Chat List View -->
                            <div v-if="!activeQQChat" class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">‹ 主屏幕</button>
                                    <span class="checkphone-header-title">QQ</span>
                                    <button @click="generateQQContent" class="checkphone-header-btn" :disabled="isGenerating">
                                        <svg v-if="!isGenerating" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                        <div v-else class="loader"></div>
                                    </button>
                                </div>
                                <div class="checkphone-app-content">
                                    <div v-if="!qqContent && !isGenerating" class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的QQ聊天记录</p>
                                    </div>
                                    <div v-if="isGenerating" class="loading-state">
                                        <div class="loader"></div>
                                        <p>正在生成内容...</p>
                                    </div>
                                    <div v-if="qqContent" class="qq-chat-list">
                                        <div v-for="chat in qqContent" :key="chat.name" class="qq-list-item" @click="viewQQChat(chat)">
                                            <div class="qq-avatar" :style="chat.avatar ? { backgroundImage: 'url(' + chat.avatar + ')' } : {}"></div>
                                            <div class="qq-info">
                                                <div class="qq-name-row">
                                                    <span class="qq-name">{{ chat.name }}</span>
                                                </div>
                                                <div class="qq-last-msg">{{ chat.messages[chat.messages.length - 1].content }}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- QQ Chat Detail View -->
                            <div v-else class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="activeQQChat = null" class="checkphone-header-btn">‹ 返回</button>
                                    <span class="checkphone-header-title">{{ activeQQChat.name }}</span>
                                    <div style="width: 60px;"></div>
                                </div>
                                <div class="checkphone-app-content chat-detail-view">
                                    <div v-for="(msg, index) in activeQQChat.messages" :key="index" class="chat-message-row" :class="msg.role === 'me' ? 'sent' : 'received'">
                                        <div class="chat-bubble">{{ msg.content }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <div class="iphone-home-indicator" @click="goBackToHome"></div>
                </div>
            </div>
             <!-- Back button is now part of this screen -->
            <button @click="goBackToSelection" class="checkphone-back-btn">返回选择</button>
            <button @click="closeApp" class="checkphone-close-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <!-- Character Selection Modal -->
        <div v-if="!selectedCharacter" class="modal-overlay center-popup" @click.self="closeApp">
            <div class="modal-content otomegame-modal" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; height: 60vh; max-width: 400px;">
                <div class="game-header" style="margin-top: 0; background: transparent; border-bottom: 1px solid #eee;">
                    <div class="game-title">你想查谁的手机？</div>
                </div>
                
                <div class="contact-list" style="background: white; overflow-y: auto; flex: 1;">
                    <div v-if="!qqData.chatList || qqData.chatList.length === 0" style="text-align: center; padding: 40px; color: #999;">
                        <div>没有可选择的角色</div>
                    </div>
                    <div v-for="chat in qqData.chatList" :key="chat.id" class="contact-item" @click="selectCharacter(chat)">
                        <div class="qq-avatar" :style="{ backgroundImage: 'url(' + chat.avatar + ')' }"></div>
                        <div class="contact-info">
                            <div class="contact-name">{{ chat.remark || chat.name }}</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </div>
                </div>
                <div style="padding: 15px; border-top: 1px solid #f0f0f0;">
                    <button class="modal-btn cancel" @click="closeApp" style="width: 100%; margin: 0 auto; display: block; padding: 10px;">取消</button>
                </div>
            </div>
        </div>
    </div>
    `
};
