// apps/QQApps.js
import { ref, reactive, nextTick, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        apiConfig: Object,
        qqData: Object,
        presetFrames: Array,
        customFrames: Array
    },
    emits: ['close', 'frame-action'],
    setup(props, { emit }) {
        // --- 现有状态 ---
        const isQQSettingsOpen = ref(false);
        const isSummaryEditOpen = ref(false); 
        const activeTab = ref('msg'); 
        const tempQQSettings = reactive({});
        const chatContainer = ref(null);
        const fileInput = ref(null); 
        const imgMsgInput = ref(null); 
        const uploadTarget = ref('');
        const isSummarizing = ref(false);
        const chatInputRef = ref(null);

        const contextMenu = reactive({ visible: false, x: 0, y: 0, msgIndex: -1 });
        const isMultiSelectMode = ref(false);
        const selectedMsgIndices = ref(new Set());
        const isForwardModalOpen = ref(false);
        
        const isLocationModalOpen = ref(false); 
        const locationForm = reactive({ start: '当前位置', via: '', end: '' });

        const isRedPacketModalOpen = ref(false);
        const redPacketForm = reactive({ type: 'redpacket', text: '', amount: '' });

        // 新增：链接功能状态
        const isLinkModalOpen = ref(false);
        const linkForm = reactive({ title: '', source: '', content: '' });
        const linkViewer = reactive({ visible: false, data: {} });

        const forwardViewer = reactive({ visible: false, title: '', list: [] });
        const textViewer = reactive({ visible: false, content: '' });
        
        // --- 新增：表情包相关状态 ---
        const isStickerSettingsOpen = ref(false); // AI 表情设置弹窗
        const stickerSettingsTab = ref('exclusive'); // 'exclusive' | 'general'
        const tempStickerInput = ref(''); // 批量上传输入框

        // ✅ 補上遺漏的使用者表情包狀態
        const isUserStickerPickerOpen = ref(false);
        const isUserStickerManageMode = ref(false);
        const userStickerInput = ref('');
        
        // 新增：心聲功能狀態
        const isHeartModalOpen = ref(false);
        const isHeartHistoryOpen = ref(false);
        // 顯示哪一條歷史心聲（0 為最新）
        const currentHeartIndex = ref(0);

        // 新增：世界书列表状态
        const isWorldbookDropdownOpen = ref(false);
        const availableWorldbooks = ref([]);

        // 新增：头像框选择状态
        const isFrameModalOpen = ref(false);
        const frameTarget = ref(''); // 'ai' or 'user'

        // 新增：NPC库相关状态
        const isNpcManagerOpen = ref(false);
        const isNpcEditOpen = ref(false); // 保留变量定义以防报错，但不再使用
        const npcManagerTab = ref('list'); // 'list' | 'add'
        const tempNpcData = reactive({ name: '', setting: '', relation: '' });
        const editingNpcIndex = ref(-1);

        // 新增：说说（动态）功能状态
        const isPublishMomentOpen = ref(false);
        const momentForm = reactive({
            content: '',
            images: [],
            mentions: [],
            location: ''
        });
        const isAtUserModalOpen = ref(false);
        const momentImageInput = ref(null);

        // 新增：动态页面滚动透明度
        const momentsHeaderOpacity = ref(0);

        // 新增：说说菜单
        const activeMomentMenu = ref(null);

        const loadWorldbooks = async () => {
            try {
                const saved = await localforage.getItem('worldbooks');
                if (saved) {
                    availableWorldbooks.value = JSON.parse(saved);
                } else {
                    availableWorldbooks.value = [];
                }
            } catch (e) {
                availableWorldbooks.value = [];
            }
        };

        let longPressTimer = null;

        // 初始化全局数据结构 (如果不存在)
        onMounted(() => {
            if (!props.qqData.aiGeneralStickers) props.qqData.aiGeneralStickers = [];
            if (!props.qqData.userStickers) props.qqData.userStickers = [];
            // 新增：动态页面背景和头像
            if (props.qqData.momentsBackground === undefined) props.qqData.momentsBackground = '';
            if (props.qqData.selfAvatar === undefined) props.qqData.selfAvatar = '';
            // 新增：动态页面名字和访客
            if (props.qqData.selfName === undefined) props.qqData.selfName = '我';
            if (props.qqData.visitorCount === undefined) props.qqData.visitorCount = 0;
            // 新增：初始化说说列表
            if (props.qqData.momentsList === undefined) props.qqData.momentsList = [];
            // 新增：确保每个说说都有点赞和评论字段
            if (Array.isArray(props.qqData.momentsList)) {
                props.qqData.momentsList.forEach(m => {
                    if (m.likes === undefined) m.likes = [];
                    if (m.comments === undefined) m.comments = [];
                    if (m.tempComment === undefined) m.tempComment = '';
                });
            }

            // ✅ 新增：確保每個 chat 有 heartThoughts 陣列
            if (Array.isArray(props.qqData.chatList)) {
                props.qqData.chatList.forEach(c => {
                    if (c.heartThoughts === undefined) c.heartThoughts = [];
                    // 新增：確保每個 chat 有现实时间感知欄位
                    if (c.timeAware === undefined) c.timeAware = false;
                    if (c.timeOverride === undefined) c.timeOverride = '';
                    // 新增：在线状态
                    if (c.status === undefined) c.status = 'online';
                    // 新增：聊天室背景
                    if (c.backgroundUrl === undefined) c.backgroundUrl = '';
                });
            }
        });

        const getCurrentChat = () => {
            return props.qqData.chatList.find(c => c.id === props.qqData.currentChatId) || {};
        };

        const showSummaryAlert = computed(() => {
            const chat = getCurrentChat();
            if (!chat || !chat.enableSummary || chat.summaryMode === 'auto') return false;
            return (chat.msgCountSinceSummary || 0) >= (chat.summaryTriggerCount || 20);
        });

        const canReroll = computed(() => {
            const chat = getCurrentChat();
            if (!chat || !chat.messages || chat.messages.length === 0 || props.qqData.isSending) return false;
            const lastMsg = chat.messages[chat.messages.length - 1];
            return lastMsg.role === 'assistant' && !lastMsg.isRetracted; 
        });

        const adjustInputHeight = () => {
    const el = chatInputRef.value;
    if (el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight > 100 ? 100 : el.scrollHeight) + 'px';
    }
};

       const handleQQCreate = () => {
    const name = prompt("请输入 AI 的本名：", "");
    if (!name) return;
    const remark = prompt("请输入备注名 (可选)：", name);
    const newChat = {
        id: Date.now(),
        name: name,
        remark: remark || name,
        avatar: '', 
        userAvatar: '', 
        gender: '未知',
        aiPersona: '', 
        userPersona: '',
        messages: [], 
        lastMsg: '', 
        lastTime: '刚刚',
        contextLimit: 10,
        enableSummary: false,
        summaryMode: 'auto', 
        summaryTriggerCount: 20,
        summaryPrompt: '请用第三视角总结以下对话的事件和信息，保留重要事实。',
        memoryList: [], 
        msgCountSinceSummary: 0,
        aiExclusiveStickers: [],
        heartThoughts: [], // ✅ 新增：心聲歷史陣列
        status: 'online', // ✅ 新增：在线状态
        selectedWorldbooks: [], // 新增：选中的世界书
        // 新增：现实时间感知欄位預設
        timeAware: false,
        timeOverride: '',
        // 新增：聊天室背景
        backgroundUrl: '',
        // 新增：头像框
        aiAvatarFrame: '',
        userAvatarFrame: '',
        npcList: [] // 新增：NPC库
    };
    props.qqData.chatList.unshift(newChat);
};

        const enterChat = (id) => {
            props.qqData.currentChatId = id;
            exitMultiSelectMode();
            nextTick(() => scrollChatToBottom());
        };

        const scrollChatToBottom = () => {
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
        };

        const openQQSettings = () => {
            const chat = getCurrentChat();
            // 初始化字段
            if(chat.contextLimit === undefined) chat.contextLimit = 10;
            if(chat.enableSummary === undefined) chat.enableSummary = false;
            if(chat.summaryMode === undefined) chat.summaryMode = 'auto';
            if(chat.summaryTriggerCount === undefined) chat.summaryTriggerCount = 20;
            if(chat.summaryPrompt === undefined) chat.summaryPrompt = '请用第三视角总结以下对话的事件和信息，保留重要事实。';
            if(chat.memoryList === undefined) chat.memoryList = [];
            if(chat.aiExclusiveStickers === undefined) chat.aiExclusiveStickers = [];
            if(chat.heartThoughts === undefined) chat.heartThoughts = []; // ✅ 初始化心聲欄位
            if(chat.status === undefined) chat.status = 'online'; // ✅ 初始化在线状态
            if(chat.selectedWorldbooks === undefined) chat.selectedWorldbooks = []; // 初始化世界书选择
            loadWorldbooks(); // 加载世界书列表
            // 初始化现实时间感知欄位
            if (chat.timeAware === undefined) chat.timeAware = false;
            if (chat.timeOverride === undefined) chat.timeOverride = '';
            // 新增：初始化聊天室背景
            if (chat.backgroundUrl === undefined) chat.backgroundUrl = '';
            // 新增：初始化头像框
            if (chat.aiAvatarFrame === undefined) chat.aiAvatarFrame = '';
            if (chat.userAvatarFrame === undefined) chat.userAvatarFrame = '';
            // 新增：初始化NPC库
            if (chat.npcList === undefined) chat.npcList = [];

            if(chat.currentSummary && typeof chat.currentSummary === 'string') {
                chat.memoryList.push({ id: Date.now(), content: chat.currentSummary });
                delete chat.currentSummary;
            }

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
                    else if(uploadTarget.value === 'user') tempQQSettings.userAvatar = url;
                    else if(uploadTarget.value === 'momentsBg') props.qqData.momentsBackground = url;
                    else if(uploadTarget.value === 'selfAvatar') props.qqData.selfAvatar = url;
                };
            }
            e.target.value = '';
        };

        const triggerMomentsBgUpload = () => {
            const link = prompt("请输入背景图片链接 (留空则上传本地图片):");
            if (link) {
                props.qqData.momentsBackground = link;
            } else if (link === '') {
                uploadTarget.value = 'momentsBg';
                fileInput.value.click();
            }
        };

        const triggerSelfAvatarUpload = () => {
            uploadTarget.value = 'selfAvatar';
            fileInput.value.click();
        };

        const editSelfName = () => {
            const name = prompt("请输入名字", props.qqData.selfName || '我');
            if (name !== null) props.qqData.selfName = name;
        };

        const editVisitorCount = () => {
            const count = prompt("请输入访客数量", props.qqData.visitorCount || 0);
            if (count !== null) props.qqData.visitorCount = count;
        };

        const pushMessage = (chat, role, type, content, extra = {}) => {
            const now = new Date();
            const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
            
            // 计算是否显示时间气泡 (MMDD HH:MM)
            let showTime = false;
            let timeDisplay = '';
            const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
            
            if (!lastMsg) {
                showTime = true;
            } else {
                const lastTime = lastMsg.timestamp ? new Date(lastMsg.timestamp) : null;
                if (lastTime) {
                    // 如果跨天了 (日期不同)
                    if (lastTime.getDate() !== now.getDate() || lastTime.getMonth() !== now.getMonth() || lastTime.getFullYear() !== now.getFullYear()) {
                        showTime = true;
                    }
                } else {
                    // 旧消息没有时间戳，默认显示以防万一
                    showTime = true;
                }
            }

            if (showTime) {
                const M = (now.getMonth() + 1).toString().padStart(2, '0');
                const D = now.getDate().toString().padStart(2, '0');
                const H = now.getHours().toString().padStart(2, '0');
                const m = now.getMinutes().toString().padStart(2, '0');
                timeDisplay = `${M}月${D}日 ${H}:${m}`;
            }

            const msg = {
                role,
                type: type || 'text',
                content,
                time: timeStr,
                timestamp: now.getTime(),
                showTime,
                timeDisplay,
                ...extra
            };
            chat.messages.push(msg);
            
            let displayLastMsg = content;
            if(type === 'voice') displayLastMsg = '[语音]';
            else if(type === 'image') displayLastMsg = '[图片]';
            else if(type === 'sticker') displayLastMsg = '[表情包]';
            else if(type === 'redpacket') displayLastMsg = '[红包]';
            else if(type === 'transfer') displayLastMsg = '[转账]';
            else if(type === 'location') displayLastMsg = '[位置]';
            else if(type === 'link') displayLastMsg = '[链接]';

            chat.lastMsg = displayLastMsg;
            chat.lastTime = new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0');
            
            if(chat.msgCountSinceSummary === undefined) chat.msgCountSinceSummary = 0;
            chat.msgCountSinceSummary++;

            nextTick(() => scrollChatToBottom());
        };

        const sendUserMessage = (e) => {
            if (e && e.shiftKey) return;
            if (e) e.preventDefault();
            if (!props.qqData.inputMsg.trim()) return;
            
            const chat = props.qqData.chatList.find(c => c.id === props.qqData.currentChatId);
            const userContent = props.qqData.inputMsg;
            props.qqData.inputMsg = ''; 
            nextTick(adjustInputHeight);

            pushMessage(chat, 'user', 'text', userContent);
        };

        // --- 功能函数 ---
        const openRedPacketModal = (type) => {
            redPacketForm.type = type;
            redPacketForm.text = type === 'redpacket' ? '恭喜发财，大吉大利' : '转账给你';
            redPacketForm.amount = '';
            isRedPacketModalOpen.value = true;
        };

        const confirmRedPacket = () => {
            if (!redPacketForm.amount) { alert("请输入金额"); return; }
            const chat = getCurrentChat();
            if (redPacketForm.type === 'redpacket') {
                 const txt = redPacketForm.text || "恭喜发财，大吉大利";
                 pushMessage(chat, 'user', 'redpacket', `[红包] ${txt}`, { packetText: txt });
            } else {
                 pushMessage(chat, 'user', 'transfer', `[转账] ¥${redPacketForm.amount}`, { amount: redPacketForm.amount });
            }
            isRedPacketModalOpen.value = false;
        };

        const sendVoice = () => {
            const text = prompt("请输入语音转换的内容：", "");
            if(!text) return;
            const chat = getCurrentChat();
            const duration = Math.max(1, Math.ceil(text.length / 3));
            pushMessage(chat, 'user', 'voice', `[语音] ${text}`, { 
                voiceText: text, 
                duration: duration,
                isVoiceTextVisible: false 
            });
        };

        const triggerImageUpload = () => {
            imgMsgInput.value.click();
        };

        const sendTextImage = () => {
            const desc = prompt("请输入图片描述：", "");
            if(desc) {
                const chat = getCurrentChat();
                pushMessage(chat, 'user', 'image', `[图片] ${desc}`, { imgType: 'desc', description: desc });
            }
        };

        // 新增：图片压缩函数
        const compressImage = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (ev) => {
                    const img = new Image();
                    img.src = ev.target.result;
                    img.onload = () => {
                        // 压缩配置
                        const maxWidth = 800; // 限制最大宽度
                        const maxHeight = 800; // 限制最大高度
                        let width = img.width;
                        let height = img.height;

                        // 计算缩放比例
                        if (width > height) {
                            if (width > maxWidth) {
                                height = Math.round(height * (maxWidth / width));
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = Math.round(width * (maxHeight / height));
                                height = maxHeight;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // 导出压缩后的 JPEG，质量 0.7
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        resolve(compressedDataUrl);
                    };
                    img.onerror = (err) => reject(err);
                };
                reader.onerror = (err) => reject(err);
            });
        };

        const handleImageMsgChange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    // 使用压缩函数处理图片
                    const compressedUrl = await compressImage(file);
                    const chat = getCurrentChat();
                    pushMessage(chat, 'user', 'image', `[图片] 发送了一张图片`, { imgType: 'local', src: compressedUrl });
                } catch (err) {
                    console.error("图片压缩失败", err);
                    alert("图片处理失败，请重试");
                }
            }
            e.target.value = '';
        };

        const openLocationModal = () => {
            isLocationModalOpen.value = true;
        };

        const sendLocation = () => {
            if(!locationForm.end) { alert("终点不能为空"); return; }
            const chat = getCurrentChat();
            const locText = `[位置] 从 ${locationForm.start} 出发，${locationForm.via ? '经过 '+locationForm.via+'，' : ''}到达 ${locationForm.end}`;
            pushMessage(chat, 'user', 'location', locText, { 
                locStart: locationForm.start || '当前位置',
                locVia: locationForm.via,
                locEnd: locationForm.end
            });
            isLocationModalOpen.value = false;
        };

        const openLinkModal = () => {
            linkForm.title = '';
            linkForm.source = '';
            linkForm.content = '';
            isLinkModalOpen.value = true;
        };

        const sendLink = () => {
            if (!linkForm.content.trim()) {
                alert("内容不能为空");
                return;
            }
            const chat = getCurrentChat();
            const linkTitle = linkForm.title.trim() || '分享链接';
            pushMessage(chat, 'user', 'link', `[链接] ${linkTitle}`, {
                linkData: {
                    title: linkTitle,
                    source: linkForm.source.trim(),
                    content: linkForm.content.trim()
                }
            });
            isLinkModalOpen.value = false;
        };

        const openLinkViewer = (msg) => {
            if (!msg.linkData) return;
            linkViewer.data = msg.linkData;
            linkViewer.visible = true;
        };

        const openTextViewer = (text) => {
            textViewer.content = text;
            textViewer.visible = true;
        };

        // --- 表情包管理逻辑 ---

        // AI 表情包批量添加
const addBatchStickers = () => {
    if(!tempStickerInput.value.trim()) return;
    const lines = tempStickerInput.value.split('\n');
    let count = 0;
    const targetArray = stickerSettingsTab.value === 'exclusive' 
        ? tempQQSettings.aiExclusiveStickers 
        : props.qqData.aiGeneralStickers;

    lines.forEach(line => {
        // 支持中文或英文冒号
        const parts = line.split(/[:：]/);
        if(parts.length >= 2) {
            const name = parts[0].trim();
            const src = parts.slice(1).join(':').trim();
            if(name && src) {
                targetArray.push({ name, src });  // ✅ 修复：添加到正确的目标数组
                count++;
            }
        }
    });
    tempStickerInput.value = '';  // ✅ 修复：清空AI表情输入框
    alert(`已添加 ${count} 个表情包到${stickerSettingsTab.value === 'exclusive' ? 'AI专属' : 'AI通用'}库`);
};

        // 删除 AI 表情
        const deleteAiSticker = (index) => {
            const targetArray = stickerSettingsTab.value === 'exclusive' 
                ? tempQQSettings.aiExclusiveStickers 
                : props.qqData.aiGeneralStickers;
            targetArray.splice(index, 1);
        };

        // 用户表情包批量添加
        const addUserBatchStickers = () => {
            if(!userStickerInput.value.trim()) return;
            const lines = userStickerInput.value.split('\n');
            let count = 0;
            lines.forEach(line => {
                const parts = line.split(/[:：]/);
                if(parts.length >= 2) {
                    const name = parts[0].trim();
                    const src = parts.slice(1).join(':').trim();
                    if(name && src) {
                        props.qqData.userStickers.push({ name, src });
                        count++;
                    }
                }
            });
            userStickerInput.value = '';
            alert(`已添加 ${count} 个表情包`);
        };

        // 用户表情包选择和发送
        const sendUserSticker = (sticker) => {
            const chat = getCurrentChat();
            // 這裡要把名稱帶進 content
            pushMessage(chat, 'user', 'sticker', `[表情包:${sticker.name}]`, { src: sticker.src });
            isUserStickerPickerOpen.value = false;
        };


        // --- AI 逻辑 (含表情包解析) ---
        const processSequentialMessages = (chat, parts, baseUrl, finalStatus) => {
            if (parts.length === 0) {
                props.qqData.isSending = false;
                props.qqData.sendingChatId = null;
                // 新增：在 AI 回覆完畢後，根據內容決定是否改變狀態
                if (finalStatus) {
                    chat.status = finalStatus;
                }
                if (chat.enableSummary && chat.summaryMode === 'auto') {
                    if (chat.msgCountSinceSummary >= chat.summaryTriggerCount) {
                        generateSummary(chat, baseUrl, props.apiConfig.key, props.apiConfig.model);
                    }
                }
                // 修改：processSequentialMessages 不再在完成時呼叫 generateHeartThoughts
                return;
            }

            const currentMsgContent = parts.shift();
            const typingTime = 800 + (currentMsgContent.length * 30) + (Math.random() * 400);

            setTimeout(() => {
                let type = 'text';
                let extra = {};
                let content = currentMsgContent;

                // 禁止所有 [] 形式的表情（如 [大笑]、[哭泣]、[doge] 等）
                // 只保留允许的功能型指令（如 [语音]、[红包]、[转账]、[图片]、[位置]、[表情包:xxx]）
                // 其它 [] 形式的内容直接过滤掉，不显示
                const allowedDirectives = [
                    /^\[语音\]/,
                    /^\[红包\]/,
                    /^\[转账\]/,
                    /^\[图片\]/,
                    /^\[位置\]/,
                    /^\[表情包[:：][^\]]+\]/,
                    /^\[链接[:：][^\]]*\]/
                ];
                // 如果内容以 [ 开头且不是允许的指令，则直接跳过
                if (
                    content.startsWith('[') &&
                    !allowedDirectives.some(reg => reg.test(content))
                ) {
                    processSequentialMessages(chat, parts, baseUrl, finalStatus);
                    return;
                }

                if (content.startsWith('[语音]')) {
                    type = 'voice';
                    const text = content.replace('[语音]', '').trim();
                    extra = { voiceText: text, duration: Math.max(1, Math.ceil(text.length / 3)), isVoiceTextVisible: false };
                } else if (content.startsWith('[红包]')) {
                    type = 'redpacket';
                    const text = content.replace('[红包]', '').trim();
                    extra = { packetText: text || "恭喜发财" };
                } else if (content.startsWith('[转账]')) {
                    type = 'transfer';
                    const amount = content.replace(/[^\d.]/g, ''); 
                    extra = { amount: amount || '???' };
                } else if (content.startsWith('[图片]')) {
                    type = 'image';
                    const desc = content.replace('[图片]', '').trim();
                    extra = { imgType: 'desc', description: desc };
                } else if (content.startsWith('[位置]')) {
                    type = 'location';
                    extra = { locEnd: content.replace('[位置]', '').trim() };
                } else if (content.startsWith('[链接')) {
                    type = 'link';
                    const match = content.match(/^\[链接[:：]([^|\]]*)\|?([^\]]*)\]([\s\S]*)/);
                    if (match) {
                        const title = match[1].trim() || '分享链接';
                        const source = match[2].trim();
                        const linkContent = match[3].trim();
                        content = `[链接] ${title}`; // for display in chat bubble
                        extra = {
                            linkData: {
                                title: title,
                                source: source,
                                content: linkContent
                            }
                        };
                    } else {
                        // Fallback for malformed link, treat as text
                        type = 'text';
                        extra = {};
                    }
                } else if (content.startsWith('[表情包')) {
                    type = 'sticker';
                    let val = '';
                    const match = content.match(/^\[表情包[:：]([^\]]+)\]/);
                    if (match && match[1]) {
                        val = match[1].trim();
                    } else {
                        val = content.replace('[表情包]', '').trim();
                    }

                    // 只允許發送已存在的表情包，否則直接忽略（不顯示）
                    let found = chat.aiExclusiveStickers ? chat.aiExclusiveStickers.find(s => s.name === val) : null;
                    if (!found) {
                        found = props.qqData.aiGeneralStickers ? props.qqData.aiGeneralStickers.find(s => s.name === val) : null;
                    }

                    if (found) {
                        extra = { src: found.src };
                    } else {
                        // 不存在則直接跳過這條訊息，不顯示
                        processSequentialMessages(chat, parts, baseUrl, finalStatus);
                        return;
                    }
                }

                pushMessage(chat, 'assistant', type, content, extra);
                processSequentialMessages(chat, parts, baseUrl, finalStatus);
            }, typingTime);
        };

// 新增：將 AI 回覆強制按標點分段（標點後必分下一則），並保留 ||| 分段
const splitAiContentToParts = (raw) => {
	if (!raw) return [];
	let text = String(raw).trim();
	// 若用戶已用 ||| 指定分段，優先尊重
	if (text.includes('|||')) {
		return text.split('|||').map(s => s.trim()).filter(Boolean);
	}
	// 以各種標點為邊界切分（包含中文/英文句尾標點與逗號）
	// 保留標點在前段末尾，但排除连续的英文点号（如 ...）
	const segs = text.split(/(?<=[。！？?!，,、;；])|(?<=\.)(?!\.)/g).map(s => s.trim()).filter(Boolean);
	
	// 將所有逗號、頓號、分號結尾的分段改為句號結尾
	return segs.map(seg => {
		// 檢查是否以逗號、頓號或分號結尾
		if (/[，,、;；]$/.test(seg)) {
			// 替換末尾的標點為句號
			return seg.replace(/[，,、;；]$/, '。');
		}
		return seg;
	});
};

// 新增：在展示訊息前生成一段隱形思考（改為本地模擬延遲，避免二次 API 呼叫）
const generateHiddenThought = async (chat, baseUrl) => {
	try {
		// 不再呼叫外部 API。根據最近一條 AI/使用者文本長度與隨機因素模擬思考時間。
		const recent = (chat && Array.isArray(chat.messages) && chat.messages.length > 0)
			? chat.messages[chat.messages.length - 1].content
			: '';
		const contentLen = recent ? Math.min(120, recent.length) : 20;
		const delay = Math.min(2200, 600 + contentLen * 20 + (Math.random() * 600));
		await new Promise(r => setTimeout(r, delay));
		// 返回空字串（隱形思考不顯示），僅用於節奏控制
		return '';
	} catch (e) {
		await new Promise(r => setTimeout(r, 800));
		return '';
	}
};

        const triggerAIResponse = async () => {
            if (props.qqData.isSending) return;
            if (!props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ 请先去【设置】App 配置 API 连接！");
                return;
            }

            const chat = props.qqData.chatList.find(c => c.id === props.qqData.currentChatId);
            // 新增：当 AI 准备回应时，强制设为在线状态
            chat.status = 'online';
            props.qqData.isSending = true; 
            props.qqData.sendingChatId = chat.id;
            try {
                let systemPrompt = `你扮演：${chat.name}。${chat.gender !== '未知' ? '性别：'+chat.gender+'。' : ''}`;
                if (chat.remark && chat.remark !== chat.name) systemPrompt += `用户对你的备注是：${chat.remark}。`;
                if (chat.aiPersona) systemPrompt += `\n你的详细人设：${chat.aiPersona}`;
                if (chat.userPersona) systemPrompt += `\n对话用户（我）的设定：${chat.userPersona}`;

                // 注入 NPC 列表
                if (chat.npcList && chat.npcList.length > 0) {
                    systemPrompt += `\n\n【已知 NPC/其他角色】：\n`;
                    chat.npcList.forEach(npc => {
                        systemPrompt += `[${npc.name}]: ${npc.setting || ''} (关系: ${npc.relation || '未知'})\n`;
                    });
                }
                
                // 注入世界书内容
                if (chat.selectedWorldbooks && chat.selectedWorldbooks.length > 0) {
                    try {
                        const saved = await localforage.getItem('worldbooks');
                        const allBooks = JSON.parse(saved || '[]');
                        const selectedBooks = allBooks.filter(b => chat.selectedWorldbooks.includes(b.id));
                        if (selectedBooks.length > 0) {
                            systemPrompt += `\n\n【世界书/背景设定】：\n`;
                            selectedBooks.forEach(book => {
                                systemPrompt += `[${book.title}]: ${book.content}\n`;
                            });
                        }
                    } catch (e) {
                        console.error("Error loading worldbooks for prompt", e);
                    }
                }

                // 若开启现实时间感知，告知模型当前时间或自定义时间
                const formatDateTimeChinese = (d) => {
                   const yyyy = d.getFullYear();
                   const mm = String(d.getMonth()+1).padStart(2,'0');
                   const dd = String(d.getDate()).padStart(2,'0');
                   const hh = String(d.getHours()).padStart(2,'0');
                   const min = String(d.getMinutes()).padStart(2,'0');
                   return `${yyyy}年${mm}月${dd}日 ${hh}:${min}`;
               };
               const parseOverrideToDate = (s) => {
                   try { return s ? new Date(s) : null; } catch(e){ return null; }
               };
               if (chat.timeAware) {
                   let timeText = '';
                   if (chat.timeOverride) {
                       const od = parseOverrideToDate(chat.timeOverride);
                       timeText = od ? formatDateTimeChinese(od) : chat.timeOverride;
                   } else {
                       timeText = formatDateTimeChinese(new Date());
                   }
                   systemPrompt += `\n【现实时间感知】：当前已允许获取现实时间，当前时间为：${timeText}（若无特别说明，视为本地时间）。`;
               }

                if (chat.enableSummary && chat.memoryList && chat.memoryList.length > 0) {
                    systemPrompt += `\n\n【长期记忆/前情提要】：\n`;
                    chat.memoryList.forEach((mem, idx) => {
                        systemPrompt += `[记忆片段${idx+1}]: ${mem.content}\n`;
                    });
                    systemPrompt += `(请基于以上记忆保持对话连续性)`;
                }

                // === 这里加入强约束 ===
                systemPrompt += `
【重要规则】：
- 禁止输出任何 [xxx] 形式的文本表情（如[大笑][doge][哭泣][偷笑]等），只允许以下格式：
  1. [语音]xxx
  2. [红包]xxx
  3. [转账]xxx
  4. [图片]xxx
  5. [位置]xxx
  6. [表情包:xxx]（仅限于当前可用表情包名称）
  7. [链接:标题|来源]内容 (来源可选, 如 [链接:文章标题|微博]这是内容)
- 其它所有 [xxx] 形式的内容都禁止出现，遇到想表达情绪时请用自然语言或 emoji。
`;

                // 強制要求在同一回覆尾端輸出心聲 JSON（同次回覆，不要另起請求）
                systemPrompt += `
【心声生成】：在主回覆结束后，务必紧接输出一行标记 ---HEART_JSON---，随后直接输出一个纯 JSON 物件（不包含其他文字），格式如下：
---HEART_JSON---
{"clothing":"...","behavior":"...","thought":"...","evil":"..."}
要求：
- 每个字段用第一人称中文（简体），长度 40 到 80 字（含），基于当前 AI 人设、玩家设定和近期对话，风格不可模板化；
- evil 表示想对 user 做的“坏坏”举动或心思（可调皮/暧昧，但不得违法或含露骨性暗示）；
- 只能输出该 JSON 物件，且不得输出额外説明或多余文本（若不符合格式，会以本地合成 fallback 生成心声）。
`;

                const limit = chat.contextLimit || 10;
                const validMessages = chat.messages.filter(m => !m.isRetracted && m.type !== 'forwarded');
                const contextMessages = [
                    { role: "system", content: systemPrompt },
                    ...validMessages.slice(-limit).map(m => {
                        // 如果是图片消息且有 src (本地图片/压缩图片)
                        if (m.type === 'image' && m.imgType === 'local' && m.src) {
                            return {
                                role: m.role,
                                content: [
                                    { type: "text", text: m.content || "发送了一张图片" },
                                    { type: "image_url", image_url: { url: m.src } }
                                ]
                            };
                        }
                        // 普通文本消息
                        return { role: m.role, content: m.content };
                    })
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
                        max_tokens: 4000,
                        temperature: 0.9 
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const data = await res.json();
                let aiRawContent = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content : '';

                // 嘗試從同次回覆中抽出心聲 JSON（AI 須在主回覆後輸出 ---HEART_JSON--- 與 JSON）
                const heartMarker = '---HEART_JSON---';
                let parsedHeart = null;
                if (aiRawContent.includes(heartMarker)) {
                    const parts = aiRawContent.split(heartMarker);
                    // 保留主回覆供展示
                    aiRawContent = parts[0].trim();
                    const jsonPart = parts.slice(1).join(heartMarker).trim();
                    // 先嘗試直接 parse，失敗時抓第一個 {...} 嘗試解析
                    try {
                        parsedHeart = JSON.parse(jsonPart);
                    } catch (e) {
                        const m = jsonPart.match(/\{[\s\S]*\}/);
                        if (m) {
                            try { parsedHeart = JSON.parse(m[0]); } catch (e2) { parsedHeart = null; }
                        }
                    }
                }

                // 新增：檢查 parsedHeart 是否有效（每欄 40-80 字）
                const isValidHeart = (h) => {
                    if (!h) return false;
                    const keys = ['clothing','behavior','thought','evil'];
                    for (const k of keys) {
                        if (!h[k] || typeof h[k] !== 'string') return false;
                        const len = h[k].replace(/\s+/g, '').length; // 粗略字數（去空白）
                        if (len < 40 || len > 80) return false;
                    }
                    return true;
                };

                // 新增：本地合成心聲（用於 parsedHeart 無效時，且不呼叫第二次模型）
                const synthesizeHeartFromContext = (chat, recentAiText) => {
                    const aiPersona = chat.aiPersona || '';
                    const userPersona = chat.userPersona || '';
                    const name = chat.name || '对方';
                    
                    // 获取最近的用户消息
                    const lastUserMsg = (chat.messages && [...chat.messages].reverse().find(m => m.role === 'user'))?.content || '';
                    
                    // 字数控制函数（40-80字）
                    const ensureLength = (text) => {
                        let result = text.trim();
                        if (result.length < 40) {
                            // 太短就补充自然的延伸
                            const extensions = [
                                '这让我有些在意。',
                                '我不确定该怎么回应。',
                                '这种感觉有点微妙。',
                                '我需要想想怎么说。'
                            ];
                            while (result.length < 40) {
                                result += extensions[Math.floor(Math.random() * extensions.length)];
                            }
                        }
                        if (result.length > 80) {
                            result = result.slice(0, 80);
                            const lastPeriod = result.lastIndexOf('。');
                            if (lastPeriod > 30) result = result.slice(0, lastPeriod + 1);
                        }
                        return result;
                    };

                    // 衣着描述（不使用AI回复内容，基于人设或随机生成）
                    const clothingVariants = [
                        '我穿着一件宽松的卫衣，袖口有些磨损痕迹，显得很随意。头发随意扎着，没有刻意打理。',
                        '今天穿的是简单的T恤和牛仔裤，衣领有点歪，袖子卷到手肘。看起来挺休闲的。',
                        '我套了件深色外套，里面是白衬衫，衣角微微皱着。整体给人一种不太在意外表的感觉。',
                        '穿着件毛衣，领口松松垮垮的，袖子被我撸到了手臂。头发有点乱，但我不太在意。'
                    ];
                    const clothing = aiPersona.includes('衣') || aiPersona.includes('穿') 
                        ? ensureLength(`我${aiPersona.slice(0, 60)}。从镜子里看，自己的样子似乎还算说得过去。`)
                        : clothingVariants[Math.floor(Math.random() * clothingVariants.length)];

                    // 行为描述（基于最近对话和人设）
                    const behaviorVariants = [
                        `刚才${lastUserMsg ? '听你说那些话' : '和你聊天'}的时候，我的手指不自觉地在桌上轻敲。眼神有点游移，不太敢直视屏幕。`,
                        `我回复的时候有点犹豫，打了又删，删了又打。最后还是发出去了，但心里有点忐忑。`,
                        `说话的语气听起来很平静，但其实我的心跳有点快。手机拿在手里，掌心微微出汗。`,
                        `我故意放慢了打字速度，不想显得太急切。时不时瞄一眼你的头像，想猜你在想什么。`
                    ];
                    const behavior = ensureLength(behaviorVariants[Math.floor(Math.random() * behaviorVariants.length)]);

                    // 心声（第一视角，可以是吐槽、情绪、想法等）
                    const thoughtVariants = [
                        lastUserMsg ? `${name}说"${lastUserMsg.slice(0, 15)}"的时候，我心里其实有点慌。不知道该怎么接话才不会显得太刻意。` : `和${name}聊天总让我有种说不清的感觉。想靠近，但又怕说错话。`,
                        `我承认，刚才看到你的消息时心里咯噔一下。不知道是期待还是紧张，可能两者都有吧。`,
                        userPersona ? `你是${userPersona.slice(0, 20)}，这让我觉得有点难以捉摸。我在想，你会怎么看待我呢？` : `说实话，我有点搞不懂你的想法。每次聊天都像在猜谜，既刺激又让人不安。`,
                        `我的心思其实挺复杂的。表面上看起来平静，但内心在反复权衡每一句话该怎么说。`
                    ];
                    const thought = ensureLength(thoughtVariants[Math.floor(Math.random() * thoughtVariants.length)]);

                    // 坏心思（想对user做的"坏坏"举动或心思）
                    const evilVariants = [
                        `我有个小心思：想试探一下你对我的态度。比如故意说些模棱两可的话，看你会不会追问。`,
                        `如果可以的话，我想偷偷看看你现在的表情。是在笑，还是在皱眉？这样就能猜到你的真实想法了。`,
                        `我在想，要不要发个表情包或者语音过去，让气氛不那么严肃。然后趁机拉近点距离。`,
                        `说实话，我有点想"欺负"你一下。比如故意不回消息，等你主动来找我。但又怕你真的不理我了。`
                    ];
                    const evil = ensureLength(evilVariants[Math.floor(Math.random() * evilVariants.length)]);

                    return { clothing, behavior, thought, evil };
                };

                // 儲存心聲（解析成功且驗證通過就用解析結果，否則用本地合成）
                chat.heartThoughts = chat.heartThoughts || [];
                if (isValidHeart(parsedHeart)) {
                    chat.heartThoughts.unshift({ id: Date.now(), time: new Date().toLocaleString(), data: parsedHeart });
                } else {
                    const synthesized = synthesizeHeartFromContext(chat, aiRawContent);
                    chat.heartThoughts.unshift({ id: Date.now(), time: new Date().toLocaleString(), data: synthesized });
                }

                if (chat.heartThoughts.length > 200) chat.heartThoughts.length = 200;

                // 新增：根据 AI 回覆内容决定最終状态（更精确的判断）
                const busyKeywords = ['有事', '去忙', '不聊了', '先不聊', '有点事', '再说'];
                const offlineKeywords = ['睡觉', '关机', '关手机', '没电', '晚安', '睡了'];
                const futureOrNegationKeywords = ['准备', '打算', '想', '还没', '是不是', '要不要', '差不多' ,'马上', '一会儿', '等会儿', '可能', '应该', '不会', '不想' ,'不打算' ,'等等', '稍后', '也许', '或许', '大概', '不能', '待会'];
                
                let finalStatus = null; // null 表示不改变状态

                // 检查是否是问句、包含第二人称或将来时态词，如果是，则不改变状态
                const isQuestionOrAboutUser = /[?？]/.test(aiRawContent) || /[你妳]/.test(aiRawContent);
                const isFutureTense = futureOrNegationKeywords.some(kw => aiRawContent.includes(kw));

                // 只有在不是问句/不关于用户/不是将来时态时，才检查关键词
                if (!isQuestionOrAboutUser && !isFutureTense) {
                    if (offlineKeywords.some(kw => aiRawContent.includes(kw))) {
                        finalStatus = 'offline';
                    } else if (busyKeywords.some(kw => aiRawContent.includes(kw))) {
                        finalStatus = 'busy';
                    }
                }

                // 之後維持原本把 aiRawContent 清理、分段、並呼叫 processSequentialMessages 的流程
                const cleanContent = aiRawContent.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').replace(/\*.*?\*/g, '').trim();
                const msgParts = splitAiContentToParts(cleanContent);
                if (msgParts.length === 0) {
                     pushMessage(chat, 'assistant', 'text', '...');
                     props.qqData.isSending = false;
                     props.qqData.sendingChatId = null;
                } else {
                    await generateHiddenThought(chat, baseUrl);
                    processSequentialMessages(chat, msgParts, baseUrl, finalStatus);
                }
                
            } catch (e) {
                alert("生成失败: " + e.message);
                chat.messages.push({ role: 'system', content: `[系统错误] ${e.message}`, type: 'text' });
                props.qqData.isSending = false;
                props.qqData.sendingChatId = null;
            }
        };

        const handleReroll = () => {
            const chat = getCurrentChat();
            if (!chat || !chat.messages) return;
            if (chat.messages.length === 0) return;

            if(confirm("重Roll最近一次回复？(将删除最后的AI消息并重新生成)")) {
                while (chat.messages.length > 0) {
                    const lastMsg = chat.messages[chat.messages.length - 1];
                    if (lastMsg.role === 'assistant') {
                        chat.messages.pop();
                        if(chat.msgCountSinceSummary > 0) chat.msgCountSinceSummary--;
                    } else {
                        break; 
                    }
                }
                triggerAIResponse();
            }
        };

        const generateSummary = async (chatObj, baseUrl, apiKey, model) => {
            if(isSummarizing.value) return;
            isSummarizing.value = true;
            try {
                const msgsToSummarize = chatObj.messages || [];
                const validMsgs = msgsToSummarize.filter(m => !m.isRetracted && m.type !== 'forwarded');
                if (validMsgs.length === 0) return;

                const promptText = chatObj.summaryPrompt || '请用第三视角总结以下对话的事件和信息';
                const count = chatObj.summaryTriggerCount || 20;
                const recentMsgs = validMsgs.slice(-(count + 5)).map(m => `${m.role === 'user' ? '我' : chatObj.name}: ${m.content}`).join('\n');

                const res = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model || 'gpt-3.5-turbo',
                        messages: [
                            { role: "system", content: "你是一个专业的对话总结助手。" },
                            { role: "user", content: `${promptText}\n\n需要总结的近期对话：\n${recentMsgs}` }
                        ]
                    })
                });
                
                if (!res.ok) throw new Error("Summary API failed");
                const data = await res.json();
                const newSummaryContent = data.choices[0].message.content;

                if(!chatObj.memoryList) chatObj.memoryList = [];
                chatObj.memoryList.push({
                    id: Date.now(),
                    content: newSummaryContent,
                    time: new Date().toLocaleString()
                });
                chatObj.msgCountSinceSummary = 0; 
                if (chatObj === tempQQSettings) alert("总结完成！已添加一条新记忆。");
            } catch (e) {
                console.error("总结失败", e);
                if (chatObj === tempQQSettings) alert("总结失败: " + e.message);
            } finally {
                isSummarizing.value = false;
            }
        };

        const handleManualSummary = () => {
            let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);
            generateSummary(tempQQSettings, baseUrl, props.apiConfig.key, props.apiConfig.model);
        };

        const deleteMemory = (index) => {
            if(confirm("确定删除这条记忆吗？")) tempQQSettings.memoryList.splice(index, 1);
        };

        // 新增：清空聊天记录和心声（保留长期记忆）
        const clearChatHistory = () => {
            if (!confirm("确定要清空聊天记录和心声吗？\n\n注意：长期记忆总结会保留，但所有聊天消息和心声历史将被删除。")) return;
            tempQQSettings.messages = [];
            tempQQSettings.heartThoughts = [];
            tempQQSettings.lastMsg = '';
            tempQQSettings.lastTime = '';
            tempQQSettings.msgCountSinceSummary = 0;
            alert("已清空聊天记录和心声！");
        };

        // --- 交互功能 ---
        const handleMsgTouchStart = (e, index) => {
            if(isMultiSelectMode.value) return;
            longPressTimer = setTimeout(() => {
                showContextMenu(e, index);
            }, 600); 
        };

        const handleMsgTouchEnd = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const handleMsgTouchCancel = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const showContextMenu = (e, index) => {
            if (e.preventDefault) e.preventDefault();

            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            // 菜单宽度约 280px（4个按钮 × 70px），需要防止越界
            const menuWidth = 280;
            const menuHeight = 50;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // 水平边界检测：确保菜单居中后不会超出屏幕
            let adjustedX = clientX;
            if (clientX - menuWidth / 2 < 10) {
                // 左边界：至少留 10px 边距
                adjustedX = menuWidth / 2 + 10;
            } else if (clientX + menuWidth / 2 > windowWidth - 10) {
                // 右边界
                adjustedX = windowWidth - menuWidth / 2 - 10;
            }
            
            // 垂直边界检测：菜单在触摸点上方显示
            let adjustedY = clientY;
            if (clientY - menuHeight - 20 < 10) {
                // 如果上方空间不足，显示在触摸点下方
                adjustedY = clientY + 20;
            }
            
            contextMenu.x = adjustedX;
            contextMenu.y = adjustedY;
            contextMenu.msgIndex = index;
            contextMenu.visible = true;
        };

        const hideContextMenu = () => {
            contextMenu.visible = false;
            contextMenu.msgIndex = -1;
        };

        // 新增：跨瀏覽器複製支援
const copyToClipboard = async (text) => {
	// 先用 clipboard API
	try {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch (e) {
		// ignore and fallback
	}
	// 回退：textarea + execCommand
	try {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.left = '0';
		ta.style.top = '0';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		const ok = document.execCommand('copy');
		document.body.removeChild(ta);
		return !!ok;
	} catch (e) {
		return false;
	}
};

        // 修改：menuAction 支援 async 複製，並在複製成功/失敗後給予提示
        const menuAction = async (action) => {
            const chat = getCurrentChat();
            const msg = chat.messages[contextMenu.msgIndex];

            if (action === 'edit') {
                if(msg.type !== 'text') { alert("仅普通文本消息可编辑"); hideContextMenu(); return; }
                const newContent = prompt("编辑消息:", msg.content);
                if (newContent !== null) {
                    msg.content = newContent;
                    updateLastMsg(chat);
                }
                hideContextMenu();
            } else if (action === 'copy') {
                if(msg.type !== 'text' && msg.type !== 'voice') { alert("该消息类型不支持直接复制"); hideContextMenu(); return; }
                const txt = msg.type === 'voice' ? msg.voiceText : msg.content;
                if (!txt) { alert("暂无可复制内容"); hideContextMenu(); return; }
                const ok = await copyToClipboard(txt);
                if (ok) alert('已复制到剪贴簿');
                else alert('复制失败：您的浏览器不支援此操作');
                hideContextMenu();
            } else if (action === 'retract') {
                msg.isRetracted = true;
                msg.content = "已撤回";
                updateLastMsg(chat);
                hideContextMenu();
            } else if (action === 'multi') {
                isMultiSelectMode.value = true;
                selectedMsgIndices.value.add(contextMenu.msgIndex);
                hideContextMenu();
            }
        };

        const toggleSelectMsg = (index) => {
            if (!isMultiSelectMode.value) return;
            // const msg = getCurrentChat().messages[index];
            // if (msg.isRetracted) return;
            // ↑↑↑ 移除這一行，允許多選撤回消息

            if (selectedMsgIndices.value.has(index)) {
                selectedMsgIndices.value.delete(index);
            } else {
                selectedMsgIndices.value.add(index);
            }
        };

        const exitMultiSelectMode = () => {
            isMultiSelectMode.value = false;
            selectedMsgIndices.value.clear();
        };

        const updateLastMsg = (chat) => {
            if (!chat || !chat.messages) return;
            if (chat.messages.length > 0) {
                const lastMsgObj = chat.messages[chat.messages.length - 1];
                let displayLastMsg = lastMsgObj.content;
                
                if(lastMsgObj.type === 'voice') displayLastMsg = '[语音]';
                else if(lastMsgObj.type === 'image') displayLastMsg = '[图片]';
                else if(lastMsgObj.type === 'sticker') displayLastMsg = '[表情包]';
                else if(lastMsgObj.type === 'redpacket') displayLastMsg = '[红包]';
                else if(lastMsgObj.type === 'transfer') displayLastMsg = '[转账]';
                else if(lastMsgObj.type === 'location') displayLastMsg = '[位置]';
                else if(lastMsgObj.type === 'link') displayLastMsg = '[链接]';

                chat.lastMsg = displayLastMsg;
                chat.lastTime = lastMsgObj.time || ''; 
            } else {
                chat.lastMsg = '';
                chat.lastTime = '';
            }
        };

        const deleteSelectedMessages = () => {
            if (!confirm(`确定删除选中的 ${selectedMsgIndices.value.size} 条消息吗？这将影响AI的记忆。`)) return;
            const chat = getCurrentChat();
            // 允許刪除撤回消息（不需修改，原本就會刪除所有選中的 index）
            chat.messages = chat.messages.filter((_, idx) => !selectedMsgIndices.value.has(idx));
            updateLastMsg(chat);
            exitMultiSelectMode();
        };

        const openForwardModal = () => {
            if (selectedMsgIndices.value.size === 0) return;
            isForwardModalOpen.value = true;
        };

        const forwardToChat = (targetChatId) => {
            const sourceChat = getCurrentChat();
            const targetChat = props.qqData.chatList.find(c => c.id === targetChatId);
            if (!targetChat) return;

            const indices = Array.from(selectedMsgIndices.value).sort((a,b) => a-b);
            const forwardedList = indices.map((idx) => {
                const m = sourceChat.messages[idx];
                 let displayContent = m.content;
                 if(m.type === 'voice') displayContent = '[语音]';
                 else if(m.type === 'image') displayContent = '[图片]';
                 else if(m.type === 'sticker') displayContent = '[表情包]';
                 else if(m.type === 'redpacket') displayContent = '[红包]';
                 else if(m.type === 'transfer') displayContent = '[转账]';
                 else if(m.type === 'location') displayContent = '[位置]';
                 else if(m.type === 'link') displayContent = '[链接]';

                 return {
                     role: m.role,
                     content: displayContent,
                     name: m.role === 'user' ? '我' : (sourceChat.remark || sourceChat.name),
                     avatar: m.role === 'user' ? sourceChat.userAvatar : sourceChat.avatar
                 };
            });

            let previewText = '';
            forwardedList.slice(0, 3).forEach(item => {
                let sub = item.content.length > 15 ? item.content.substring(0, 15) + '...' : item.content;
                previewText += `${item.name}: ${sub}\n`;
            });
            if(forwardedList.length > 3) previewText += '...';

            forwardViewer.visible = true;
            forwardViewer.title = `${sourceChat.remark || sourceChat.name}的聊天记录`;
            forwardViewer.list = forwardedList;

            pushMessage(targetChat, 'user', 'forwarded', `[聊天记录] ${sourceChat.remark || sourceChat.name}的聊天记录`, {
                forwardData: {
                    title: `${sourceChat.remark || sourceChat.name}的聊天记录`,
                    list: forwardedList
                }
            });

            isForwardModalOpen.value = false;
            exitMultiSelectMode();
            alert(`已转发到 ${targetChat.remark || targetChat.name}`);
        };

        const openForwardViewer = (msg) => {
            if (!msg.forwardData) return;
            forwardViewer.title = msg.forwardData.title;
            forwardViewer.list = msg.forwardData.list;
            forwardViewer.visible = true;
        };

        const toggleVoiceText = (msg) => {
            msg.isVoiceTextVisible = !msg.isVoiceTextVisible;
        };

        // 新增：生成心聲（第一視角）並存入 chat.heartThoughts
const generateHeartThoughts = async (chat, baseUrl) => {
	try {
		if (!props.apiConfig.key || !props.apiConfig.endpoint) {
			// 無 API 時以本地簡易回退文本生成（每項約 60 字）
			const fallback = {
				clothing: '穿着一件简单的深色外套，袖口有些磨损，显得随性而不修边幅。',
				behavior: '说话带有一点漫不经心的口气，但眼神会不时扫向手机通知，动作轻快。',
				thought: '其实我有点想靠近，但又怕被看穿，内心在反复衡量该说的每一句话。',
				evil: '如果可以，我会偷偷试探你对我的在意，再决定要不要更进一步。'
			};
			chat.heartThoughts = chat.heartThoughts || [];
			chat.heartThoughts.unshift({ id: Date.now(), time: new Date().toLocaleString(), data: fallback });
			// 保留最多 200 條以免無限增長
			if (chat.heartThoughts.length > 200) chat.heartThoughts.length = 200;
			return;
		}

		let endpoint = baseUrl || props.apiConfig.endpoint.trim().replace(/\/+$/, '');
		if (endpoint.endsWith('/v1')) endpoint = endpoint.slice(0, -3);

		const systemPrompt = '你是一個幫助生成角色內心獨白的工具，輸出必須為一個 JSON 物件，包含四個欄位：clothing, behavior, thought, evil。每個欄位以第一視角描述，中文，約 60 字左右，不要有其他文字或說明，也不要有額外的換行或註解。';
		const userPrompt = `請根據角色名：「${chat.name || '未知'}」，與目前對話情境，生成四項第一視角心聲：衣著(clothing)、行為(behavior)、心聲(thought)、壞心思(evil)。每項約 60 字，中文，輸出純 JSON。`;

		const res = await fetch(`${endpoint}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${props.apiConfig.key}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: props.apiConfig.model || 'gpt-3.5-turbo',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				],
				max_tokens: 400,
				temperature: 0.9
			})
		});

		let parsed = null;
		if (res.ok) {
			const d = await res.json();
			const txt = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) ? d.choices[0].message.content.trim() : '';
			// 嘗試純 JSON 解析
			try {
				parsed = JSON.parse(txt);
			} catch (e) {
				// 嘗試抓出簡單的鍵值對
				const tryParse = {};
				const matchMap = { clothing: ['衣著','clothing'], behavior: ['行为','behavior','行為'], thought: ['心声','心聲','thought'], evil: ['坏心思','壞心思','evil'] };
				Object.keys(matchMap).forEach(k => {
					const re = new RegExp(`${matchMap[k].join('|')}[:：]\\s*([^\\n\\r]+)`, 'i');
					const m = txt.match(re);
					tryParse[k] = m ? m[1].trim() : '';
				});
				parsed = tryParse;
			}
		}

		if (!parsed) {
			parsed = {
				clothing: '穿着一件简单的深色外套，袖口有些磨损，显得随性而不修边幅。',
				behavior: '说话带有一点漫不经心的口气，但眼神会不时扫向手机通知，动作轻快。',
				thought: '其实我有点想靠近，但又怕被看穿，内心在反复衡量该说的每一句话。',
				evil: '如果可以，我会偷偷试探你对我的在意，再决定要不要更进一步。'
			};
		}

		chat.heartThoughts = chat.heartThoughts || [];
		chat.heartThoughts.unshift({ id: Date.now(), time: new Date().toLocaleString(), data: parsed });
		if (chat.heartThoughts.length > 200) chat.heartThoughts.length = 200;
	} catch (e) {
		// 失敗時回退
		chat.heartThoughts = chat.heartThoughts || [];
		chat.heartThoughts.unshift({ id: Date.now(), time: new Date().toLocaleString(), data: {
			clothing: '穿着无明显特征的衣物。',
			behavior: '举止正常但心中微动。',
			thought: '有些复杂的念头在心里盘旋。',
			evil: '偶尔会想试探一下对方的反应。'
		} });
		if (chat.heartThoughts.length > 200) chat.heartThoughts.length = 200;
	}
};

// 新增：開啟心聲視窗
const openHeartModal = () => {
    currentHeartIndex.value = 0; // 顯示最新
    isHeartModalOpen.value = true;
};

// 新增：顯示指定歷史心聲並打開主視窗
const viewHeartAtIndex = (idx) => {
    currentHeartIndex.value = idx || 0;
    isHeartHistoryOpen.value = false;
    isHeartModalOpen.value = true;
};

// 新增：刪除歷史心聲
const deleteHeartEntry = (chat, idx) => {
    if (!chat || !chat.heartThoughts) return;
    if (!confirm('确定删除这条心声吗？')) return;
    chat.heartThoughts.splice(idx, 1);
};

// 新增：头像框相关方法
const openFrameModal = (target) => {
    frameTarget.value = target;
    isFrameModalOpen.value = true;
};

const setFrame = (frame) => {
    if (frameTarget.value === 'ai') {
        tempQQSettings.aiAvatarFrame = frame;
    } else {
        tempQQSettings.userAvatarFrame = frame;
    }
    isFrameModalOpen.value = false;
};

        const addCustomFrame = () => {
            emit('frame-action', { type: 'add' });
        };

        const deleteCustomFrame = (index) => {
            emit('frame-action', { type: 'delete', index });
        };

        // --- NPC库管理逻辑 ---
        const openNpcManager = () => {
            isNpcManagerOpen.value = true;
            npcManagerTab.value = 'list';
        };

        const openNpcEdit = (index = -1) => {
            editingNpcIndex.value = index;
            if (index === -1) {
                // 新增
                Object.assign(tempNpcData, { name: '', setting: '', relation: '' });
            } else {
                // 编辑
                const npc = tempQQSettings.npcList[index];
                Object.assign(tempNpcData, JSON.parse(JSON.stringify(npc)));
            }
            // 切换到添加/编辑 Tab
            npcManagerTab.value = 'add';
        };

        const saveNpc = () => {
            if (!tempNpcData.name.trim()) {
                alert("NPC名字不能为空");
                return;
            }
            if (!tempQQSettings.npcList) tempQQSettings.npcList = [];
            
            const newNpc = JSON.parse(JSON.stringify(tempNpcData));
            
            if (editingNpcIndex.value === -1) {
                tempQQSettings.npcList.push(newNpc);
            } else {
                tempQQSettings.npcList[editingNpcIndex.value] = newNpc;
            }
            // 保存后返回列表
            npcManagerTab.value = 'list';
        };

        const deleteNpc = (index) => {
            if (confirm("确定删除这个NPC吗？")) {
                tempQQSettings.npcList.splice(index, 1);
            }
        };

        // --- 说说（动态）功能方法 ---

        // 打开说说发布窗口
        const openPublishMoment = () => {
            // 重置表单
            momentForm.content = '';
            momentForm.images = [];
            momentForm.mentions = [];
            momentForm.location = '';
            isPublishMomentOpen.value = true;
        };

        // 触发说说图片上传
        const triggerMomentImageUpload = () => {
            momentImageInput.value.click();
        };

        // 处理说说图片文件
        const handleMomentImageChange = async (e) => {
            const files = e.target.files;
            if (!files) return;

            // 最多上传9张
            const remainingSlots = 9 - momentForm.images.length;
            if (files.length > remainingSlots) {
                alert(`最多还能上传 ${remainingSlots} 张图片。`);
            }

            for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
                const file = files[i];
                try {
                    const compressedUrl = await compressImage(file);
                    momentForm.images.push(compressedUrl);
                } catch (err) {
                    console.error("图片压缩失败", err);
                    alert("有图片处理失败，请重试");
                }
            }
            e.target.value = ''; // 清空以便再次选择
        };
        
        // 删除已选图片
        const removeMomentImage = (index) => {
            momentForm.images.splice(index, 1);
        };

        // 打开 @好友 列表
        const openAtUserModal = () => {
            isAtUserModalOpen.value = true;
        };

        // 切换 @好友 选择
        const toggleMention = (chat) => {
            const mention = { id: chat.id, name: chat.remark || chat.name };
            const index = momentForm.mentions.findIndex(m => m.id === mention.id);
            if (index > -1) {
                momentForm.mentions.splice(index, 1);
            } else {
                momentForm.mentions.push(mention);
            }
        };
        
        // 添加地点
        const addMomentLocation = () => {
            const location = prompt("请输入地点：", momentForm.location);
            if (location !== null) {
                momentForm.location = location;
            }
        };

        // 发布说说
        const publishMoment = () => {
            if (!momentForm.content.trim() && momentForm.images.length === 0) {
                alert("内容和图片不能都为空！");
                return;
            }

            const newMoment = {
                id: Date.now(),
                author: {
                    name: props.qqData.selfName || '我',
                    avatar: props.qqData.selfAvatar || ''
                },
                content: momentForm.content,
                images: momentForm.images,
                mentions: momentForm.mentions,
                location: momentForm.location,
                timestamp: Date.now(),
                time: new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                // 新增：初始化点赞和评论
                likes: [],
                comments: [],
                tempComment: ''
            };

            props.qqData.momentsList.unshift(newMoment);
            isPublishMomentOpen.value = false;
        };

        // --- 新增：说说交互方法 ---

        // 点赞/取消点赞
        const toggleLike = (moment) => {
            const selfName = props.qqData.selfName || '我';
            const index = moment.likes.indexOf(selfName);
            if (index > -1) {
                moment.likes.splice(index, 1); // 取消点赞
            } else {
                moment.likes.push(selfName); // 点赞
            }
        };

        // 转发说说 (简单提示)
        const forwardMoment = (moment) => {
            alert("功能开发中，敬请期待！");
        };

        // 提交评论
        const submitComment = (moment) => {
            if (!moment.tempComment.trim()) return;
            moment.comments.push({
                id: Date.now(),
                author: props.qqData.selfName || '我',
                content: moment.tempComment
            });
            moment.tempComment = ''; // 清空输入框
        };

        // 新增：动态页面滚动处理
        const handleMomentsScroll = (event) => {
            const scrollTop = event.target.scrollTop;
            const fadeDistance = 150; // 滚动150px后完全不透明
            let opacity = scrollTop / fadeDistance;
            if (opacity > 1) opacity = 1;
            momentsHeaderOpacity.value = opacity;
        };

        // 新增：说说菜单控制
        const toggleMomentMenu = (momentId) => {
            if (activeMomentMenu.value === momentId) {
                activeMomentMenu.value = null;
            } else {
                activeMomentMenu.value = momentId;
            }
        };

        const deleteMoment = (momentId) => {
            if (confirm("确定要删除这条说说吗？")) {
                const index = props.qqData.momentsList.findIndex(m => m.id === momentId);
                if (index > -1) {
                    props.qqData.momentsList.splice(index, 1);
                }
            }
            activeMomentMenu.value = null; // Close menu after action
        };


        // 颜色配置：衣着(蓝)、行为(绿)、心声(粉)、坏心思(紫)
        const heartStyles = {
            clothing: { bg: '#e6f4ff', border: '#91caff', title: '#0050b3', label: '衣着' },
            behavior: { bg: '#f6ffed', border: '#b7eb8f', title: '#389e0d', label: '行为' },
            thought:  { bg: '#fff0f6', border: '#ffadd2', title: '#c41d7f', label: '心声' },
            evil:     { bg: '#f9f0ff', border: '#d3adf7', title: '#531dab', label: '坏心思' }
        };

        return {
            heartStyles,
            currentHeartIndex, viewHeartAtIndex,
            isQQSettingsOpen, tempQQSettings, chatContainer, fileInput, chatInputRef, imgMsgInput,
            getCurrentChat, handleQQCreate, enterChat, openQQSettings,
            saveQQSettings, deleteCurrentChat, triggerAvatarUpload,
            handleFileChange, sendUserMessage, triggerAIResponse,
            activeTab, isSummaryEditOpen, handleManualSummary, isSummarizing,
            showSummaryAlert, deleteMemory, canReroll, handleReroll, adjustInputHeight,
            contextMenu,
            handleMsgTouchStart,
            handleMsgTouchEnd,
            handleMsgTouchCancel,
            showContextMenu,
            hideContextMenu,
            menuAction,
            isMultiSelectMode, selectedMsgIndices, toggleSelectMsg, exitMultiSelectMode, 
            deleteSelectedMessages, openForwardModal, isForwardModalOpen, forwardToChat,
            forwardViewer, openForwardViewer,
            // 功能相关
            openRedPacketModal, confirmRedPacket, sendVoice, triggerImageUpload, sendTextImage, handleImageMsgChange,
            isLocationModalOpen, locationForm, openLocationModal, sendLocation, toggleVoiceText,
            isRedPacketModalOpen, redPacketForm,
            textViewer, openTextViewer,
            isLinkModalOpen, linkForm, openLinkModal, sendLink,
            linkViewer, openLinkViewer,
            // 表情包相关
            isStickerSettingsOpen, stickerSettingsTab, tempStickerInput, addBatchStickers, deleteAiSticker,
            isUserStickerPickerOpen, isUserStickerManageMode, userStickerInput, addUserBatchStickers, sendUserSticker,
            // 心聲相關
            isHeartModalOpen, isHeartHistoryOpen, openHeartModal, deleteHeartEntry,
            // 世界书
            availableWorldbooks,
            isWorldbookDropdownOpen,
            // 清空聊天记录
            clearChatHistory,
            // 头像框
            isFrameModalOpen, frameTarget, openFrameModal, setFrame, addCustomFrame, deleteCustomFrame,
            // NPC库
            isNpcManagerOpen, isNpcEditOpen, npcManagerTab, tempNpcData, editingNpcIndex,
            openNpcManager, openNpcEdit, saveNpc, deleteNpc,
            // 动态页面
            triggerMomentsBgUpload, triggerSelfAvatarUpload,
            editSelfName, editVisitorCount,
            handleMomentsScroll, momentsHeaderOpacity,
            // 说说功能
            isPublishMomentOpen, momentForm, isAtUserModalOpen, momentImageInput,
            openPublishMoment, triggerMomentImageUpload, handleMomentImageChange, removeMomentImage,
            openAtUserModal, toggleMention, addMomentLocation, publishMoment,
            // 新增：说说交互
            toggleLike, forwardMoment, submitComment,
            // 新增：说说菜单
            activeMomentMenu, toggleMomentMenu, deleteMoment
        };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }" @click="hideContextMenu(); activeMomentMenu = null">
        <!-- 列表页 -->
        <div v-if="!qqData.currentChatId" style="display:flex; flex-direction:column; height:100%;">
            <div class="app-header" v-if="activeTab !== 'moments'" style="height: calc(60px + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top); margin-top: 0; align-items: center; position: relative;">
                <div class="app-header-title" style="width: 100%; text-align: center; pointer-events: none;">消息</div>
                <div class="app-header-close" @click="handleQQCreate" style="font-size: 24px; font-weight: 300; position: absolute; right: 15px;">+</div>
                <div class="app-header-left" @click="$emit('close')" style="font-weight: 400; position: absolute; left: 15px;">关闭</div>
            </div>
            <div class="app-content" style="padding: 0; flex: 1; overflow-y: auto;">
                <div v-show="activeTab === 'msg'" class="qq-list">
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
                </div>
                <div v-show="activeTab === 'moments'" style="position: relative; height: 100%; background: #fff;">
                    <!-- 渐变顶部导航栏 (现在固定在最上层) -->
                    <div :style="{ 
                            backgroundColor: 'rgba(255, 255, 255, ' + momentsHeaderOpacity + ')',
                            boxShadow: momentsHeaderOpacity > 0.8 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            color: momentsHeaderOpacity > 0.5 ? '#000' : '#fff',
                            textShadow: momentsHeaderOpacity > 0.5 ? 'none' : '0 2px 4px rgba(0,0,0,0.6)',
                            filter: momentsHeaderOpacity > 0.5 ? 'none' : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7))'
                         }"
                         style="position: absolute; top: 0; left: 0; width: 100%; padding: calc(26px + env(safe-area-inset-top)) 15px 10px 15px; display: flex; justify-content: space-between; align-items: center; z-index: 10; box-sizing: border-box; transition: background-color 0.3s, color 0.3s, box-shadow 0.3s, filter 0.3s; pointer-events: auto;">
                        
                        <div @click.stop="activeTab = 'msg'" style="display: flex; align-items: center; cursor: pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                            <span style="font-size: 16px; font-weight: 500; margin-left: 2px;">消息</span>
                        </div>
                        <div style="cursor: pointer; display: flex; align-items: center; margin-right: 10px;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                    </div>

                    <!-- 滚动容器 -->
                    <div style="height: 100%; overflow-y: auto; background: #fff;" @scroll="handleMomentsScroll">
                        <!-- 动态页顶部背景图区域 -->
                        <div style="width: 100%; height: 25vh; position: relative; background-color: #888; background-size: cover; background-position: center;"
                             :style="{ backgroundImage: qqData.momentsBackground ? 'url(' + qqData.momentsBackground + ')' : 'none' }"
                             @click="triggerMomentsBgUpload">
                            
                            <!-- 底部渐变层 -->
                            <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; background: linear-gradient(to bottom, transparent, #fff); pointer-events: none;"></div>

                            <!-- 左下角圆形头像 -->
                            <div style="position: absolute; bottom: -25px; left: 15px; display: flex; align-items: flex-end; z-index: 5;">
                                 <div @click.stop="triggerSelfAvatarUpload" 
                                      style="width: 80px; height: 80px; border-radius: 50%; background-color: #eee; border: 3px solid #fff; background-size: cover; background-position: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);"
                                      :style="{ backgroundImage: qqData.selfAvatar ? 'url(' + qqData.selfAvatar + ')' : 'none' }">
                                 </div>
                                 <div style="margin-left: 15px; margin-bottom: 15px; display: flex; flex-direction: column;">
                                    <div @click.stop="editSelfName" style="font-size: 18px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.6); margin-bottom: 2px; cursor: pointer;">{{ qqData.selfName || '我' }}</div>
                                    <div @click.stop="editVisitorCount" style="font-size: 15px; color: white; text-shadow: 0 1px 2px rgb(0, 0, 0); cursor: pointer;">访客数量 {{ qqData.visitorCount || 0 }}</div>
                                 </div>
                            </div>
                        </div>

                        <!-- 下方内容区域 -->
                        <div style="padding-top: 50px; background: #fff;">
                        <!-- 新增：功能导航栏 -->
                        <div style="display: flex; justify-content: space-around; margin-bottom: 20px; padding: 0 10px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px;">
                            <div @click="openPublishMoment" style="display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer;">
                                <div style="width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; color: #333; background: #f5f5f5; border-radius: 8px;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </div>
                                <span style="font-size: 12px; color: #333;">说说</span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; opacity: 0.5;">
                                <div style="width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; color: #333; background: #f5f5f5; border-radius: 8px;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <span style="font-size: 12px; color: #333;">日志</span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; opacity: 0.5;">
                                <div style="width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; color: #333; background: #f5f5f5; border-radius: 8px;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                </div>
                                <span style="font-size: 12px; color: #333;">留言</span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; opacity: 0.5;">
                                <div style="width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; color: #333; background: #f5f5f5; border-radius: 8px;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                </div>
                                <span style="font-size: 12px; color: #333;">更多</span>
                            </div>
                        </div>
                        
                        <!-- 说说列表 -->
                        <div v-if="qqData.momentsList && qqData.momentsList.length > 0" style="padding: 0 15px;">
                            <div v-for="moment in qqData.momentsList" :key="moment.id" style="padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
                                <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                                    <div :style="{ backgroundImage: qqData.selfAvatar ? 'url(' + qqData.selfAvatar + ')' : 'none' }" style="width: 40px; height: 40px; border-radius: 50%; background-color: #eee; margin-right: 10px; background-size: cover; background-position: center;"></div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; color: #586b95;">{{ qqData.selfName || '我' }}</div>
                                        <div style="font-size: 12px; color: #999;">{{ moment.time }}</div>
                                    </div>
                                    <!-- 新增：说说操作菜单 -->
                                    <div style="position: relative;">
                                        <div @click.stop="toggleMomentMenu(moment.id)" style="cursor: pointer; padding: 5px; color: #888;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                        </div>
                                        <div v-if="activeMomentMenu === moment.id" style="position: absolute; right: 0; top: 30px; background: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; overflow: hidden;">
                                            <div @click="deleteMoment(moment.id)" style="padding: 8px 15px; font-size: 14px; color: #ff3b30; cursor: pointer; white-space: nowrap;">删除</div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="moment.content" style="margin-bottom: 8px; white-space: pre-wrap; line-height: 1.6;">{{ moment.content }}</div>
                                <div v-if="moment.images && moment.images.length > 0" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 8px;">
                                    <div v-for="(img, idx) in moment.images" :key="idx" style="padding-top: 100%; position: relative; background-color: #eee; border-radius: 4px; overflow: hidden;">
                                        <img :src="img" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
                                    </div>
                                </div>
                                <div v-if="moment.location" style="font-size: 12px; color: #586b95; margin-bottom: 5px;">📍 {{ moment.location }}</div>
                                <div v-if="moment.mentions && moment.mentions.length > 0" style="font-size: 13px; color: #586b95; background: #f0f2f5; padding: 5px 8px; border-radius: 4px; margin-bottom: 10px;">
                                    @ {{ moment.mentions.map(m => m.name).join(', ') }}
                                </div>

                                <!-- 新增：点赞和转发按钮 -->
                                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 15px; margin-bottom: 10px;">
                                    <div @click="toggleLike(moment)" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #586b95;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                        </svg>
                                        <span>{{ moment.likes.length > 0 ? moment.likes.length : '点赞' }}</span>
                                    </div>
                                    <div @click="forwardMoment(moment)" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #586b95;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                        <span>转发</span>
                                    </div>
                                </div>

                                <!-- 新增：点赞和评论区 -->
                                <div style="background: #f7f7f7; border-radius: 4px; padding: 8px 12px;">
                                    <!-- 点赞列表 -->
                                    <div v-if="moment.likes.length > 0" style="padding-bottom: 8px; border-bottom: 1px solid #eee; margin-bottom: 8px; font-size: 14px; color: #586b95; display: flex; align-items: center; flex-wrap: wrap;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; transform: translateY(1px); flex-shrink: 0;">
                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                        </svg>
                                        <span>{{ moment.likes.join(', ') }}</span>
                                    </div>
                                    <!-- 评论列表 -->
                                    <div v-if="moment.comments.length > 0" style="display: flex; flex-direction: column; gap: 5px; font-size: 14px; margin-bottom: 10px;">
                                        <div v-for="comment in moment.comments" :key="comment.id">
                                            <strong style="color: #586b95;">{{ qqData.selfName || '我' }}: </strong>
                                            <span>{{ comment.content }}</span>
                                        </div>
                                    </div>
                                    <!-- 评论输入框 -->
                                    <div style="display: flex; gap: 8px;">
                                        <input type="text" v-model="moment.tempComment" @keyup.enter="submitComment(moment)" placeholder="发表评论..." style="flex: 1; border: 1px solid #ddd; border-radius: 15px; padding: 6px 12px; font-size: 14px; background: #fff;">
                                        <button @click="submitComment(moment)" :disabled="!moment.tempComment.trim()" :style="{ border: 'none', background: moment.tempComment.trim() ? 'var(--accent-color)' : '#dcdcdc', color: 'white', borderRadius: '15px', padding: '6px 12px', fontSize: '14px' }">发送</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div v-else style="text-align: center; color: #999; font-size: 14px; margin-top: 40px;">
                             还没有动态，点击上方“说说”发布第一条吧！
                         </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="qq-tab-bar" style="height: 55px; border-top: 1px solid #ddd; display: flex; background: #f9f9f9;">
                <div class="qq-tab-item" :class="{ active: activeTab === 'msg' }" @click="activeTab = 'msg'" 
                     style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
                    <span style="font-size: 20px;">💬</span>
                    <span style="font-size: 12px; margin-top: 2px;">消息</span>
                </div>
                <div class="qq-tab-item" :class="{ active: activeTab === 'moments' }" @click="activeTab = 'moments'"
                     style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
                    <span style="font-size: 20px;">✨</span>
                    <span style="font-size: 12px; margin-top: 2px;">动态</span>
                </div>
            </div>
        </div>

        <!-- 聊天详情页 -->
        <div v-else class="chat-container" style="height:100%; position:relative;">
            <div class="app-header" style="height: calc(60px + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top); margin-top: 0; align-items: center; position: relative; justify-content: center;">
                <div class="app-header-left" @click="qqData.currentChatId = null" style="position: absolute; left: 10px; z-index: 10; display:flex; align-items:center;">
                    <span style="font-size: 24px; margin-right: 2px; margin-bottom: 2px;">‹</span> <span style="font-size: 16px;">消息</span>
                </div>
                <div class="app-header-title" style="width: 60%; text-align: center; position: absolute; left: 0; right: 0; margin-left: auto; margin-right: auto; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                    <span v-if="qqData.isSending && qqData.sendingChatId === getCurrentChat().id" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; line-height: 1.2; color: #888; font-style: italic;">
                        对方正在输入中...
                    </span>
                    <span v-else style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; line-height: 1.2;">
                        {{ getCurrentChat().remark || getCurrentChat().name }}
                    </span>
                    
                    <div style="display: flex; align-items: center; margin-top: 2px;">
                        <div :style="{
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            marginRight: '4px',
                            background: getCurrentChat().status === 'busy' ? '#ff3b30' : (getCurrentChat().status === 'offline' ? '#8e8e93' : '#34c759')
                        }"></div>
                        <span style="font-size: 10px; color: #888;">
                            {{ getCurrentChat().status === 'busy' ? '忙碌' : (getCurrentChat().status === 'offline' ? '离线' : '在线') }}
                        </span>
                    </div>
                </div>
                <!-- ✅ 新增：粉色愛心按鈕（齒輪左側） -->
                <div style="position: absolute; right: 54px; z-index: 11;">
                    <button @click.stop="openHeartModal" title="心聲" style="width:28px; height:28px; border-radius:50%; border:none; background: linear-gradient(135deg,#ff9ac2,#ff6fa3); display:flex; align-items:center; justify-content:center; box-shadow:0 1px 6px rgba(255,102,170,0.18);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.1 21.35l-1.1-1.02C5.14 15.24 2 12.39 2 8.99 2 6.42 4.24 4.5 6.76 4.5c1.54 0 3.04.99 3.74 2.44.7-1.45 2.2-2.44 3.74-2.44C19.76 4.5 22 6.42 22 8.99c0 3.4-3.14 6.25-8.99 11.34l-1.01 1.02z"/>
                        </svg>
                    </button>
                </div>
                <div class="app-header-close" @click="openQQSettings" style="font-size: 25px; position: absolute; right: 15px; z-index: 10;">
                    ⚙️
                    <div v-if="showSummaryAlert" style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: red; border-radius: 50%; border: 1px solid white;"></div>
                </div>
            </div>

            <div class="chat-scroll-area" ref="chatContainer" style="padding-bottom: 10px; position: relative;" :style="{ backgroundImage: getCurrentChat().backgroundUrl ? 'url(' + getCurrentChat().backgroundUrl + ')' : (qqData.universalWallpaper ? 'url(' + qqData.universalWallpaper + ')' : 'none'), backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }">
                <!-- ✅ 动态注入当前聊天的自定义CSS，使用 scoped 属性确保样式隔离 -->
                <component :is="'style'" v-if="getCurrentChat().customCSS">{{ getCurrentChat().customCSS }}</component>
                
                <template v-for="(msg, index) in getCurrentChat().messages" :key="index">
                    <!-- 时间气泡 -->
                    <div v-if="msg.showTime" style="width: 100%; text-align: center; margin: 20px 0 10px;">
                        <span style="background: #cacaca; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px;">{{ msg.timeDisplay }}</span>
                    </div>

                    <div class="chat-row"
                        style="display:flex; width: 100%; margin-bottom: 6px; align-items: flex-start; position: relative;"
                        :style="{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }"
                        @click="toggleSelectMsg(index)"
                    >
                        <!-- 多选框 -->
                    <div v-if="isMultiSelectMode" 
                         style="margin-top: 10px; display: flex; align-items: center;"
                         :style="{ marginLeft: msg.role === 'user' ? '8px' : '0', marginRight: msg.role === 'user' ? '0' : '8px' }"
                    >
                         <div :style="{
                             width: '20px', height: '20px', borderRadius: '50%',
                             border: selectedMsgIndices.has(index) ? 'none' : '2px solid #ccc',
                             background: selectedMsgIndices.has(index) ? 'var(--accent-color)' : 'transparent',
                             display: 'flex', alignItems: 'center', justifyContent: 'center'
                         }">
                            <span v-if="selectedMsgIndices.has(index)" style="color:white; font-size:12px;">✓</span>
                         </div>
                    </div>

                    <!-- 撤回消息 -->
                    <div v-if="msg.isRetracted"
                         style="width: 100%; text-align: center; margin: 5px 0;"
                         @touchstart="handleMsgTouchStart($event, index)"
                         @touchend="handleMsgTouchEnd"
                         @touchcancel="handleMsgTouchEnd"
                         @contextmenu.prevent="showContextMenu($event, index)"
                    >
                        <span style="background: #e0e0e0; color: #888; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                            {{ msg.role === 'user' ? '我' : (getCurrentChat().remark || getCurrentChat().name) }} 撤回了一则消息
                        </span>
                    </div>

                    <!-- 语音消息 (展开式) -->
                    <div v-else-if="msg.type === 'voice'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                 @touchstart="handleMsgTouchStart($event, index)"
                                 @touchend="handleMsgTouchEnd"
                                 @touchcancel="handleMsgTouchEnd"
                                 @contextmenu.prevent="showContextMenu($event, index)"
                                 @click="toggleVoiceText(msg)"
                                 style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; display: flex; flex-direction: column; min-width: 60px; padding: 10px 12px;"
                                 :style="{ width: (msg.isVoiceTextVisible ? 'auto' : (60 + msg.duration * 5) + 'px'), maxWidth: '240px' }"
                            >
                                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                    <template v-if="msg.role !== 'user'">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(180deg);">
                                            <path d="M12 4L12 20M8 7L8 17M4 10L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                            <path d="M16 6c1.5 0 3 2 3 6s-1.5 6-3 6" stroke="currentColor" stroke-width="2" fill="none" />
                                            <path d="M20 3c2.5 0 5 3 5 9s-2.5 9-5 9" stroke="currentColor" stroke-width="2" fill="none" />
                                        </svg>
                                        <span :style="{ fontSize: (getCurrentChat().fontSize || 16) + 'px' }" style="font-weight: bold; margin-left: 5px;">{{ msg.duration }}"</span>
                                    </template>
                                    <template v-else>
                                        <span :style="{ fontSize: (getCurrentChat().fontSize || 16) + 'px' }" style="font-weight: bold; margin-right: 5px;">{{ msg.duration }}"</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 6c1.5 0 3 2 3 6s-1.5 6-3 6" stroke="currentColor" stroke-width="2" fill="none" />
                                            <path d="M-1 3c2.5 0 5 3 5 9s-2.5 9-5 9" stroke="currentColor" stroke-width="2" fill="none" />
                                            <path d="M3 12a3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3" fill="currentColor" />
                                        </svg>
                                    </template>
                                </div>
                                <div v-if="msg.isVoiceTextVisible" 
                                     :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 14 / 16) + 'px' }"
                                     style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); text-align: left; line-height: 1.4; white-space: pre-wrap; word-break: break-all;">
                                    {{ msg.voiceText }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 红包 (Ins风) -->
                    <div v-else-if="msg.type === 'redpacket'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                 @touchstart="handleMsgTouchStart($event, index)"
                                 @touchend="handleMsgTouchEnd"
                                 @contextmenu.prevent="showContextMenu($event, index)"
                                 style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; background: linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%); border: none; overflow: hidden; width: 220px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"
                            >
                                <div style="padding: 20px 15px; display: flex; align-items: center;">
                                    <div style="font-size: 28px; margin-right: 12px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));">🍬</div>
                                <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 15 / 16) + 'px' }" style="color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">{{ msg.packetText }}</div>
                                </div>
                                <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 10 / 16) + 'px' }" style="background: rgba(255,255,255,0.3); padding: 0; color: white; text-align: left; height: 4px;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 转账 (Ins风) -->
                    <div v-else-if="msg.type === 'transfer'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                 @touchstart="handleMsgTouchStart($event, index)"
                                 @touchend="handleMsgTouchEnd"
                                 @contextmenu.prevent="showContextMenu($event, index)"
                                 style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); border: none; overflow: hidden; width: 220px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"
                            >
                                <div style="padding: 20px 15px; display: flex; align-items: center;">
                                    <div style="width: 38px; height: 38px; background: rgba(255,255,255,0.3); border-radius: 50%; display: flex; justify-content: center; align-items: center; margin-right: 12px; color: white;">
                                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    </div>
                                    <div style="color: white; display: flex; flex-direction: column; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                                        <span :style="{ fontSize: (getCurrentChat().fontSize || 16) + 'px' }" style="font-weight: bold;">¥ {{ msg.amount }}</span>
                                        <span :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="opacity: 0.9; margin-top: 2px;">转账给你</span>
                                    </div>
                                </div>
                                <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 10 / 16) + 'px' }" style="background: rgba(255,255,255,0.3); padding: 0; color: white; text-align: left; height: 4px;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 表情包 (纯图片，无背景) -->
                    <div v-else-if="msg.type === 'sticker'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                 @touchstart="handleMsgTouchStart($event, index)"
                                 @touchend="handleMsgTouchEnd"
                                 @contextmenu.prevent="showContextMenu($event, index)"
                                 style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; background: transparent; border: none; overflow: hidden;"
                            >
                                <img :src="msg.src" style="max-width: 120px; max-height: 120px; display: block; border-radius: 4px;">
                            </div>
                        </div>
                    </div>

                    <!-- 图片 (描述卡片) -->
                    <div v-else-if="msg.type === 'image'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                 @touchstart="handleMsgTouchStart($event, index)"
                                 @touchend="handleMsgTouchEnd"
                                 @contextmenu.prevent="showContextMenu($event, index)"
                                 style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; background: transparent; border: none; overflow: hidden;"
                            >
                                <img v-if="msg.imgType === 'local'" :src="msg.src" style="max-width: 150px; max-height: 200px; border-radius: 8px; display: block;">
                                <div v-else 
                                     @click.stop="openTextViewer(msg.description)"
                                     @touchstart.stop
                                     @touchend.stop="openTextViewer(msg.description)"
                                     style="background: #f2f2f2; border-radius: 8px; width: 140px; height: 140px; display: flex; justify-content: center; align-items: center; cursor: pointer; border: 1px solid #e0e0e0; transition: background 0.2s;"
                                     @mouseenter="$event.target.style.background='#e8e8e8'"
                                     @mouseleave="$event.target.style.background='#f2f2f2'"
                                >
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 位置 -->
                    <div v-else-if="msg.type === 'location'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                 @touchstart="handleMsgTouchStart($event, index)"
                                 @touchend="handleMsgTouchEnd"
                                 @contextmenu.prevent="showContextMenu($event, index)"
                                 style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; background: white; border: 1px solid #ddd; overflow: hidden; width: 220px; border-radius: 8px;"
                            >
                                <div style="height: 100px; position: relative; background-color: #f2f1ed; background-image: linear-gradient(#dcdcdc 1px, transparent 1px), linear-gradient(90deg, #dcdcdc 1px, transparent 1px); background-size: 20px 20px;">
                                    <div style="position: absolute; top: 30%; left: 0; width: 100%; height: 15px; background: #aadaff; transform: rotate(-5deg);"></div>
                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%); font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
                                        📍
                                    </div>
                                </div>
                                <div style="padding: 10px;">
                                    <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 14 / 16) + 'px' }" style="font-weight: bold; margin-bottom: 4px; color: #000;">{{ msg.locEnd }}</div>
                                    <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #888;">
                                        {{ msg.locStart }} -> {{ msg.locVia ? msg.locVia + ' -> ' : '' }}{{ msg.locEnd }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 链接消息 -->
                    <div v-else-if="msg.type === 'link'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <div class="chat-bubble"
                                @touchstart="handleMsgTouchStart($event, index)"
                                @touchend="handleMsgTouchEnd"
                                @contextmenu.prevent="showContextMenu($event, index)"
                                @click.stop="openLinkViewer(msg)"
                                style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; overflow: hidden; background: white; border: 1px solid #ddd; width: 230px; cursor: pointer;"
                            >
                                <div style="padding: 12px; display: flex; align-items: center;">
                                    <div style="flex: 1; overflow: hidden;">
                                        <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 14 / 16) + 'px' }" style="font-weight: bold; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            {{ msg.linkData.title }}
                                        </div>
                                        <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 12 / 16) + 'px' }" style="color: #888; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            {{ msg.linkData.content }}
                                        </div>
                                    </div>
                                    <div style="margin-left: 12px; font-size: 32px;">
                                        🔗
                                    </div>
                                </div>
                                <div v-if="msg.linkData.source" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 10 / 16) + 'px' }" style="padding: 5px 12px; border-top: 1px solid #eee; color: #aaa;">
                                    来源: {{ msg.linkData.source }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 转发消息 -->
                    <div v-else-if="msg.type === 'forwarded'" class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="max-width: 70%;">
                         <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + msg.avatar + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', flexShrink: 0, marginRight: '10px' }"></div>
                         <div class="chat-bubble"
                             @touchstart="handleMsgTouchStart($event, index)"
                             @touchend="handleMsgTouchEnd"
                             @contextmenu.prevent="showContextMenu($event, index)"
                             @click.stop="openForwardViewer(msg)"
                             style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none; padding: 0; overflow: hidden; background: white; border: 1px solid #ddd; width: 220px;"
                         >
                            <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 14 / 16) + 'px' }" style="padding: 8px 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #000;">
                                {{ msg.forwardData.title }}
                            </div>
                            <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 12 / 16) + 'px' }" style="padding: 8px 10px; color: #888; line-height: 1.5;">
                                <div v-for="(subMsg, idx) in msg.forwardData.list.slice(0, 3)" :key="idx" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    {{ subMsg.name }}: {{ subMsg.content }}
                                </div>
                                <div v-if="msg.forwardData.list.length > 3">...</div>
                            </div>
                            <div :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 10 / 16) + 'px' }" style="padding: 5px 10px; border-top: 1px solid #eee; color: #aaa;">
                                聊天记录
                            </div>
                         </div>
                    </div>

                    <!-- 正常文字 -->
                    <div v-else class="chat-message" :class="msg.role === 'user' ? 'me' : 'ai'" style="position: relative;">
                        <div class="chat-avatar-small" :class="msg.role === 'user' ? getCurrentChat().userAvatarFrame : getCurrentChat().aiAvatarFrame" :style="{ backgroundImage: 'url(' + (msg.role === 'user' ? getCurrentChat().userAvatar : getCurrentChat().avatar) + ')', width: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px', height: ((getCurrentChat().fontSize || 16) * 36 / 16) + 'px' }"></div>
                        <div style="display:flex; align-items:flex-end; gap:6px;" :style="{ flexDirection: msg.role === 'user' ? 'row' : 'row-reverse' }">
                            <div v-if="msg.time" :style="{ fontSize: ((getCurrentChat().fontSize || 16) * 11 / 16) + 'px' }" style="color: #999; white-space:nowrap; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">{{ msg.time }}</div>
                            <!-- ✅ 添加 message-bubble 类和 content 子元素以支持CSS自定义 -->
                            <div :class="['message-bubble', msg.role === 'user' ? 'user' : 'ai']">
                                <div class="content"
                                     @touchstart="handleMsgTouchStart($event, index)"
                                     @touchend="handleMsgTouchEnd"
                                     @touchcancel="handleMsgTouchEnd"
                                     @contextmenu.prevent="showContextMenu($event, index)"
                                     :style="!getCurrentChat().customCSS ? (msg.role === 'user' ? 'background: #0099FF; color: #fff; padding: ' + ((getCurrentChat().fontSize || 16) * 10 / 16) + 'px ' + ((getCurrentChat().fontSize || 16) * 14 / 16) + 'px; border-radius: 8px; font-size: ' + (getCurrentChat().fontSize || 16) + 'px; line-height: 1.4; word-break: break-word; max-width: 100%;' : 'background: #fff; color: #000; padding: ' + ((getCurrentChat().fontSize || 16) * 10 / 16) + 'px ' + ((getCurrentChat().fontSize || 16) * 14 / 16) + 'px; border-radius: 8px; font-size: ' + (getCurrentChat().fontSize || 16) + 'px; line-height: 1.4; word-break: break-word; max-width: 100%;') : 'font-size: ' + (getCurrentChat().fontSize || 16) + 'px; line-height: 1.4; word-break: break-word; max-width: 100%;'"

                                     style="-webkit-touch-callout: none; -webkit-user-select: none; user-select: none;"
                                >{{ msg.content }}</div>
                            </div>
                        </div>
                    </div>
                    </div>
                </template>

            </div>

            <!-- 底部工具栏 -->
            <div v-if="isMultiSelectMode" class="chat-input-bar" style="justify-content: space-around; background: #f7f7f7;">
                <button @click="openForwardModal" :disabled="selectedMsgIndices.size === 0" style="background:none; border:none; color:#007aff; display:flex; flex-direction:column; align-items:center;">
                    <span style="font-size:20px;">↪️</span>
                    <span style="font-size:12px; margin-top: 2px;">转发</span>
                </button>
                <button @click="deleteSelectedMessages" :disabled="selectedMsgIndices.size === 0" style="background:none; border:none; color:#ff3b30; display:flex; flex-direction:column; align-items:center;">
                    <span style="font-size:20px;">🗑️</span>
                    <span style="font-size:12px; margin-top: 2px;">删除</span>
                </button>
                <button @click="exitMultiSelectMode" style="background:none; border:none; color:#666; display:flex; flex-direction:column; align-items:center;">
                    <span style="font-size:20px;">✖️</span>
                    <span style="font-size:12px; margin-top: 2px;">取消</span>
                </button>
            </div>

            <div v-else style="display: flex; flex-direction: column;">
                <div style="height: 50px; background: #f5f5f7; border-top: 1px solid #eee; display: flex; align-items: center; overflow-x: auto; white-space: nowrap; padding: 0 10px; gap: 12px; position: relative;" class="scrollbar-hide">
                    
                    <button v-if="canReroll" @click="handleReroll" title="重Roll" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                    <button @click="triggerAIResponse" :disabled="qqData.isSending" title="推进剧情" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
                    </button>

                    <div style="width: 2px; height: 36px; background: rgba(0,0,0,0.12); margin: 0 14px; align-self: center; border-radius:2px; box-shadow: 0 0 0 1px rgba(255,255,255,0.02) inset;"></div>

                    <!-- 表情包按钮 - 改用SVG -->
                    <button @click="isUserStickerPickerOpen = true" title="用户表情包" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                    </button>

                    <button @click="openRedPacketModal('redpacket')" title="红包" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa9d3b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><line x1="12" y1="5" x2="12" y2="19"></line><path d="M12 9a4 4 0 0 1 0 6"></path></svg>
                    </button>
                    <button @click="openRedPacketModal('transfer')" title="转账" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f79c1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    </button>
                    <button @click="sendVoice" title="语音" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    </button>
                    
                    <!-- 文本描述图片 -->
                    <button @click="sendTextImage" title="文本图片" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9933ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="19" x2="12" y2="12"></line>
                            <line x1="9" y1="16" x2="15" y2="16"></line>
                        </svg>
                    </button>

                    <!-- 本地上传图片 -->
                    <button @click="triggerImageUpload" title="本地图片" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </button>

                    <button @click="openLocationModal" title="位置" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </button>

                    <button @click="openLinkModal" title="链接" style="flex-shrink:0; width:32px; height:32px; background:white; border-radius:50%; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                    </button>
                </div>
                <div class="chat-input-bar" style="align-items: flex-end; padding-top: 8px; padding-bottom: 8px;">
                    <textarea ref="chatInputRef" class="chat-input" v-model="qqData.inputMsg" @keypress.enter="sendUserMessage" placeholder="发消息..." :disabled="qqData.isSending" rows="1" style="resize: none; min-height: 36px; max-height: 120px; padding: 8px 10px; border-radius: 18px; line-height: 20px; overflow-y: auto;"></textarea>
                    <button class="chat-send-btn" @click="sendUserMessage(null)" :disabled="!qqData.inputMsg.trim()" :style="{ height: '36px', marginBottom: '0', background: qqData.inputMsg.trim() ? 'var(--accent-color)' : null, color: qqData.inputMsg.trim() ? 'white' : null }">发送</button>
                </div>
            </div>
        </div>

        <!-- ❤️ 心声中间长窗口 Modal（居中、较高，无入场动画） -->
        <div v-if="isHeartModalOpen" class="modal-overlay" style="z-index:2700; display:flex; align-items:center; justify-content:center; animation:none !important; transition:none !important;" @click.self="isHeartModalOpen = false">
            <div class="modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); transform-origin: center center; animation: none !important; transition: none !important; width: 82%; max-width: 900px; height: 82vh; background: white; border-radius: 12px; padding: 20px; display:flex; flex-direction:column; overflow-y:auto; box-shadow: 0 20px 60px rgba(0,0,0,0.32);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight: bold; font-size: 18px;">角色心声</div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button @click.stop="isHeartHistoryOpen = true" style="font-size:13px; border:none; background:none; color:var(--accent-color);">历史心声</button>
                        <button @click="isHeartModalOpen = false" style="font-size:13px; border:none; background:none; color:#666;">关闭</button>
                    </div>
                </div>
                <div style="margin-top:14px; display:flex; flex-direction:column; gap:12px;">
                    <template v-if="getCurrentChat().heartThoughts && getCurrentChat().heartThoughts.length > 0">
                        <div v-for="(key, idx) in ['clothing','behavior','thought','evil']" :key="key" 
                             :style="{ background: heartStyles[key].bg, border: '1px solid ' + heartStyles[key].border, padding:'14px', borderRadius:'10px' }">
                            <div :style="{ fontSize:'13px', color: heartStyles[key].title, fontWeight:'700', marginBottom:'6px' }">
                                {{ heartStyles[key].label }}
                            </div>
                            <div style="font-size:15px; color:#333; line-height:1.7; white-space:pre-wrap;">
                                {{ (getCurrentChat().heartThoughts[currentHeartIndex] && getCurrentChat().heartThoughts[currentHeartIndex].data && getCurrentChat().heartThoughts[currentHeartIndex].data[key]) || '暂无内容' }}
                            </div>
                        </div>
                        <div style="font-size:12px; color:#999; text-align:right;">生成时间：{{ getCurrentChat().heartThoughts[currentHeartIndex].time }}</div>
                    </template>
                    <template v-else>
                        <div style="text-align:center; color:#999; padding:20px;">尚未生成心声，对方回复后会自动生成。</div>
                    </template>
                </div>
            </div>
        </div>

        <!-- 历史心声（居中、长窗口、无入场动画） -->
        <div v-if="isHeartHistoryOpen" class="modal-overlay" style="z-index:2750; display:flex; align-items:center; justify-content:center; animation:none !important; transition:none !important;" @click.self="isHeartHistoryOpen = false">
            <div class="modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); transform-origin: center center; animation: none !important; transition: none !important; width: 82%; max-width: 900px; height: 82vh; background: white; border-radius: 12px; padding: 20px; overflow-y:auto; box-shadow: 0 20px 60px rgba(0,0,0,0.32);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:700;">历史心声</div>
                    <button @click="isHeartHistoryOpen = false" style="border:none; background:none; color:#666;">关闭</button>
                </div>
                <div v-if="getCurrentChat().heartThoughts && getCurrentChat().heartThoughts.length > 0" style="display:flex; flex-direction:column; gap:8px;">
                    <div v-for="(h, idx) in getCurrentChat().heartThoughts" :key="h.id || idx" style="border:1px solid #f0f0f0; padding:10px; border-radius:8px; background:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-size:12px; color:#999;">{{ h.time }}</div>
                            <div>
                                <button @click="deleteHeartEntry(getCurrentChat(), idx)" style="border:none; background:none; color:#ff3b30; font-size:13px;">删除</button>
                                <button @click="viewHeartAtIndex(idx)" style="border:none; background:none; color:#007aff; font-size:13px;">查看</button>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px; margin-top:8px; flex-direction:column;">
                            <div style="font-size:13px;"><strong>衣着：</strong>{{ h.data.clothing }}</div>
                            <div style="font-size:13px;"><strong>行为：</strong>{{ h.data.behavior }}</div>
                            <div style="font-size:13px;"><strong>心声：</strong>{{ h.data.thought }}</div>
                            <div style="font-size:13px;"><strong>坏心思：</strong>{{ h.data.evil }}</div>
                        </div>
                    </div>
                </div>
                <div v-else style="text-align:center; color:#999; padding:20px;">暂无历史心声</div>
            </div>
        </div>

        <!-- 红包/转账 Modal (Ins风) -->
        <div class="modal-overlay" v-if="isRedPacketModalOpen" style="z-index: 2400;" @click.self="isRedPacketModalOpen = false">
            <div class="modal-content" style="width: 300px; border-radius: 20px; padding: 0; overflow:hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <div style="padding: 25px 20px; text-align: center;" :style="{ background: redPacketForm.type === 'redpacket' ? 'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)' : 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }">
                    <div v-if="redPacketForm.type === 'redpacket'" style="font-size: 40px; line-height: 1;">🍬</div>
                    <div v-else style="font-size: 40px; line-height: 1;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    </div>
                    <div style="font-size: 18px; font-weight: bold; color: white; margin-top: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">{{ redPacketForm.type === 'redpacket' ? '发送一个甜甜的红包' : '向好友转账' }}</div>
                </div>
                <div style="background: #ffffff; padding: 20px 25px 25px;">
                     <div style="margin-bottom: 15px; position: relative;">
                        <span style="position: absolute; left: 15px; top: 11px; font-size: 18px; color: #aaa;">¥</span>
                        <input type="number" v-model="redPacketForm.amount" placeholder="0.00" style="width: 100%; padding: 12px 15px 12px 35px; border: 1px solid #eee; border-radius: 12px; font-size: 20px; font-weight: bold; background: #f9f9f9; text-align: center;">
                     </div>
                     <div style="margin-bottom: 20px;">
                        <input type="text" v-model="redPacketForm.text" :placeholder="redPacketForm.type === 'redpacket' ? '恭喜发财，大吉大利' : '转账说明'" style="width: 100%; padding: 12px 15px; border: 1px solid #eee; border-radius: 12px; font-size: 14px; background: #f9f9f9;">
                     </div>
                     <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button @click="isRedPacketModalOpen = false" style="flex: 1; padding: 12px; border: 1px solid #eee; background: #f9f9f9; border-radius: 12px; color: #888; font-weight: bold;">取消</button>
                        <button @click="confirmRedPacket" :style="{ background: redPacketForm.type === 'redpacket' ? 'linear-gradient(135deg, #ffafbd, #ffc3a0)' : 'linear-gradient(135deg, #c2e9fb, #a1c4fd)' }" style="flex: 1; padding: 12px; border: none; color: white; border-radius: 12px; font-weight: bold;">发送</button>
                     </div>
                </div>
            </div>
        </div>

        <!-- 链接输入 Modal -->
        <div class="modal-overlay" v-if="isLinkModalOpen" style="z-index: 2350;" @click.self="isLinkModalOpen = false">
            <div class="modal-content">
                <div class="modal-title">分享链接</div>
                <div class="input-row"><span class="input-label">标题</span><input type="text" class="modal-input" v-model="linkForm.title" placeholder="链接标题 (可选)"></div>
                <div class="input-row"><span class="input-label">来源</span><input type="text" class="modal-input" v-model="linkForm.source" placeholder="例如：微博、B站 (可选)"></div>
                <div class="input-row" style="flex-direction: column; align-items: flex-start;">
                    <span class="input-label" style="margin-bottom: 5px;">内容</span>
                    <textarea class="qq-textarea" v-model="linkForm.content" placeholder="必填，粘贴或输入内容" style="height: 120px;"></textarea>
                </div>
                <div style="display:flex; gap:10px; margin-top: 15px;">
                     <button class="modal-btn cancel" @click="isLinkModalOpen = false">取消</button>
                     <button class="modal-btn" @click="sendLink" style="color: var(--accent-color);">发送</button>
                </div>
            </div>
        </div>

        <!-- 位置输入 Modal -->
        <div class="modal-overlay" v-if="isLocationModalOpen" style="z-index: 2300;" @click.self="isLocationModalOpen = false">
            <div class="modal-content">
                <div class="modal-title">发送位置</div>
                <div style="background: #f0f4f7; border-radius: 8px; padding: 20px 10px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; position: relative;">
                    <div style="position: absolute; left: 30px; right: 30px; top: 30px; height: 2px; background: #dcdcdc; z-index: 0;"></div>
                    <div style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 33%;">
                        <div style="width: 12px; height: 12px; background: #34c759; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
                        <span style="font-size:10px; color:#666; margin-top: 8px;">{{ locationForm.start || '起点' }}</span>
                    </div>
                    <div style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 33%;">
                        <div :style="{ background: locationForm.via ? '#007aff' : '#dcdcdc' }" style="width: 8px; height: 8px; border-radius: 50%; border: 2px solid white;"></div>
                        <span style="font-size:10px; color:#666; margin-top: 10px;">{{ locationForm.via || '途经' }}</span>
                    </div>
                    <div style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 33%;">
                        <div style="font-size: 16px; margin-top: -6px;">📍</div>
                        <span style="font-size:10px; color:#ff3b30; margin-top: 4px; font-weight: bold;">{{ locationForm.end || '终点' }}</span>
                    </div>
                </div>
                <div class="input-row"><span class="input-label">当前位置</span><input type="text" class="modal-input" v-model="locationForm.start" placeholder="默认"></div>
                <div class="input-row"><span class="input-label">途经</span><input type="text" class="modal-input" v-model="locationForm.via" placeholder="(可选)"></div>
                <div class="input-row"><span class="input-label">终点</span><input type="text" class="modal-input" v-model="locationForm.end" placeholder="必填"></div>
                <div style="display:flex; gap:10px; margin-top: 15px;">
                     <button class="modal-btn cancel" @click="isLocationModalOpen = false">取消</button>
                     <button class="modal-btn" @click="sendLocation" style="color: var(--accent-color);">发送</button>
                </div>
            </div>
        </div>

        <!-- 聊天设置 -->
        <div class="modal-overlay center-popup" v-if="isQQSettingsOpen" @click.self="isQQSettingsOpen = false">
             <div class="modal-content" style="max-height: 85vh; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 15px; background: white; border-bottom: 1px solid #eee; flex-shrink: 0;">
                    <div class="modal-title" style="margin-bottom: 0;">聊天设置</div>
                    <button @click="saveQQSettings" style="border: none; background: none; color: #34c759; font-weight: bold; font-size: 16px;">保存修改</button>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 20px;">
                <div style="display:flex; justify-content: space-around; width: 100%; margin-bottom: 10px;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div class="qq-setting-avatar" :class="tempQQSettings.aiAvatarFrame" :style="{ backgroundImage: 'url(' + tempQQSettings.avatar + ')' }" @click="triggerAvatarUpload('ai')"></div>
                        <span style="font-size:12px; color:#666;">对方头像</span>
                        <button @click="openFrameModal('ai')" style="margin-top:5px; font-size:12px; border:1px solid #ddd; background:white; padding:2px 8px; border-radius:10px; color:#666;">头像框</button>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div class="qq-setting-avatar" :class="tempQQSettings.userAvatarFrame" :style="{ backgroundImage: 'url(' + tempQQSettings.userAvatar + ')' }" @click="triggerAvatarUpload('user')"></div>
                        <span style="font-size:12px; color:#666;">我的头像</span>
                        <button @click="openFrameModal('user')" style="margin-top:5px; font-size:12px; border:1px solid #ddd; background:white; padding:2px 8px; border-radius:10px; color:#666;">头像框</button>
                    </div>
                </div>
                <div class="input-row"><span class="input-label" style="font-size: 15px; font-weight: bold;">本名</span><input type="text" class="modal-input" v-model="tempQQSettings.name" style="border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);"></div>
                <div class="input-row"><span class="input-label" style="font-size: 15px; font-weight: bold;">备注名</span><input type="text" class="modal-input" v-model="tempQQSettings.remark" style="border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);"></div>
                <div class="input-row"><span class="input-label" style="font-size: 15px; font-weight: bold;">记忆条数</span><input type="number" class="modal-input" v-model.number="tempQQSettings.contextLimit" style="border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);"></div>
                <div class="input-row"><span class="input-label" style="font-size: 15px; font-weight: bold;">对方设定</span><textarea class="qq-textarea" v-model="tempQQSettings.aiPersona" style="border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);"></textarea></div>
                <div class="input-row"><span class="input-label" style="font-size: 15px; font-weight: bold;">我的设定</span><textarea class="qq-textarea" v-model="tempQQSettings.userPersona" style="border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);"></textarea></div>
                
                <!-- 世界书选择 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="font-weight:bold; font-size:15px; margin-bottom:10px;">世界书</div>
                    
                    <!-- 下拉触发条 -->
                    <div @click="isWorldbookDropdownOpen = !isWorldbookDropdownOpen" 
                         style="background: #fff; border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow); padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                        <span style="font-size: 14px; color: #333;">
                            {{ tempQQSettings.selectedWorldbooks && tempQQSettings.selectedWorldbooks.length > 0 
                               ? '已选择 ' + tempQQSettings.selectedWorldbooks.length + ' 本世界书' 
                               : ' 点击选择 ' }}
                        </span>
                        <span style="font-size: 12px; color: #999; transition: transform 0.3s;" :style="{ transform: isWorldbookDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }">▼</span>
                    </div>

                    <!-- 下拉列表 -->
                    <div v-if="isWorldbookDropdownOpen" style="background: #f9f9f9; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; padding: 10px; max-height: 150px; overflow-y: auto; margin-top: -2px; position: relative; z-index: 10;">
                        <div v-if="availableWorldbooks.length === 0" style="color: #999; font-size: 12px; text-align: center; padding: 10px;">暂无世界书，请在世界书App中添加</div>
                        <div v-else v-for="book in availableWorldbooks" :key="book.id" style="display: flex; align-items: center; margin-bottom: 8px; padding: 5px; border-radius: 4px;" @click.stop>
                            <input type="checkbox" :id="'wb-'+book.id" :value="book.id" v-model="tempQQSettings.selectedWorldbooks" style="margin-right: 8px;">
                            <label :for="'wb-'+book.id" style="font-size: 14px; color: #333; flex: 1; cursor: pointer;">{{ book.title }}</label>
                        </div>
                    </div>
                </div>

                <!-- AI 表情包入口 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:bold; font-size:15px;">现实时间感知</span>
                        <div @click="tempQQSettings.timeAware = !tempQQSettings.timeAware"
                             :style="{ 
                                 width: '40px', height: '22px', borderRadius: '11px', 
                                 background: tempQQSettings.timeAware ? '#34c759' : '#e9e9eb',
                                 position: 'relative', transition: '0.3s', cursor: 'pointer'
                             }">
                             <div :style="{
                                 width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                 position: 'absolute', top: '2px', left: tempQQSettings.timeAware ? '20px' : '2px',
                                 transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                             }"></div>
                        </div>
                    </div>
                    <div v-if="tempQQSettings.timeAware" style="margin-bottom:8px;">
                        <div style="font-size:12px; color:#666; margin-bottom:6px;">可自定义时间（留空使用当前本地时间）</div>
                        <input type="datetime-local" v-model="tempQQSettings.timeOverride" style="display:block; width:100%; height:40px; margin:0; padding:8px; border:1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow); border-radius:6px; box-sizing: border-box; -webkit-appearance: none; background: #fff; font-size: 14px;" />
                    </div>
                </div>
                <!-- NPC库入口 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-weight:bold; font-size:15px;">NPC库</span>
                    </div>
                    <button class="modal-btn" style="width:100%; font-size:13px; background:#f0f0f0; color:#333; border:1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);" 
                            @click="openNpcManager">
                        管理 NPC 库 ({{ tempQQSettings.npcList ? tempQQSettings.npcList.length : 0 }})
                    </button>
                </div>

                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-weight:bold; font-size:15px;">表情包库配置</span>
                    </div>
                    <button class="modal-btn" style="width:100%; font-size:13px; background:#f0f0f0; color:#333; border:1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);" 
                            @click="isStickerSettingsOpen = true">
                        管理 AI 表情包 ({{ (tempQQSettings.aiExclusiveStickers ? tempQQSettings.aiExclusiveStickers.length : 0) }} 专属 / {{ (qqData.aiGeneralStickers ? qqData.aiGeneralStickers.length : 0) }} 通用)
                    </button>
                </div>

                <!-- 长期记忆总结 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-weight:bold; font-size:15px;">长期记忆总结</span>
                        <div @click="tempQQSettings.enableSummary = !tempQQSettings.enableSummary" 
                             :style="{ 
                                 width: '40px', height: '22px', borderRadius: '11px', 
                                 background: tempQQSettings.enableSummary ? '#34c759' : '#e9e9eb',
                                 position: 'relative', transition: '0.3s', cursor: 'pointer'
                             }">
                             <div :style="{
                                 width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                 position: 'absolute', top: '2px', left: tempQQSettings.enableSummary ? '20px' : '2px',
                                 transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                             }"></div>
                        </div>
                    </div>
                    <div v-if="tempQQSettings.enableSummary" style="background: #f5f5f7; padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);">
                        <div class="input-row" style="margin-bottom:8px;">
                            <span class="input-label" style="width:60px;">模式</span>
                            <div style="flex:1; display:flex; gap:10px;">
                                <label><input type="radio" value="auto" v-model="tempQQSettings.summaryMode"> 自动</label>
                                <label><input type="radio" value="manual" v-model="tempQQSettings.summaryMode"> 手动</label>
                            </div>
                        </div>
                        <div class="input-row">
                            <span class="input-label" style="width:60px;">触发条数</span>
                            <input type="number" class="modal-input" v-model.number="tempQQSettings.summaryTriggerCount" placeholder="20">
                        </div>
                        <div style="margin-top: 8px;">
                            <span class="input-label" style="display:block; margin-bottom:4px;">提示词</span>
                            <textarea class="qq-textarea" v-model="tempQQSettings.summaryPrompt" style="height: 60px;"></textarea>
                        </div>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button class="modal-btn" style="width:100%; font-size:12px; background:#fff; color:var(--accent-color); border:1px solid var(--accent-color);" @click="isSummaryEditOpen = true">
                                查看/管理记忆 ({{ tempQQSettings.memoryList ? tempQQSettings.memoryList.length : 0 }})
                            </button>
                            <button class="modal-btn" style="width:100%; font-size:12px; background:#fff; color:#ff9500; border:1px solid #ff9500;" @click="handleManualSummary">
                                {{ isSummarizing ? '总结中...' : '手动总结' }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 字体大小调整 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="font-weight:bold; font-size:15px; margin-bottom:10px;">字体大小调整</div>
                    <div style="background: #f5f5f7; padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                            <span style="font-size:12px; color:#666; min-width:60px;">字体大小</span>
                            <input 
                                type="range" 
                                :value="tempQQSettings.fontSize || 16" 
                                @input="tempQQSettings.fontSize = parseInt($event.target.value)"
                                min="12" 
                                max="24" 
                                step="1"
                                style="flex:1;"
                            >
                            <span style="font-size:12px; color:#333; min-width:40px; text-align:center; font-weight:bold;">{{ tempQQSettings.fontSize || 16 }}px</span>
                        </div>
                        <div style="font-size: 11px; color: #666;">
                        </div>

                        
                    </div>
                </div>

                <!-- CSS自定义 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="font-weight:bold; font-size:15px; margin-bottom:10px;">CSS 自定义气泡样式</div>
                    <div style="background: #f5f5f7; padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);">
                        <textarea 
                            v-model="tempQQSettings.customCSS" 
                            class="qq-textarea" 
                            placeholder=".message-bubble.user .content {&#10;  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);&#10;  color: white;&#10;}&#10;&#10;.message-bubble.ai .content {&#10;  background: #f0f0f0;&#10;  color: #333;&#10;}"
                            style="height: 120px; font-family: 'Courier New', monospace; font-size: 12px;"
                        ></textarea>
                        <div style="font-size: 11px; color: #666; margin-top: 5px;">
                            提示：使用 .message-bubble.user .content 和 .message-bubble.ai .content 来自定义气泡样式
                        </div>
                        
                        <!-- 实时预览 -->
                        <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 10px; text-align: center;">实时预览</div>
                            <component :is="'style'" v-if="tempQQSettings.customCSS">{{ tempQQSettings.customCSS }}</component>
                            
                            <!-- AI气泡预览 -->
                            <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: #ddd; margin-right: 10px; flex-shrink: 0;"></div>
                                <div class="message-bubble ai">
                                    <div class="content" :style="!tempQQSettings.customCSS ? 'background: white; color: #333; padding: 10px 12px; border-radius: 8px; max-width: 200px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);' : 'padding: 10px 12px; border-radius: 8px; max-width: 200px;'">
                                        这是AI的消息气泡
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 用户气泡预览 -->
                            <div style="display: flex; margin-bottom: 0; align-items: flex-start; flex-direction: row-reverse;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: #ddd; margin-left: 10px; flex-shrink: 0;"></div>
                                <div class="message-bubble user">
                                    <div class="content" :style="!tempQQSettings.customCSS ? 'background: var(--accent-color); color: #333; padding: 10px 12px; border-radius: 8px; max-width: 200px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);' : 'padding: 10px 12px; border-radius: 8px; max-width: 200px;'">
                                        这是用户的消息气泡
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 聊天室背景 -->
                <div style="border-top: 1px solid #eee; margin-top: 15px; padding-top: 10px;">
                    <div style="font-weight:bold; font-size:15px; margin-bottom:10px;">聊天室背景</div>
                    <div style="background: #f5f5f7; padding: 10px; border-radius: 8px; border: 1px solid var(--accent-color); box-shadow: 0 0 4px var(--accent-color-shadow);">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">背景图片链接</div>
                        <input 
                            type="text" 
                            v-model="tempQQSettings.backgroundUrl" 
                            class="modal-input" 
                            placeholder="输入图片URL..."
                        >
                        <div style="font-size: 11px; color: #666; margin-top: 5px;">
                            留空则使用默认背景。
                        </div>
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    <div style="display:flex; gap:10px;">
                        <button class="modal-btn" style="color: #ff9500; flex:1;" @click="clearChatHistory">清空记录</button>
                        <button class="modal-btn" style="color: #ff3b30; flex:1;" @click="deleteCurrentChat">删除好友</button>
                    </div>
                </div>
                </div>
             </div>
        </div>
        
        <!-- AI 表情包管理 Modal -->
        <div class="modal-overlay center-popup" v-if="isStickerSettingsOpen" style="z-index: 2150;" @click.self="isStickerSettingsOpen = false">
             <div class="modal-content" style="max-height: 80vh; overflow-y: auto; display:flex; flex-direction:column;">
                <div class="modal-title">AI 表情包配置</div>
                <div style="display:flex; margin-bottom:15px; background:#eee; padding:2px; border-radius:8px;">
                    <div @click="stickerSettingsTab = 'exclusive'" 
                         :style="{ background: stickerSettingsTab === 'exclusive' ? '#fff' : 'transparent', fontWeight: stickerSettingsTab === 'exclusive' ? 'bold' : 'normal' }"
                         style="flex:1; text-align:center; padding:8px; border-radius:6px; font-size:14px; transition:0.2s; cursor:pointer;">专属表情</div>
                    <div @click="stickerSettingsTab = 'general'" 
                         :style="{ background: stickerSettingsTab === 'general' ? '#fff' : 'transparent', fontWeight: stickerSettingsTab === 'general' ? 'bold' : 'normal' }"
                         style="flex:1; text-align:center; padding:8px; border-radius:6px; font-size:14px; transition:0.2s; cursor:pointer;">通用表情</div>
                </div>

                <div style="flex:1; overflow-y:auto; border:1px solid #eee; border-radius:8px; padding:10px; margin-bottom:15px; background:#fafafa;">
                    <div v-if="stickerSettingsTab === 'exclusive'">
                        <div v-if="tempQQSettings.aiExclusiveStickers.length === 0" style="text-align:center; color:#999; font-size:12px; padding:20px;">
                            暂无专属表情<br>此 AI 将使用通用表情库
                        </div>
                        <div v-for="(sticker, idx) in tempQQSettings.aiExclusiveStickers" :key="idx" style="display:flex; align-items:center; margin-bottom:8px; background:white; padding:5px; border-radius:6px;">
                            <img :src="sticker.src" style="width:40px; height:40px; object-fit:contain; border-radius:4px; border:1px solid #ddd; margin-right:10px;">
                            <span style="flex:1; font-weight:bold; font-size:14px;">{{ sticker.name }}</span>
                            <button @click="deleteAiSticker(idx)" style="color:#ff3b30; font-size:12px; border:none; background:none;">删除</button>
                        </div>
                    </div>
                    <div v-else>
                         <div v-if="qqData.aiGeneralStickers.length === 0" style="text-align:center; color:#999; font-size:12px; padding:20px;">暂无通用表情</div>
                         <div v-for="(sticker, idx) in qqData.aiGeneralStickers" :key="idx" style="display:flex; align-items:center; margin-bottom:8px; background:white; padding:5px; border-radius:6px;">
                            <img :src="sticker.src" style="width:40px; height:40px; object-fit:contain; border-radius:4px; border:1px solid #ddd; margin-right:10px;">
                            <span style="flex:1; font-weight:bold; font-size:14px;">{{ sticker.name }}</span>
                            <button @click="deleteAiSticker(idx)" style="color:#ff3b30; font-size:12px; border:none; background:none;">删除</button>
                        </div>
                    </div>
                </div>

                <div>
                    <span style="font-size:12px; color:#666; display:block; margin-bottom:5px;">批量添加 (格式: 名称:链接，一行一个)</span>
                    <textarea v-model="tempStickerInput" class="qq-textarea" style="height:80px; font-family:monospace;" placeholder="开心:http://...\n生气:http://..."></textarea>
                    <button class="modal-btn" style="margin-top:10px; width:100%;" @click="addBatchStickers">添加至{{ stickerSettingsTab === 'exclusive' ? '专属' : '通用' }}库</button>
                </div>
                
                <button class="modal-btn cancel" style="margin-top:15px;" @click="isStickerSettingsOpen = false">返回</button>
             </div>
        </div>

        <!-- 用户表情包选择器 -->
        <div v-if="isUserStickerPickerOpen" class="modal-overlay center-popup" style="z-index: 2500;" @click.self="isUserStickerPickerOpen = false">
            <div class="modal-content" style="max-height: 70vh; display:flex; flex-direction:column; padding:0;">
                <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold;">我的表情包库</span>
                    <button @click="isUserStickerManageMode = !isUserStickerManageMode" style="font-size:12px; color:#007aff; border:none; background:none;">{{ isUserStickerManageMode ? '完成' : '管理' }}</button>
                </div>
                
                <div v-if="!isUserStickerManageMode" style="padding:15px; overflow-y:auto; flex:1; display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;">
                    <div v-if="qqData.userStickers.length === 0" style="grid-column: 1/-1; text-align:center; color:#999; padding:20px;">
                        还没有表情包，点击右上角“管理”添加
                    </div>
                    <div v-for="(sticker, idx) in qqData.userStickers" :key="idx" @click="sendUserSticker(sticker)"
                         style="aspect-ratio:1; border:1px solid #eee; border-radius:8px; display:flex; justify-content:center; align-items:center; cursor:pointer; overflow:hidden;">
                         <img :src="sticker.src" style="max-width:90%; max-height:90%; object-fit:contain;">
                    </div>
                </div>

                <div v-else style="padding:15px; overflow-y:auto; flex:1;">
                    <div style="margin-bottom:15px;">
                        <textarea v-model="userStickerInput" class="qq-textarea" style="height:80px;" placeholder="批量添加: 名称:链接 (一行一个)"></textarea>
                        <button class="modal-btn" style="width:100%; margin-top:5px;" @click="addUserBatchStickers">添加</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <div v-for="(sticker, idx) in qqData.userStickers" :key="idx" style="display:flex; align-items:center; background:#f9f9f9; padding:5px; border-radius:6px;">
                            <img :src="sticker.src" style="width:40px; height:40px; margin-right:10px;">
                            <span style="flex:1; font-size:12px; overflow:hidden; text-overflow:ellipsis;">{{ sticker.name }}</span>
                            <button @click="qqData.userStickers.splice(idx,1)" style="color:#ff3b30; border:none; background:none;">删除</button>
                        </div>
                    </div>
                </div>
                
                <div style="padding:10px; border-top:1px solid #eee; text-align:center;">
                    <button @click="isUserStickerPickerOpen = false" style="background:none; border:none; color:#666;">关闭</button>
                </div>
            </div>
        </div>

        <!-- 记忆管理 Modal -->
        <div class="modal-overlay center-popup" v-if="isSummaryEditOpen" style="z-index: 2100;" @click.self="isSummaryEditOpen = false">
            <div class="modal-content" style="height: 85vh; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-title" style="flex-shrink: 0;">管理长期记忆碎片</div>
                <div style="flex: 1; overflow-y: auto; margin-bottom: 10px;">
                    <div v-if="!tempQQSettings.memoryList || tempQQSettings.memoryList.length === 0" style="text-align: center; color: #999; padding: 20px;">
                        暂无长期记忆
                    </div>
                    <div v-else>
                        <div v-for="(mem, idx) in tempQQSettings.memoryList" :key="mem.id || idx" 
                             style="background: #f5f5f7; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
                            <textarea v-model="mem.content" class="qq-textarea" style="height: 80px; font-size: 13px; margin-bottom: 5px;"></textarea>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 10px; color: #999;">{{ mem.time || '未知时间' }}</span>
                                <button @click="deleteMemory(idx)" style="background: none; border: none; color: #ff3b30; font-size: 12px; cursor: pointer;">删除</button>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="modal-btn" @click="isSummaryEditOpen = false" style="flex-shrink: 0;">关闭并返回</button>
            </div>
        </div>

        <!-- 转发选择 -->
        <div class="modal-overlay" v-if="isForwardModalOpen" style="z-index: 2200;" @click.self="isForwardModalOpen = false">
             <div class="modal-content" style="max-height: 70vh; overflow-y: auto;">
                <div class="modal-title">选择转发对象</div>
                <div v-for="chat in qqData.chatList.filter(c => c.id !== qqData.currentChatId)" :key="chat.id" @click="forwardToChat(chat.id)" style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; cursor: pointer;">
                     <div class="qq-avatar" :style="chat.avatar ? { backgroundImage: 'url(' + chat.avatar + ')' } : { width: '30px', height: '30px' }" style="margin-right: 10px;"></div><span>{{ chat.remark || chat.name }}</span>
                </div>
                <button class="modal-btn cancel" @click="isForwardModalOpen = false" style="margin-top: 10px;">取消</button>
             </div>
        </div>

        <!-- 链接查看器 Modal -->
        <div v-if="linkViewer.visible" class="modal-overlay" style="z-index: 2860;" @click.self="linkViewer.visible = false">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-title">{{ linkViewer.data.title || '查看链接' }}</div>
                <div v-if="linkViewer.data.source" style="font-size: 12px; color: #888; margin-bottom: 10px; text-align: center;">来源: {{ linkViewer.data.source }}</div>
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin: 15px 0; white-space: pre-wrap; word-break: break-word; line-height: 1.6; max-height: 60vh; overflow-y: auto;">
                    {{ linkViewer.data.content }}
                </div>
                <button class="modal-btn" @click="linkViewer.visible = false">关闭</button>
            </div>
        </div>

        <!-- 文本图片查看器 Modal -->
        <div v-if="textViewer.visible" class="modal-overlay" style="z-index: 2850;" @click.self="textViewer.visible = false">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-title">图片描述</div>
                <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin: 15px 0; white-space: pre-wrap; word-break: break-word; line-height: 1.6; max-height: 60vh; overflow-y: auto;">
                    {{ textViewer.content }}
                </div>
                <button class="modal-btn" @click="textViewer.visible = false">关闭</button>
            </div>
        </div>

        <!-- 转发消息查看器 (居中长方形窗口) -->
        <div v-if="forwardViewer.visible" class="modal-overlay" style="z-index: 2800; display:flex; align-items:center; justify-content:center; animation:none !important; transition:none !important;" @click.self="forwardViewer.visible = false">
            <div class="modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); transform-origin: center center; animation: none !important; transition: none !important; width: 85%; max-width: 500px; height: 75vh; background: white; border-radius: 12px; padding: 0; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.32);">
                <!-- 标题栏 -->
                <div style="padding: 15px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center; background: #f9f9f9;">
                    <span style="font-weight: bold; font-size: 16px;">{{ forwardViewer.title }}</span>
                    <button @click="forwardViewer.visible = false" style="border:none; background:none; color:#666; font-size:14px; cursor:pointer;">关闭</button>
                </div>
                
                <!-- 聊天记录列表 -->
                <div style="flex: 1; overflow-y: auto; padding: 10px; background: #f5f5f7;">
                    <div v-for="(item, idx) in forwardViewer.list" :key="idx" 
                         style="display:flex; width:100%; margin-bottom:8px; align-items:flex-start;"
                         :style="{ flexDirection: item.role === 'user' ? 'row-reverse' : 'row' }">
                        <!-- 头像 -->
                        <div style="width:36px; height:36px; border-radius:50%; background:#ddd; flex-shrink:0; background-size:cover; background-position:center;"
                             :style="item.avatar ? { backgroundImage: 'url(' + item.avatar + ')' } : {}"></div>
                        
                        <!-- 消息气泡 -->
                        <div :style="{ 
                                 marginLeft: item.role === 'user' ? '0' : '10px',
                                 marginRight: item.role === 'user' ? '10px' : '0',
                                 maxWidth: '70%'
                             }">
                            <div style="font-size:12px; color:#999; margin-bottom:3px;"
                                 :style="{ textAlign: item.role === 'user' ? 'right' : 'left' }">
                                {{ item.name }}
                            </div>
                            <div :style="{ 
                                     background: item.role === 'user' ? '#0099ff' : 'white',
                                     color: '#333',
                                     padding: '10px 12px',
                                     borderRadius: '8px',
                                     fontSize: '14px',
                                     lineHeight: '1.4',
                                     wordBreak: 'break-word',
                                     boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                 }">
                                {{ item.content }}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 底部提示 -->
                <div style="padding: 10px; border-top: 1px solid #eee; text-align:center; font-size:12px; color:#999; background:#f9f9f9;">
                    共 {{ forwardViewer.list.length }} 条消息
                </div>
            </div>
        </div>

        <!-- 上下文菜单 (长按消息气泡弹出) -->
        <div v-if="contextMenu.visible" 
             @click.stop="hideContextMenu"
             style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2600; background: rgba(0,0,0,0.3);">
            <div @click.stop 
                 :style="{ 
                     position: 'absolute', 
                     left: contextMenu.x + 'px', 
                     top: contextMenu.y + 'px',
                     transform: 'translate(-50%, -100%)'
                 }"
                 style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; overflow: hidden;">
                <button @click="menuAction('edit')" style="padding: 10px 16px; border: none; background: white; font-size: 14px; border-right: 1px solid #eee; cursor: pointer;">编辑</button>
                <button @click="menuAction('copy')" style="padding: 10px 16px; border: none; background: white; font-size: 14px; border-right: 1px solid #eee; cursor: pointer;">复制</button>
                <button @click="menuAction('retract')" style="padding: 10px 16px; border: none; background: white; font-size: 14px; border-right: 1px solid #eee; cursor: pointer;">撤回</button>
                <button @click="menuAction('multi')" style="padding: 10px 16px; border: none; background: white; font-size: 14px; cursor: pointer;">多选</button>
            </div>
        </div>

        <!-- 头像框选择 Modal -->
        <div class="modal-overlay" v-if="isFrameModalOpen" @click.self="isFrameModalOpen = false" style="z-index: 2900;">
            <div class="modal-content">
                <div class="modal-title">选择头像框</div>
                <div class="frame-grid">
                    <div class="frame-option-container" @click="setFrame('')"><div class="frame-preview frame-none"></div><div class="frame-label">无</div></div>
                    <div class="frame-option-container" @click="addCustomFrame"><div class="frame-preview frame-add">+</div><div class="frame-label">自定义</div></div>
                    <!-- 预设头像框 -->
                    <div class="frame-option-container" v-for="(frameUrl, index) in presetFrames" :key="'preset-' + index" @click="setFrame('preset-frame-' + index)">
                        <div class="frame-preview" :class="'preset-frame-' + index" :style="{ backgroundImage: 'url(' + frameUrl + ')', backgroundSize: 'cover', backgroundPosition: 'center' }"></div>
                        <div class="frame-label">预设{{ index + 1 }}</div>
                    </div>
                    <!-- 自定义头像框 -->
                    <div class="frame-option-container" v-for="(frameUrl, index) in customFrames" :key="'custom-' + index">
                        <div class="frame-preview" :class="'custom-frame-' + index" :style="{ backgroundImage: 'url(' + frameUrl + ')', backgroundSize: 'cover', backgroundPosition: 'center' }" @click="setFrame('custom-frame-' + index)"></div>
                        <div class="frame-label">自定义{{ index + 1 }}</div>
                        <button class="delete-frame-btn" @click.stop="deleteCustomFrame(index)" title="删除此头像框">×</button>
                    </div>
                </div>
                <button class="modal-btn cancel" @click="isFrameModalOpen = false">返回</button>
            </div>
        </div>

        <!-- NPC 管理 Modal -->
        <div class="modal-overlay center-popup" v-if="isNpcManagerOpen" style="z-index: 2200;" @click.self="isNpcManagerOpen = false">
            <div class="modal-content" style="height: 600px; max-height: 85vh; display: flex; flex-direction: column;">
                <div class="modal-title" style="margin-bottom: 10px;">NPC库</div>
                
                <!-- Tab 切换 -->
                <div style="display:flex; margin-bottom:15px; background:#eee; padding:2px; border-radius:8px; flex-shrink: 0;">
                    <div @click="npcManagerTab = 'list'" 
                         :style="{ background: npcManagerTab === 'list' ? '#fff' : 'transparent', fontWeight: npcManagerTab === 'list' ? 'bold' : 'normal' }"
                         style="flex:1; text-align:center; padding:8px; border-radius:6px; font-size:14px; transition:0.2s; cursor:pointer;">NPC 列表</div>
                    <div @click="openNpcEdit(-1)" 
                         :style="{ background: npcManagerTab === 'add' ? '#fff' : 'transparent', fontWeight: npcManagerTab === 'add' ? 'bold' : 'normal' }"
                         style="flex:1; text-align:center; padding:8px; border-radius:6px; font-size:14px; transition:0.2s; cursor:pointer;">{{ editingNpcIndex === -1 ? '添加 NPC' : '编辑 NPC' }}</div>
                </div>

                <!-- 列表视图 -->
                <div v-if="npcManagerTab === 'list'" style="flex: 1; overflow-y: auto;">
                    <div v-if="!tempQQSettings.npcList || tempQQSettings.npcList.length === 0" style="text-align: center; color: #999; padding: 20px; font-size: 13px;">
                        暂无 NPC，请点击“添加 NPC”
                    </div>
                    <div v-else>
                        <div v-for="(npc, idx) in tempQQSettings.npcList" :key="idx" 
                             @click="openNpcEdit(idx)"
                             style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                            <div style="flex: 1; min-width: 0; margin-right: 10px;">
                                <div style="font-weight: bold; font-size: 15px; color: #333;">{{ npc.name }}</div>
                                <div style="font-size: 12px; color: #888; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    {{ npc.relation || '暂无关系描述' }}
                                </div>
                            </div>
                            <button @click.stop="deleteNpc(idx)" style="background: none; border: none; color: #ff3b30; font-size: 12px; padding: 5px; flex-shrink: 0;">删除</button>
                        </div>
                    </div>
                </div>

                <!-- 编辑视图 -->
                <div v-else style="flex: 1; overflow-y: auto;">
                    <div class="input-row">
                        <span class="input-label">名字</span>
                        <input type="text" class="modal-input" v-model="tempNpcData.name" placeholder="NPC 名字">
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <span class="input-label" style="display: block; margin-bottom: 5px;">设定</span>
                        <textarea class="qq-textarea" v-model="tempNpcData.setting" placeholder="NPC 的详细设定..." style="height: 100px;"></textarea>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <span class="input-label" style="display: block; margin-bottom: 5px;">与Char的关系</span>
                        <textarea class="qq-textarea" v-model="tempNpcData.relation" placeholder="与当前角色的关系..." style="height: 60px;"></textarea>
                    </div>

                    <div style="margin-top: 20px;">
                        <button class="modal-btn" @click="saveNpc" style="color: var(--accent-color);">保存</button>
                    </div>
                </div>
                
                <button class="modal-btn" @click="isNpcManagerOpen = false" style="margin-top: 15px; flex-shrink: 0; background: #f5f5f5; color: #666; padding: 12px;">关闭</button>
            </div>
        </div>

        <input type="file" ref="fileInput" hidden accept="image/*" @change="handleFileChange">
        <input type="file" ref="imgMsgInput" hidden accept="image/*" @change="handleImageMsgChange">
        <input type="file" ref="momentImageInput" hidden multiple accept="image/*" @change="handleMomentImageChange">

        <!-- 说说发布窗口 -->
        <div v-if="isPublishMomentOpen" class="modal-overlay center-popup" style="z-index: 3000;" @click.self="isPublishMomentOpen = false">
            <div class="modal-content" style="width: 90%; max-width: 500px; height: 80vh; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-shrink: 0;">
                    <button @click="isPublishMomentOpen = false" style="border:none; background:none; font-size: 16px;">取消</button>
                    <div style="font-weight: bold; font-size: 17px;">发说说</div>
                    <button @click="publishMoment" style="border:none; background: #007aff; color: white; padding: 6px 15px; border-radius: 15px; font-size: 15px;">发布</button>
                </div>
                <div style="flex: 1; overflow-y: auto; padding-bottom: 10px;">
                    <textarea v-model="momentForm.content" placeholder="分享新鲜事..." style="width: 100%; height: 120px; border: none; resize: none; font-size: 16px; padding: 5px;"></textarea>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                        <div v-for="(img, index) in momentForm.images" :key="index" style="padding-top: 100%; position: relative; border-radius: 8px; overflow: hidden;">
                            <img :src="img" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
                            <button @click="removeMomentImage(index)" style="position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; font-size: 12px; line-height: 18px; padding: 0;">×</button>
                        </div>
                        <div v-if="momentForm.images.length < 9" @click="triggerMomentImageUpload" style="aspect-ratio: 1 / 1; border: 2px dashed #ccc; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
                            <span style="font-size: 24px; color: #ccc;">+</span>
                        </div>
                    </div>
                </div>
                <div style="border-top: 1px solid #eee; padding-top: 10px; flex-shrink: 0;">
                    <div @click="openAtUserModal" style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; cursor: pointer;">
                        <span style="font-size: 18px; margin-right: 10px;">@</span>
                        <span>提醒谁看</span>
                        <span style="margin-left: auto; color: #888; font-size: 14px;">{{ momentForm.mentions.length > 0 ? momentForm.mentions.map(m => m.name).join(', ') : '' }}</span>
                    </div>
                    <div @click="addMomentLocation" style="padding: 10px; display: flex; align-items: center; cursor: pointer;">
                        <span style="font-size: 18px; margin-right: 10px; color: #555;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </span>
                        <span>所在位置</span>
                        <span style="margin-left: auto; color: #888; font-size: 14px;">{{ momentForm.location || '' }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- @好友选择窗口 -->
        <div v-if="isAtUserModalOpen" class="modal-overlay center-popup" style="z-index: 3100;" @click.self="isAtUserModalOpen = false">
            <div class="modal-content" style="max-height: 70vh; overflow-y: auto;">
                <div class="modal-title">选择要@的好友</div>
                <div v-for="chat in qqData.chatList" :key="chat.id" @click="toggleMention(chat)" style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; cursor: pointer;">
                     <div class="qq-avatar" :style="{ backgroundImage: 'url(' + chat.avatar + ')' }" style="width: 30px; height: 30px; margin-right: 10px;"></div>
                     <span>{{ chat.remark || chat.name }}</span>
                     <input type="checkbox" :checked="momentForm.mentions.some(m => m.id === chat.id)" style="margin-left: auto; pointer-events: none;">
                </div>
                <button class="modal-btn" @click="isAtUserModalOpen = false" style="margin-top: 10px;">完成</button>
            </div>
        </div>
    </div>
    `
};
