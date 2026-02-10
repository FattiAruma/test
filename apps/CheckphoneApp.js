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
        const activeQQChat = ref(null); // 当前查看的 QQ 聊天
        const selectedPhoto = ref(null); // 当前查看的相册图片
        const walletTab = ref('recent'); // 'recent' or 'realtime'

        const characterList = computed(() => {
            if (!props.qqData || !props.qqData.chatList) return [];
            return props.qqData.chatList.filter(chat => !chat.isGroup);
        });

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
            // 确保每个角色都有一个用于存储生成内容的字段
            if (!character.generatedQQChats) {
                character.generatedQQChats = reactive([]);
            }
            if (!character.generatedPhotos) {
                character.generatedPhotos = reactive([]);
            }
            if (!character.generatedMemos) {
                character.generatedMemos = reactive([]);
            }
            if (!character.generatedWallet) {
                character.generatedWallet = reactive({
                    balance: '0.00',
                    transactions: [],
                    realtimeTransactions: [] // 新增：实时交易记录
                });
            }
            // 兼容旧数据：如果存在 generatedWallet 但没有 realtimeTransactions，补上
            if (character.generatedWallet && !character.generatedWallet.realtimeTransactions) {
                character.generatedWallet.realtimeTransactions = [];
            }
            selectedCharacter.value = character;
        };

        const goBackToSelection = () => {
            selectedCharacter.value = null;
            // 重置内部状态
            currentApp.value = null;
            activeQQChat.value = null;
        };
        
        const closeApp = () => {
            goBackToSelection(); // 调用它来重置所有状态
            emit('close');
        };

        const openApp = (appName) => {
            const supportedApps = ['QQ', '相册', '备忘录', '钱包', '电话', '浏览器', '位置', '日记'];
            if (supportedApps.includes(appName)) {
                currentApp.value = appName;
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

        const clearQQContent = () => {
            if (confirm("确定要清空所有生成的QQ聊天记录吗？")) {
                if (selectedCharacter.value && selectedCharacter.value.generatedQQChats) {
                    selectedCharacter.value.generatedQQChats.length = 0; // 清空数组
                }
            }
        };

        const generatePhotoContent = async () => {
            if (isGenerating.value) return;
            if (!props.apiConfig || !props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ API 配置无效，请先在主界面的【设置】中配置。");
                return;
            }
            if (!confirm("确定要调用一次 API 生成相册内容吗？")) return;

            isGenerating.value = true;
            try {
                const char = selectedCharacter.value;
                if (!char.generatedPhotos) {
                    char.generatedPhotos = reactive([]);
                }

                const systemPrompt = `
你将扮演一个熟悉角色【${char.name}】的人，来描述他手机相册里的照片。

【角色信息】
- 角色名字: ${char.name}
- 角色人设: ${char.aiPersona || '未提供'}

【任务】
1.  想象一下，根据这个角色的人设，他会用手机拍下什么样的照片。这些照片应该是**他自己视角拍摄的**，而不是别人拍的他。
2.  生成4张这类照片的描述。内容可以是：他看到的风景、吃的食物、感兴趣的物品、工作相关的截图、随手拍的街景等。
3.  **重点：不要生成“角色在做什么”的照片描述。** 描述的是照片里的**事物**，而不是角色本人。
4.  每条描述都必须以“这是一张...”开头。
5.  每条描述的长度控制在30到40字之间。

【输出格式】
请严格返回一个 JSON 数组，数组中包含 4 个字符串。不要包含任何其他说明文字。格式如下:
[
  "这是一张[他拍的食物]的照片...",
  "这是一张[他看到的风景]的照片...",
  "这是一张[他觉得有趣的街角]的照片...",
  "这是一张[他正在读的书]的照片..."
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
                        temperature: 0.9,
                        response_format: { type: "json_object" }
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
                
                const data = await res.json();
                let content = data.choices[0].message.content;
                
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    content = jsonMatch[1];
                }
                
                const parsedContent = JSON.parse(content);
                let descriptions = [];
                if (Array.isArray(parsedContent)) {
                    descriptions = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    const key = Object.keys(parsedContent).find(k => Array.isArray(parsedContent[k]));
                    if (key) {
                        descriptions = parsedContent[key];
                    } else {
                        throw new Error("API返回了非数组的JSON，且无法找到数组键。");
                    }
                } else {
                     throw new Error("API返回的JSON格式不正确。");
                }

                if (descriptions.length !== 4) {
                    console.warn("API did not return exactly 4 descriptions, got:", descriptions.length);
                }

                const photoUrl = 'https://i.postimg.cc/tJYSkjdD/wu-biao-ti100-20260205190245.png';
                char.generatedPhotos.length = 0; // 清空旧照片
                descriptions.forEach((desc, index) => {
                    char.generatedPhotos.push({
                        id: index,
                        url: photoUrl,
                        description: desc
                    });
                });

            } catch (e) {
                console.error("生成相册内容失败:", e);
                alert("生成失败: " + e.message);
            } finally {
                isGenerating.value = false;
            }
        };

        const clearPhotoContent = () => {
            if (confirm("确定要清空所有生成的相册照片吗？")) {
                if (selectedCharacter.value && selectedCharacter.value.generatedPhotos) {
                    selectedCharacter.value.generatedPhotos.length = 0; // 清空数组
                }
            }
        };

        const generateMemoContent = async () => {
            if (isGenerating.value) return;
            if (!props.apiConfig || !props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ API 配置无效，请先在主界面的【设置】中配置。");
                return;
            }
            if (!confirm("确定要调用一次 API 生成备忘录内容吗？")) return;

            isGenerating.value = true;
            try {
                const char = selectedCharacter.value;
                if (!char.generatedMemos) {
                    char.generatedMemos = reactive([]);
                }

                const systemPrompt = `
你将扮演角色【${char.name}】，并以他的口吻，用第一人称“我”来写备忘录。

【角色信息】
- 角色名字: ${char.name}
- 角色人设: ${char.aiPersona || '未提供'}

【任务】
1.  请你模仿【${char.name}】的口吻和人设，以第一人称“我”的视角，写 5 条备忘录。
2.  每条备忘录包含一个**标题**和**内容**。
    - **标题**：简短概括，5-10字。
    - **内容**：具体描述，20-60字。
3.  备忘录的内容可以多种多样，例如：提醒自己要做的事、对某件事的简短思考、一些灵感片段、一句喜欢的话、一个临时的计划等等。
4.  内容要符合角色的性格和当前处境。

【输出格式】
请严格返回一个 JSON 数组，数组中包含 5 个对象。不要包含任何其他说明文字。格式如下:
[
  { "title": "备忘录标题1", "content": "备忘录内容1..." },
  { "title": "备忘录标题2", "content": "备忘录内容2..." },
  { "title": "备忘录标题3", "content": "备忘录内容3..." },
  { "title": "备忘录标题4", "content": "备忘录内容4..." },
  { "title": "备忘录标题5", "content": "备忘录内容5..." }
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
                        temperature: 0.9,
                        response_format: { type: "json_object" }
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
                
                const data = await res.json();
                let content = data.choices[0].message.content;
                
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    content = jsonMatch[1];
                }
                
                const parsedContent = JSON.parse(content);
                let memos = [];
                if (Array.isArray(parsedContent)) {
                    memos = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    const key = Object.keys(parsedContent).find(k => Array.isArray(parsedContent[k]));
                    if (key) {
                        memos = parsedContent[key];
                    } else {
                        throw new Error("API返回了非数组的JSON，且无法找到数组键。");
                    }
                } else {
                     throw new Error("API返回的JSON格式不正确。");
                }

                char.generatedMemos.length = 0; // 清空旧备忘录
                memos.forEach((memo, index) => {
                    // 兼容旧格式（如果是字符串）和新格式（对象）
                    if (typeof memo === 'string') {
                        char.generatedMemos.push({
                            id: index,
                            title: '备忘录',
                            content: memo
                        });
                    } else {
                        char.generatedMemos.push({
                            id: index,
                            title: memo.title || '无标题',
                            content: memo.content || ''
                        });
                    }
                });

            } catch (e) {
                console.error("生成备忘录内容失败:", e);
                alert("生成失败: " + e.message);
            } finally {
                isGenerating.value = false;
            }
        };

        const clearMemoContent = () => {
            if (confirm("确定要清空所有生成的备忘录吗？")) {
                if (selectedCharacter.value && selectedCharacter.value.generatedMemos) {
                    selectedCharacter.value.generatedMemos.length = 0; // 清空数组
                }
            }
        };

        const generateWalletContent = async () => {
            if (isGenerating.value) return;
            if (!props.apiConfig || !props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ API 配置无效，请先在主界面的【设置】中配置。");
                return;
            }
            if (!confirm("确定要调用一次 API 生成钱包内容吗？")) return;

            isGenerating.value = true;
            try {
                const char = selectedCharacter.value;
                if (!char.generatedWallet) {
                    char.generatedWallet = reactive({
                        balance: '0.00',
                        transactions: [],
                        realtimeTransactions: []
                    });
                }

                const systemPrompt = `
你将扮演角色【${char.name}】，并生成他手机钱包APP里的数据。

【角色信息】
- 角色名字: ${char.name}
- 角色人设: ${char.aiPersona || '未提供'}

【任务】
1.  根据角色的人设和经济状况，设定一个合理的**当前钱包余额**。
2.  生成 5 条最近的**收支记录**。
    - 每条记录包含：类型（支出/收入）、金额、描述。
    - **关键要求：描述（description）必须像真实的支付软件（如微信支付、支付宝）或银行账单。**
    - **支出描述**：必须是【商户名称】、【品牌名】或【标准服务名称】。
        - 正确示例：“7-Eleven”、“星巴克”、“滴滴出行”、“美团外卖”、“Steam”、“优衣库”、“中国移动话费”、“罗森便利店”。
        - **错误示例（绝对禁止）**：“便利店买水”、“上班路上买的咖啡”、“给你买的礼物”、“加油”、“吃午饭”。
    - **收入描述**：例如“工资”、“转账-李四”、“闲鱼收入”、“理财收益”。
    - 内容要符合角色的生活习惯。

【输出格式】
请严格返回一个 JSON 对象。不要包含任何其他说明文字。格式如下:
{
  "balance": "1234.56",
  "transactions": [
    { "type": "expense", "amount": "25.00", "description": "罗森便利店" },
    { "type": "income", "amount": "5000.00", "description": "工资" },
    ...
  ]
}
注意：
- balance 是字符串，保留两位小数。
- type 只能是 "expense" (支出) 或 "income" (收入)。
- amount 是字符串，保留两位小数。
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
                        response_format: { type: "json_object" }
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
                
                const data = await res.json();
                let content = data.choices[0].message.content;
                
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    content = jsonMatch[1];
                }
                
                const parsedContent = JSON.parse(content);
                
                // 更新余额
                if (parsedContent.balance) {
                    char.generatedWallet.balance = parsedContent.balance;
                }

                // 更新交易记录
                if (Array.isArray(parsedContent.transactions)) {
                    // 将新记录添加到开头
                    const newTransactions = parsedContent.transactions.map((t, i) => ({
                        ...t,
                        id: Date.now() + i // 简单的唯一ID
                    }));
                    
                    char.generatedWallet.transactions.unshift(...newTransactions);
                    
                    // 只保留最近10条
                    if (char.generatedWallet.transactions.length > 10) {
                        char.generatedWallet.transactions = char.generatedWallet.transactions.slice(0, 10);
                    }
                }
                
                // 生成后切换到最近明细标签页，以便用户看到结果
                walletTab.value = 'recent';

            } catch (e) {
                console.error("生成钱包内容失败:", e);
                alert("生成失败: " + e.message);
            } finally {
                isGenerating.value = false;
            }
        };

        const clearWalletContent = () => {
            if (confirm("确定要清空钱包余额和记录吗？")) {
                if (selectedCharacter.value && selectedCharacter.value.generatedWallet) {
                    selectedCharacter.value.generatedWallet.balance = '0.00';
                    selectedCharacter.value.generatedWallet.transactions = [];
                }
            }
        };

        const generatePhoneContent = () => alert('电话“加载”功能待开发');
        const clearPhoneContent = () => alert('电话“清除”功能待开发');
        const generateBrowserContent = () => alert('浏览器“加载”功能待开发');
        const clearBrowserContent = () => alert('浏览器“清除”功能待开发');
        const generateLocationContent = () => alert('位置“加载”功能待开发');
        const clearLocationContent = () => alert('位置“清除”功能待开发');
        const generateDiaryContent = () => alert('日记“加载”功能待开发');
        const clearDiaryContent = () => alert('日记“清除”功能待开发');

        const generateQQContent = async () => {
            if (isGenerating.value) return;
            if (!props.apiConfig || !props.apiConfig.key || !props.apiConfig.endpoint) {
                alert("⚠️ API 配置无效，请先在主界面的【设置】中配置。");
                return;
            }
            if (!confirm("确定要调用一次 API 生成内容吗？\n(注意：这会更新现有的聊天记录)")) return;

            isGenerating.value = true;

            try {
                const char = selectedCharacter.value;
                // 确保 generatedQQChats 存在
                if (!char.generatedQQChats) {
                    char.generatedQQChats = reactive([]);
                }

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
                        response_format: { type: "json_object" }
                    })
                });

                if (!res.ok) throw new Error(`API Error: ${res.status} ${await res.text()}`);
                
                const data = await res.json();
                let content = data.choices[0].message.content;
                
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                    content = jsonMatch[1];
                }
                
                const parsedContent = JSON.parse(content);
                let newChats = [];
                if (Array.isArray(parsedContent)) {
                    newChats = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    const key = Object.keys(parsedContent).find(k => Array.isArray(parsedContent[k]));
                    if (key) {
                        newChats = parsedContent[key];
                    } else {
                        throw new Error("API返回了非数组的JSON，且无法找到数组键。");
                    }
                } else {
                     throw new Error("API返回的JSON格式不正确。");
                }

                const defaultAvatar = 'https://i.postimg.cc/4N1jy7hV/wu-biao-ti98-20260205164643.jpg';
                const npcMap = new Map((char.npcList || []).map(npc => [npc.name, npc.avatar]));

                newChats.forEach(newChat => {
                    // --- 头像处理 ---
                    if (newChat.isUser) {
                        newChat.avatar = char.userAvatar || defaultAvatar;
                    } else {
                        const npcAvatar = npcMap.get(newChat.name);
                        newChat.avatar = npcAvatar || defaultAvatar;
                    }
                    if (!newChat.avatar) newChat.avatar = defaultAvatar;

                    // --- 核心：合并与更新逻辑 ---
                    // 修正：现在通过 isUser 属性来查找，更可靠
                    const existingChat = char.generatedQQChats.find(c => c.isUser === newChat.isUser && c.name === newChat.name);

                    // 修复：如果是玩家聊天，则从主聊天记录中获取最新消息
                    if (newChat.isUser) {
                        const userMessages = char.messages
                            .filter(m => m.role === 'user' || m.role === 'assistant')
                            .slice(-13) // 获取最近13条
                            .map(m => ({
                                role: m.role === 'assistant' ? 'me' : 'them',
                                content: m.content
                            }));

                        if (existingChat) {
                            existingChat.messages = userMessages;
                            // 更新玩家备注名和头像，以防在主应用中被修改
                            existingChat.name = newChat.name;
                            existingChat.avatar = newChat.avatar;
                        } else {
                            // 如果不存在，则创建一个新的
                            newChat.messages = userMessages;
                            char.generatedQQChats.push(newChat);
                        }
                        return; // 处理完玩家聊天后跳过后续逻辑
                    }


                    if (existingChat) {
                        // 如果是NPC，追加内容并截断
                        existingChat.messages.push(...newChat.messages);
                        if (existingChat.messages.length > 13) {
                            existingChat.messages = existingChat.messages.slice(-13);
                        }
                    } else {
                        // 如果是新NPC聊天，直接添加
                        // 确保新聊天也不超过13条（虽然API应该只给8条）
                        if (newChat.messages.length > 13) {
                            newChat.messages = newChat.messages.slice(-13);
                        }
                        char.generatedQQChats.push(newChat);
                    }
                });

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
            activeQQChat,
            viewQQChat,
            generateQQContent,
            clearQQContent,
            generatePhotoContent,
            clearPhotoContent,
            selectedPhoto,
            // 导出其他app的函数
            generateMemoContent, clearMemoContent,
            generateWalletContent, clearWalletContent,
            walletTab,
            generatePhoneContent, clearPhoneContent,
            generateBrowserContent, clearBrowserContent,
            generateLocationContent, clearLocationContent,
            generateDiaryContent, clearDiaryContent,
            characterList,
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
                                <div class="qq-avatar widget-avatar" :style="{ backgroundImage: 'url(' + (selectedCharacter.avatar || 'https://i.postimg.cc/4N1jy7hV/wu-biao-ti98-20260205164643.jpg') + ')' }"></div>
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
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">QQ</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generateQQContent" class="checkphone-header-btn" :disabled="isGenerating" style="min-width: 40px;">
                                            <svg v-if="!isGenerating" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                            <div v-else class="loader"></div>
                                        </button>
                                        <button @click="clearQQContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content">
                                    <div v-if="(!selectedCharacter.generatedQQChats || selectedCharacter.generatedQQChats.length === 0) && !isGenerating" class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的QQ聊天记录</p>
                                    </div>
                                    <div v-if="isGenerating" class="loading-state">
                                        <div class="loader"></div>
                                        <p>正在生成内容...</p>
                                    </div>
                                    <div v-if="selectedCharacter.generatedQQChats && selectedCharacter.generatedQQChats.length > 0" class="qq-chat-list">
                                        <div v-for="chat in selectedCharacter.generatedQQChats" :key="chat.name" class="qq-list-item" @click="viewQQChat(chat)">
                                            <div class="qq-avatar" :style="{ backgroundImage: 'url(' + (chat.avatar || 'https://i.postimg.cc/4N1jy7hV/wu-biao-ti98-20260205164643.jpg') + ')' }"></div>
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
                                    <button @click="activeQQChat = null" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">{{ activeQQChat.name }}</span>
                                    <div class="checkphone-header-actions" style="width: 60px;"></div>
                                </div>
                                <div class="checkphone-app-content chat-detail-view">
                                    <div v-for="(msg, index) in activeQQChat.messages" :key="index" class="chat-message-row" :class="msg.role === 'me' ? 'sent' : 'received'">
                                        <div class="chat-bubble">{{ msg.content }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 相册 App Screen -->
                        <div v-else-if="currentApp === '相册'" class="checkphone-inner-app" style="background-color: white;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">相册</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generatePhotoContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                        </button>
                                        <button @click="clearPhotoContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content" style="padding: 2px;">
                                     <div v-if="isGenerating" class="loading-state">
                                        <div class="loader"></div>
                                        <p>正在生成内容...</p>
                                    </div>
                                    <div v-else-if="!selectedCharacter.generatedPhotos || selectedCharacter.generatedPhotos.length === 0" class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的相册内容</p>
                                    </div>
                                    <div v-else class="photo-grid">
                                        <div v-for="photo in selectedCharacter.generatedPhotos" :key="photo.id" 
                                             class="photo-item" 
                                             :style="{ backgroundImage: 'url(' + photo.url + ')' }"
                                             @click="selectedPhoto = photo">
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <!-- Photo Detail Modal -->
                            <div v-if="selectedPhoto" class="photo-modal-overlay" @click.self="selectedPhoto = null">
                                <div class="photo-modal-content">
                                    <p>{{ selectedPhoto.description }}</p>
                                    <button @click="selectedPhoto = null" class="modal-btn" style="margin-top: 20px;">关闭</button>
                                </div>
                            </div>
                        </div>

                        <!-- 备忘录 App Screen -->
                        <div v-else-if="currentApp === '备忘录'" class="checkphone-inner-app" style="background-color: #f7f7f7;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">备忘录</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generateMemoContent" class="checkphone-header-btn" :disabled="isGenerating" style="min-width: 40px;">
                                            <svg v-if="!isGenerating" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                            <div v-else class="loader"></div>
                                        </button>
                                        <button @click="clearMemoContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content" style="padding: 15px;">
                                    <div v-if="isGenerating" class="loading-state">
                                        <div class="loader"></div>
                                        <p>正在生成内容...</p>
                                    </div>
                                    <div v-else-if="!selectedCharacter.generatedMemos || selectedCharacter.generatedMemos.length === 0" class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的备忘录内容</p>
                                    </div>
                                    <div v-else class="memo-list">
                                        <div v-for="memo in selectedCharacter.generatedMemos" :key="memo.id" class="memo-item">
                                            <div class="memo-title">{{ memo.title }}</div>
                                            <div class="memo-content">{{ memo.content }}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 钱包 App Screen -->
                        <div v-else-if="currentApp === '钱包'" class="checkphone-inner-app" style="background-color: #f5f5f5;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header" style="background-color: #fff;">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">钱包</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generateWalletContent" class="checkphone-header-btn" :disabled="isGenerating" style="min-width: 40px;">
                                            <svg v-if="!isGenerating" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                            <div v-else class="loader"></div>
                                        </button>
                                        <button @click="clearWalletContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content" style="padding: 0;">
                                    <div v-if="isGenerating" class="loading-state">
                                        <div class="loader"></div>
                                        <p>正在生成内容...</p>
                                    </div>
                                    <div v-else>
                                        <!-- 余额卡片 -->
                                        <div style="background-color: #4caf50; color: white; padding: 30px 20px; text-align: center; margin-bottom: 10px;">
                                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">总资产 (元)</div>
                                            <div style="font-size: 36px; font-weight: bold;">{{ selectedCharacter.generatedWallet?.balance || '0.00' }}</div>
                                        </div>
                                        
                                        <!-- 交易记录列表 -->
                                        <div style="background-color: white; padding: 0 15px;">
                                            <div style="display: flex; border-bottom: 1px solid #eee;">
                                                <div @click="walletTab = 'recent'" 
                                                     :style="{ flex: 1, textAlign: 'center', padding: '15px 0', fontSize: '16px', fontWeight: walletTab === 'recent' ? 'bold' : 'normal', color: walletTab === 'recent' ? '#333' : '#999', borderBottom: walletTab === 'recent' ? '2px solid #333' : 'none', cursor: 'pointer' }">
                                                    最近明细
                                                </div>
                                                <div @click="walletTab = 'realtime'" 
                                                     :style="{ flex: 1, textAlign: 'center', padding: '15px 0', fontSize: '16px', fontWeight: walletTab === 'realtime' ? 'bold' : 'normal', color: walletTab === 'realtime' ? '#333' : '#999', borderBottom: walletTab === 'realtime' ? '2px solid #333' : 'none', cursor: 'pointer' }">
                                                    实时明细
                                                </div>
                                            </div>
                                            
                                            <div v-if="walletTab === 'recent'">
                                                <div v-if="!selectedCharacter.generatedWallet?.transactions || selectedCharacter.generatedWallet.transactions.length === 0" style="padding: 30px; text-align: center; color: #999;">
                                                    暂无交易记录
                                                </div>
                                                
                                                <div v-else>
                                                    <div v-for="tx in selectedCharacter.generatedWallet.transactions" :key="tx.id" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f5f5f5;">
                                                        <div style="flex: 1;">
                                                            <div style="font-size: 16px; color: #333;">{{ tx.description }}</div>
                                                        </div>
                                                        <div :style="{ color: tx.type === 'income' ? '#4caf50' : '#333', fontSize: '18px', fontWeight: 'bold' }">
                                                            {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div v-else-if="walletTab === 'realtime'">
                                                <div v-if="!selectedCharacter.generatedWallet?.realtimeTransactions || selectedCharacter.generatedWallet.realtimeTransactions.length === 0" style="padding: 30px; text-align: center; color: #999;">
                                                    暂无实时交易
                                                </div>
                                                <div v-else>
                                                    <div v-for="tx in selectedCharacter.generatedWallet.realtimeTransactions.slice().reverse()" :key="tx.id" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f5f5f5;">
                                                        <div style="flex: 1;">
                                                            <div style="font-size: 16px; color: #333;">{{ tx.description }}</div>
                                                            <div style="font-size: 12px; color: #999; margin-top: 4px;">{{ tx.time }}</div>
                                                        </div>
                                                        <div :style="{ color: tx.type === 'income' ? '#4caf50' : '#333', fontSize: '18px', fontWeight: 'bold' }">
                                                            {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 电话 App Screen -->
                        <div v-else-if="currentApp === '电话'" class="checkphone-inner-app" style="background-color: white;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">电话</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generatePhoneContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                        </button>
                                        <button @click="clearPhoneContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content">
                                    <div class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的电话内容</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 浏览器 App Screen -->
                        <div v-else-if="currentApp === '浏览器'" class="checkphone-inner-app" style="background-color: white;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">浏览器</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generateBrowserContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                        </button>
                                        <button @click="clearBrowserContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content">
                                    <div class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的浏览器内容</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 位置 App Screen -->
                        <div v-else-if="currentApp === '位置'" class="checkphone-inner-app" style="background-color: white;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">位置</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generateLocationContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                        </button>
                                        <button @click="clearLocationContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content">
                                    <div class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的位置内容</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 日记 App Screen -->
                        <div v-else-if="currentApp === '日记'" class="checkphone-inner-app" style="background-color: white;">
                            <div class="checkphone-inner-app-page">
                                <div class="checkphone-app-header">
                                    <button @click="goBackToHome" class="checkphone-header-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                    </button>
                                    <span class="checkphone-header-title">日记</span>
                                    <div class="checkphone-header-actions" style="display: flex; align-items: center;">
                                        <button @click="generateDiaryContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                        </button>
                                        <button @click="clearDiaryContent" class="checkphone-header-btn" style="min-width: 40px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="checkphone-app-content">
                                    <div class="empty-state">
                                        <p>点击右上角加载图标</p>
                                        <p>生成此角色的日记内容</p>
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
                    <div v-if="!characterList || characterList.length === 0" style="text-align: center; padding: 40px; color: #999;">
                        <div>没有可选择的角色</div>
                    </div>
                    <div v-for="chat in characterList" :key="chat.id" class="contact-item" @click="selectCharacter(chat)">
                        <div class="qq-avatar" :style="{ backgroundImage: 'url(' + (chat.avatar || 'https://i.postimg.cc/4N1jy7hV/wu-biao-ti98-20260205164643.jpg') + ')' }"></div>
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
