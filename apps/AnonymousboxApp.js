import { ref, computed, toRef, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        qqData: Object,
        apiConfig: Object
    },
    emits: ['close'],
    setup(props, { emit }) {
        const activeTab = ref('home');
        const selectedPost = ref(null);
        const searchQuery = ref('');
        const searchResults = ref([]);
        const isSearching = ref(false);
        const newComment = ref('');
        const isSettingsOpen = ref(false);
        const isGenerating = ref(false);

        // 从 props 中获取响应式引用
        const username = toRef(props.qqData, 'anonymousUsername');
        const posts = toRef(props.qqData, 'anonymousPosts');
        
        // 确保配置数组存在
        if (props.qqData && !props.qqData.anonymousConfigs) {
            props.qqData.anonymousConfigs = [];
        }

        // 挂载时初始化数据
        onMounted(() => {
            if (!posts.value || posts.value.length === 0) {
                posts.value = [
                    {
                        id: 1,
                        author: '某同学',
                        content: '最近压力好大，想去海边吹吹风。',
                        views: Math.floor(Math.random() * 9000) + 1000,
                        comments: [
                            { id: 101, author: '路人A', content: '抱抱楼主' },
                            { id: 102, author: '路人B', content: '+1，我也想去' }
                        ]
                    },
                    {
                        id: 2,
                        author: '匿名用户',
                        content: '食堂今天的红烧肉居然卖完了，难过。',
                        views: Math.floor(Math.random() * 9000) + 1000,
                        comments: [
                            { id: 201, author: '早起的鸟儿', content: '早起的鸟儿有虫吃' },
                            { id: 202, author: '迟到大王', content: '去晚了确实没了' }
                        ]
                    },
                    {
                        id: 3,
                        author: '深夜诗人',
                        content: '今晚的月色真美，适合写代码。',
                        views: Math.floor(Math.random() * 9000) + 1000,
                        comments: [
                            { id: 301, author: '秃头程序猿', content: '代码写完了吗就在这看月亮' }
                        ]
                    }
                ];
            }
        });

        const addComment = () => {
            if (!newComment.value.trim()) return;
            if (selectedPost.value) {
                selectedPost.value.comments.push({
                    id: Date.now(),
                    author: username.value === '点击修改昵称' ? '匿名用户' : username.value,
                    content: newComment.value
                });
                newComment.value = '';
            }
        };

        // Settings Logic
        const getFriendConfig = (chatId) => {
            if (!props.qqData || !props.qqData.anonymousConfigs) return null;
            return props.qqData.anonymousConfigs.find(c => c.id === chatId);
        };

        const isSelected = (chatId) => {
            return !!getFriendConfig(chatId);
        };

        const toggleFriend = (chat) => {
            if (!props.qqData.anonymousConfigs) props.qqData.anonymousConfigs = [];
            const idx = props.qqData.anonymousConfigs.findIndex(c => c.id === chat.id);
            if (idx > -1) {
                props.qqData.anonymousConfigs.splice(idx, 1);
            } else {
                props.qqData.anonymousConfigs.push({
                    id: chat.id,
                    originName: chat.remark || chat.name,
                    anonymousName: '匿名用户', 
                    avatar: 'https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg'
                });
            }
        };

        const searchPosts = async () => {
            if (isSearching.value || !searchQuery.value.trim()) return;
            if (!props.apiConfig || !props.apiConfig.endpoint || !props.apiConfig.key) {
                alert("请先在系统设置中配置 API 端点和密钥");
                return;
            }

            isSearching.value = true;
            searchResults.value = []; // 清空旧结果

            try {
                const prompt = `生成5则关于"${searchQuery.value.trim()}"的匿名社交媒体帖文的JSON数组。
要求：
1. 帖文内容必须与关键词"${searchQuery.value.trim()}"紧密相关。
2. 严禁涉及政治话题。
3. 这是一个完全匿名的树洞/吐槽版，严禁出现“认亲”情节，严禁提及真实姓名。
4. 评论区规则：
   - 评论分为普通评论和回复。评论者大多数是随机的匿名路人。
   - 帖子的作者（楼主）可以随机对评论区的留言进行回复。
   - 如果是针对特定评论的回复，评论对象中必须包含 "replyToId": [被回复评论的id] 字段。
   - 重要：当生成一个回复时 (即包含 replyToId)，其 "content" 字段本身不应再包含 "回复@xxx" 或 "@xxx" 等指向性文本，UI会处理回复的展示。
   - 如果作者（楼主）回复，评论的 "author" 字段必须与帖子的 "author" 字段完全一致。
   - 严禁 User（玩家）出现在评论区。
5. 所有帖文作者和评论者都必须是路人NPC，不要使用任何特定角色人设。
6. 每则帖文包含：
   - id: 唯一数字ID
   - author: 创意匿名昵称
   - content: 帖文内容
   - views: 随机浏览量 (1000-10000)
   - comments: 评论数组 (随机0-5条)，每个评论包含 id, author, content, 以及可选的 replyToId。
7. 返回格式必须是纯 JSON 数组，不要包含 markdown 代码块标记。`;

                let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
                if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

                const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${props.apiConfig.key}`
                    },
                    body: JSON.stringify({
                        model: props.apiConfig.model || 'gpt-3.5-turbo',
                        messages: [
                            { role: "system", content: "你是一个模拟社交媒体数据的助手。请只返回 JSON 数据。" },
                            { role: "user", content: prompt }
                        ],
                        temperature: props.apiConfig.temperature || 0.7
                    })
                });

                if (!response.ok) {
                    throw new Error(`API 请求失败: ${response.status}`);
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                
                content = content.replace(/```json/g, '').replace(/```/g, '').trim();
                
                const newPosts = JSON.parse(content);
                
                if (Array.isArray(newPosts)) {
                    const timestamp = Date.now();
                    searchResults.value = newPosts.map((p, index) => {
                        const postWithUniqueId = { ...p, id: timestamp + index };

                        // Step 1: Normalize comments and give them temporary, yet unique, string IDs
                        const tempComments = (p.comments || []).map((c, cIndex) => {
                            const base = typeof c === 'string' ? { content: c, author: '匿名路人' } : c;
                            const tempId = base.id !== undefined ? `p${index}-id${base.id}` : `p${index}-idx${cIndex}`;
                            return {
                                ...base,
                                tempId,
                                content: base.content || base.text || '...'
                            };
                        });

                        const commentsById = new Map(tempComments.map(c => [c.tempId, c]));
                        
                        // Step 2: Build the final ordered list
                        const finalOrderedComments = [];
                        const replies = [];
                        const processedReplies = new Set();

                        // Separate top-level and replies
                        tempComments.forEach(c => {
                            const replyToTempId = c.replyToId !== undefined ? `p${index}-id${c.replyToId}` : null;
                            if (replyToTempId && commentsById.has(replyToTempId)) {
                                replies.push({ ...c, replyToTempId });
                            } else {
                                finalOrderedComments.push(c);
                            }
                        });

                        // Insert replies right after their parents
                        for (let i = finalOrderedComments.length - 1; i >= 0; i--) {
                            const parent = finalOrderedComments[i];
                            const repliesToParent = replies.filter(r => r.replyToTempId === parent.tempId && !processedReplies.has(r.tempId));
                            
                            if (repliesToParent.length > 0) {
                                const enrichedReplies = repliesToParent.map(r => {
                                    processedReplies.add(r.tempId);
                                    return { ...r, isReply: true, replyToAuthor: parent.author };
                                });
                                finalOrderedComments.splice(i + 1, 0, ...enrichedReplies);
                            }
                        }

                        // Step 3: Assign final numeric IDs for Vue's :key
                        postWithUniqueId.comments = finalOrderedComments.map((c, cIndex) => ({
                            ...c,
                            id: timestamp + index + 100 + cIndex
                        }));

                        return postWithUniqueId;
                    });
                } else {
                    throw new Error("返回的数据格式不正确");
                }

            } catch (error) {
                console.error("搜索生成失败:", error);
                alert("搜索生成失败: " + error.message);
            } finally {
                isSearching.value = false;
            }
        };

        const generatePosts = async () => {
            if (isGenerating.value) return;
            if (!props.apiConfig || !props.apiConfig.endpoint || !props.apiConfig.key) {
                alert("请先在系统设置中配置 API 端点和密钥");
                return;
            }

            isGenerating.value = true;
            try {
                // 1. 检查是否有已勾选的角色
                let selectedRolesContext = "";
                if (props.qqData && props.qqData.anonymousConfigs && props.qqData.anonymousConfigs.length > 0) {
                    // 随机抽取 1-2 个角色
                    const shuffled = [...props.qqData.anonymousConfigs].sort(() => 0.5 - Math.random());
                    const targetConfigs = shuffled.slice(0, 2);

                    for (const config of targetConfigs) {
                        const chat = props.qqData.chatList.find(c => c.id === config.id);
                        if (chat) {
                            selectedRolesContext += `\n\n【特定角色要求】\n请务必生成一则基于角色 "${config.originName}" (ID: ${config.id}) 的帖文。\n`;
                            selectedRolesContext += `- 建议使用的匿名昵称: "${config.anonymousName || '匿名用户'}"\n`;
                            
                            // 提取人设
                            if (chat.aiPersona) selectedRolesContext += `- 角色人设: ${chat.aiPersona}\n`;
                            if (chat.userPersona) selectedRolesContext += `- 互动对象(User)人设: ${chat.userPersona}\n`;
                            
                            // 提取 NPC
                            if (chat.npcList && chat.npcList.length > 0) {
                                const npcSummary = chat.npcList.map(n => `${n.name}(${n.relation})`).join(', ');
                                selectedRolesContext += `- 相关NPC: ${npcSummary}\n`;
                            }

                            // 提取最近上下文 (最近 100 条)
                            if (chat.messages && chat.messages.length > 0) {
                                const recentMsgs = chat.messages.slice(-100)
                                    .filter(m => m.type === 'text')
                                    .map(m => `${m.role === 'user' ? 'User' : 'Char'}: ${m.content}`)
                                    .join('\n');
                                // 截断以防过长 (约 1000 字)
                                selectedRolesContext += `- 最近对话片段: \n${recentMsgs.slice(-1000)}\n`;
                            }

                            selectedRolesContext += `\n要求：这则帖文必须符合该角色的性格、语气，内容可以隐晦地影射上述对话经历或人设细节。必须在该帖文对象中添加字段 "roleId": ${config.id}。\n`;
                        }
                    }
                }

                const prompt = `生成7则匿名社交媒体帖文的JSON数组。
要求：
1. 帖文内容可以是分享生活大小事（好事、坏事），也可以是有争议性的话题。
2. 严禁涉及政治话题。
3. 这是一个完全匿名的树洞/吐槽版，严禁出现“认亲”情节（如“你是XXX吧？”），严禁在帖文或评论中提及任何角色的真实姓名。
4. 评论区规则：
   - 在全部7则帖文中，随机选择大约3则，在其中加入作者（楼主）的回复。
   - 评论分为普通评论和回复。评论者大多数是随机的匿名路人。
   - 如果是针对特定评论的回复，评论对象中必须包含 "replyToId": [被回复评论的id] 字段。
   - 重要：当生成一个回复时 (即包含 replyToId)，其 "content" 字段本身不应再包含 "回复@xxx" 或 "@xxx" 等指向性文本，UI会处理回复的展示。
   - 如果作者（楼主）回复，评论的 "author" 字段必须与帖子的 "author" 字段完全一致。
   - 严禁 User（玩家）出现在评论区。User 的人设仅作为角色帖文内容的背景板（例如角色在吐槽 User），绝不能作为互动者出现。
5. 每则帖文包含：
   - id: 唯一数字ID
   - author: 创意匿名昵称
   - content: 帖文内容
   - views: 随机浏览量 (1000-10000)
   - comments: 评论数组 (随机0-7条)，每个评论对象必须包含：
     - id: 唯一数字ID
     - author: 评论者昵称
     - content: 评论内容 (赞同、反对或吃瓜)
     - replyToId: (可选) 如果是回复，则为被回复评论的ID
   - roleId: (可选) 如果是基于特定角色生成的，请填入对应的数字ID。
${selectedRolesContext}
6. 返回格式必须是纯 JSON 数组，不要包含 markdown 代码块标记。`;

                let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
                if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

                const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${props.apiConfig.key}`
                    },
                    body: JSON.stringify({
                        model: props.apiConfig.model || 'gpt-3.5-turbo',
                        messages: [
                            { role: "system", content: "你是一个模拟社交媒体数据的助手。请只返回 JSON 数据。" },
                            { role: "user", content: prompt }
                        ],
                        temperature: props.apiConfig.temperature || 0.7
                    })
                });

                if (!response.ok) {
                    throw new Error(`API 请求失败: ${response.status}`);
                }

                const data = await response.json();
                let content = data.choices[0].message.content;
                
                // 清理可能存在的 markdown 标记
                content = content.replace(/```json/g, '').replace(/```/g, '').trim();
                
                const newPosts = JSON.parse(content);
                
                if (Array.isArray(newPosts)) {
                    const timestamp = Date.now();
                    const processedNewPosts = newPosts.map((p, index) => {
                        const postWithUniqueId = { ...p, id: timestamp + index };

                        // Step 1: Normalize comments and give them temporary, yet unique, string IDs
                        const tempComments = (p.comments || []).map((c, cIndex) => {
                            const base = typeof c === 'string' ? { content: c, author: '匿名路人' } : c;
                            const tempId = base.id !== undefined ? `p${index}-id${base.id}` : `p${index}-idx${cIndex}`;
                            return {
                                ...base,
                                tempId,
                                content: base.content || base.text || '...'
                            };
                        });

                        const commentsById = new Map(tempComments.map(c => [c.tempId, c]));
                        
                        // Step 2: Build the final ordered list
                        const finalOrderedComments = [];
                        const replies = [];
                        const processedReplies = new Set();

                        // Separate top-level and replies
                        tempComments.forEach(c => {
                            const replyToTempId = c.replyToId !== undefined ? `p${index}-id${c.replyToId}` : null;
                            if (replyToTempId && commentsById.has(replyToTempId)) {
                                replies.push({ ...c, replyToTempId });
                            } else {
                                finalOrderedComments.push(c);
                            }
                        });

                        // Insert replies right after their parents
                        for (let i = finalOrderedComments.length - 1; i >= 0; i--) {
                            const parent = finalOrderedComments[i];
                            const repliesToParent = replies.filter(r => r.replyToTempId === parent.tempId && !processedReplies.has(r.tempId));
                            
                            if (repliesToParent.length > 0) {
                                const enrichedReplies = repliesToParent.map(r => {
                                    processedReplies.add(r.tempId);
                                    return { ...r, isReply: true, replyToAuthor: parent.author };
                                });
                                finalOrderedComments.splice(i + 1, 0, ...enrichedReplies);
                            }
                        }

                        // Step 3: Assign final numeric IDs for Vue's :key
                        postWithUniqueId.comments = finalOrderedComments.map((c, cIndex) => ({
                            ...c,
                            id: timestamp + index + 100 + cIndex
                        }));

                        return postWithUniqueId;
                    });

                    // 合并旧帖子，新帖子在前
                    const currentPosts = Array.isArray(posts.value) ? posts.value : [];
                    const allPosts = [...processedNewPosts, ...currentPosts];

                    // 只保留最近 14 条
                    posts.value = allPosts.slice(0, 14);
                } else {
                    throw new Error("返回的数据格式不正确");
                }

            } catch (error) {
                console.error("生成帖文失败:", error);
                alert("生成失败: " + error.message);
            } finally {
                isGenerating.value = false;
            }
        };

        return { 
            activeTab, posts, selectedPost, username, searchQuery, searchResults, isSearching, newComment, addComment,
            isSettingsOpen, getFriendConfig, isSelected, toggleFriend, generatePosts, isGenerating, searchPosts
        };
    },
    template: `
    <div class="app-window" style="background: #fff; display: flex; flex-direction: column;" :class="{ open: isOpen }">
        <!-- 顶部刘海栏 -->
        <div class="app-header" 
             style="height: 60px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: center; align-items: center; position: relative; flex-shrink: 0; margin-top: env(safe-area-inset-top);">
            
            <!-- 左侧关闭按钮 -->
            <button @click="selectedPost ? selectedPost = null : $emit('close')" style="background: transparent; border: none; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,0.6); position: absolute; left: 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>
            
            <!-- 中间图片 -->
            <div style="height: 100%; display: flex; align-items: center;">
                <img src="https://i.postimg.cc/Dz3nLxmG/Magic-Eraser-260203-124925.png" alt="Logo" style="height: 30px; object-fit: contain;">
            </div>

            <!-- 右侧设置按钮 (齿轮) -->
            <button v-if="activeTab === 'profile' && !selectedPost" @click="isSettingsOpen = true" style="background: transparent; border: none; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,0.6); position: absolute; right: 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>

            <!-- 右侧生成按钮 (刷新图标) -->
            <button v-if="activeTab === 'home' && !selectedPost" @click="generatePosts" :disabled="isGenerating" style="background: transparent; border: none; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,0.6); position: absolute; right: 15px;">
                <svg v-if="!isGenerating" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <svg v-else class="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
            </button>
            <style>
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            </style>
            
        </div>
        
        <!-- 内容区域 -->
        <div class="app-content" style="flex: 1; overflow-y: auto; padding: 0;">
            <!-- 全局详情页 -->
            <div v-if="selectedPost">
                <!-- 帖子详情 -->
                <div style="padding: 20px; border-bottom: 8px solid #f5f5f5;">
                    <div style="display: flex; gap: 12px; margin-bottom: 15px;">
                        <img src="https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                        <div>
                            <div style="font-size: 14px; color: #999; display: flex; align-items: center;">
                                {{ selectedPost.author }}
                                <span v-if="selectedPost.roleId && isSelected(selectedPost.roleId)" style="margin-left: 4px; font-size: 12px; color: #000;" title="特别关注">✦</span>
                            </div>
                            <div style="font-size: 12px; color: #ccc;">刚刚 · {{ selectedPost.views }} 次浏览</div>
                        </div>
                    </div>
                    <div style="font-size: 18px; color: #333; line-height: 1.5; margin-bottom: 15px;">{{ selectedPost.content }}</div>
                </div>

                <!-- 评论列表 -->
                <div style="padding: 20px; padding-bottom: 80px;">
                    <div style="font-size: 14px; font-weight: bold; margin-bottom: 15px;">全部留言 ({{ selectedPost.comments.length }})</div>
                    <div v-for="comment in selectedPost.comments" :key="comment.id" 
                            style="display: flex; gap: 10px;"
                            :style="{ 
                                'margin-left': comment.isReply ? '40px' : '0', 
                                'margin-top': comment.isReply ? '12px' : '20px',
                                'margin-bottom': comment.isReply ? '12px' : '0'
                            }">
                        <img src="https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg" 
                             :style="{ 
                                 width: comment.isReply ? '28px' : '30px', 
                                 height: comment.isReply ? '28px' : '30px' 
                             }"
                             style="border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                        <div style="flex: 1;">
                            <div style="font-size: 13px; color: #999; margin-bottom: 2px; display: flex; align-items: center;">
                                <span>{{ comment.author }}</span>
                                <span v-if="comment.author === selectedPost.author" style="font-size: 10px; color: #fff; background: #007bff; padding: 1px 5px; border-radius: 8px; margin-left: 6px;">楼主</span>
                            </div>
                            <div style="font-size: 15px; color: #333; line-height: 1.4;">
                                <span v-if="comment.isReply && comment.replyToAuthor" style="color: #555; font-weight: normal;">
                                    <span style="color: #007bff; font-weight: 500;">@{{ comment.replyToAuthor }}</span>: 
                                </span>
                                {{ comment.content }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 底部评论输入框 -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 15px; background: #fff; border-top: 1px solid #eee; display: flex; gap: 10px; align-items: center;">
                    <input v-model="newComment" type="text" placeholder="说点什么..." 
                            style="flex: 1; padding: 8px 12px; border-radius: 20px; border: 1px solid #ddd; background: #f5f5f5; outline: none; font-size: 14px;">
                    <button @click="addComment" 
                            style="background: #000; color: #fff; border: none; padding: 6px 15px; border-radius: 15px; font-size: 13px; cursor: pointer;"
                            :style="{ opacity: newComment.trim() ? 1 : 0.5 }">
                        发送
                    </button>
                </div>
            </div>

            <!-- Tab 内容 -->
            <div v-else>
                <div v-if="activeTab === 'home'">
                    <!-- 列表模式 -->
                    <div v-for="post in posts" :key="post.id" @click="selectedPost = post" 
                            style="padding: 15px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 12px; cursor: pointer;">
                        <!-- 头像 -->
                        <img src="https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                        <!-- 内容 -->
                        <div style="flex: 1;">
                            <div style="font-size: 14px; color: #999; margin-bottom: 4px; display: flex; align-items: center;">
                                {{ post.author }}
                                <span v-if="post.roleId && isSelected(post.roleId)" style="margin-left: 4px; font-size: 12px; color: #000;" title="特别关注">✦</span>
                            </div>
                            <div style="font-size: 16px; color: #333; line-height: 1.4;">{{ post.content }}</div>
                            <div style="font-size: 12px; color: #ccc; margin-top: 8px;">{{ post.comments.length }} 条留言 · {{ post.views }} 次浏览</div>
                        </div>
                    </div>
                </div>

                <div v-if="activeTab === 'search'" style="padding: 20px;">
                    <!-- 搜索栏 -->
                    <div style="position: relative; margin-bottom: 15px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%);">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input v-model="searchQuery" @keyup.enter="searchPosts" type="text" placeholder="搜索关键词 (回车生成)" style="width: 100%; padding: 10px 10px 10px 36px; border-radius: 20px; border: none; background: #f5f5f5; font-size: 14px; outline: none;">
                    </div>
                    
                    <!-- 分割线 -->
                    <div style="width: 100%; height: 1px; background-color: #eee; margin-bottom: 20px;"></div>

                    <!-- 搜索状态 -->
                    <div v-if="isSearching" style="text-align: center; color: #999; margin-top: 50px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <svg class="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                        <span>正在生成相关帖文...</span>
                    </div>

                    <!-- 搜索结果 -->
                    <div v-else-if="searchResults.length > 0">
                        <div v-for="post in searchResults" :key="post.id" @click="selectedPost = post" 
                             style="padding: 15px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 12px; cursor: pointer;">
                            <!-- 头像 -->
                            <img src="https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                            <!-- 内容 -->
                            <div style="flex: 1;">
                                <div style="font-size: 14px; color: #999; margin-bottom: 4px; display: flex; align-items: center;">
                                    {{ post.author }}
                                </div>
                                <div style="font-size: 16px; color: #333; line-height: 1.4;">{{ post.content }}</div>
                                <div style="font-size: 12px; color: #ccc; margin-top: 8px;">{{ post.comments.length }} 条留言 · {{ post.views }} 次浏览</div>
                            </div>
                        </div>
                    </div>

                    <!-- 空状态 -->
                    <div v-else style="text-align: center; color: #999; margin-top: 50px;">
                        输入关键词并回车搜索
                    </div>
                </div>
            <div v-if="activeTab === 'profile'" style="padding: 20px; display: flex; flex-direction: column; align-items: center;">
                <!-- 头像 -->
                <img src="https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg" 
                     style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-top: 0; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- 可编辑用户名 -->
                <input v-model="username" 
                       style="border: none; background: transparent; font-size: 16px; font-weight: bold; text-align: center; color: #333; outline: none; width: 100%; margin-bottom: 30px;"
                       placeholder="点击设置昵称">
                
                <!-- 分割线 -->
                <div style="width: 100%; height: 1px; background-color: #eee; margin-bottom: 30px;"></div>
                
                <!-- 匿名问答箱按钮 -->
                <div style="width: 100%; background: #fff; color: #000; border: 1px solid #000; padding: 20px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">匿名问答箱</div>
                        <div style="font-size: 12px; color: #666;">向我提问或分享秘密</div>
                    </div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            </div>
        </div>

        <!-- 底部导航栏 -->
        <div style="height: calc(55px + env(safe-area-inset-bottom)); border-top: 1px solid #eee; display: flex; background: #fff; flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom);">
            <div @click="activeTab = 'home'" 
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
                 :style="{ color: activeTab === 'home' ? '#000' : '#999' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span style="font-size: 10px; margin-top: 4px;">首页</span>
            </div>
            <div @click="activeTab = 'search'" 
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
                 :style="{ color: activeTab === 'search' ? '#000' : '#999' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span style="font-size: 10px; margin-top: 4px;">搜索</span>
            </div>
            <div @click="activeTab = 'profile'" 
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
                 :style="{ color: activeTab === 'profile' ? '#000' : '#999' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span style="font-size: 10px; margin-top: 4px;">我的</span>
            </div>
        </div>

        <!-- 设置弹窗 (长窗口) -->
        <div v-if="isSettingsOpen" class="modal-overlay center-popup" style="z-index: 3000;" @click.self="isSettingsOpen = false">
            <div class="modal-content" style="width: 85%; max-width: 400px; height: 70vh; display: flex; flex-direction: column; padding: 0; border-radius: 16px; overflow: hidden;">
                <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff;">
                    <div style="font-weight: bold; font-size: 16px;">匿名角色配置</div>
                    <button @click="isSettingsOpen = false" style="border: none; background: none; color: #666; font-size: 14px; cursor: pointer;">关闭</button>
                </div>
                
                <div style="flex: 1; overflow-y: auto; padding: 15px; background: #f9f9f9;">
                    <div v-if="!qqData || !qqData.chatList || qqData.chatList.length === 0" style="text-align: center; color: #999; padding: 20px;">
                        暂无好友数据
                    </div>
                    <div v-else>
                        <div v-for="chat in qqData.chatList" :key="chat.id" 
                             style="background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            
                            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                <!-- 选择框 -->
                                <div @click="toggleFriend(chat)" 
                                     style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #ddd; margin-right: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                                     :style="{ borderColor: isSelected(chat.id) ? '#000' : '#ddd', background: isSelected(chat.id) ? '#000' : '#fff' }">
                                    <svg v-if="isSelected(chat.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                
                                <!-- 原头像 -->
                                <div :style="{ backgroundImage: 'url(' + (chat.avatar || '') + ')' }" 
                                     style="width: 36px; height: 36px; border-radius: 50%; background-size: cover; background-position: center; background-color: #eee; margin-right: 10px;"></div>
                                
                                <!-- 原名 -->
                                <div style="font-weight: bold; font-size: 14px; color: #333;">{{ chat.remark || chat.name }}</div>
                            </div>

                            <!-- 选中后显示的配置项 -->
                            <div v-if="isSelected(chat.id)" style="padding-left: 30px; border-top: 1px solid #f0f0f0; padding-top: 10px; margin-top: 5px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <!-- 统一的匿名头像 -->
                                    <img src="https://i.postimg.cc/FzpvpPHf/23F4E5EC-F5C4-4BB1-854A-3330E4F5BDB9.jpg" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                                    
                                    <!-- 匿名昵称输入 -->
                                    <input v-model="getFriendConfig(chat.id).anonymousName" 
                                           placeholder="设置匿名昵称"
                                           style="flex: 1; border: 1px solid #eee; background: #f5f5f5; padding: 6px 10px; border-radius: 6px; font-size: 13px; outline: none;">
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};
