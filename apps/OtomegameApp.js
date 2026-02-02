import { ref, reactive, computed, watch, nextTick, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        qqData: Object,
        apiConfig: Object
    },
    emits: ['close'],
    setup(props, { emit }) {
        // 主题颜色配置
        const themes = {
            pink: { primary: '#FFB6C1', secondary: '#FFFFFF', name: '粉白' },
            blue: { primary: '#87CEEB', secondary: '#FFFFFF', name: '蓝白' },
            yellow: { primary: '#FFD700', secondary: '#FFFFFF', name: '黄白' },
            green: { primary: '#90EE90', secondary: '#FFFFFF', name: '绿白' },
            purple: { primary: '#DDA0DD', secondary: '#FFFFFF', name: '紫白' }
        };
        
        const currentTheme = ref('pink');
        
        // 世界书数据
        const worldbooks = ref([]);
        const selectedWorldbookIds = ref([]);

        // 监听世界书选择并保存
        watch(selectedWorldbookIds, async (newVal) => {
            await localforage.setItem('otome_selected_worldbook_ids', JSON.parse(JSON.stringify(newVal)));
        }, { deep: true });

        // 预设场景
        const defaultScenes = [
            { 
                id: 1, 
                name: '樱花公园', 
                image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=300&fit=crop',
                description: '春日的樱花树下，粉色花瓣随风飘落'
            },
            { 
                id: 2, 
                name: '浪漫咖啡厅', 
                image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
                description: '温馨的咖啡厅，充满浪漫的气氛'
            },
            { 
                id: 3, 
                name: '安静图书馆', 
                image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=300&fit=crop',
                description: '书香四溢的图书馆，知识的殿堂'
            },
            { 
                id: 4, 
                name: '黄昏海边', 
                image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
                description: '夕阳西下的海滩，浪漫而宁静'
            }
        ];
        
        // 场景数据 (初始为默认，稍后异步加载)
        const scenes = ref(defaultScenes);
        
        // 监听场景变化并保存
        watch(scenes, async (newVal) => {
            await localforage.setItem('otome_scenes', JSON.stringify(newVal));
        }, { deep: true });
        
        // 模态框状态
        const isAddSceneModalOpen = ref(false);
        const isThemeModalOpen = ref(false);
        const isRoleSelectModalOpen = ref(false); // 角色选择模态框
        const isContactListOpen = ref(false); // 联系人列表
        const isGameInterfaceOpen = ref(false); // 游戏互动界面
        const isSettingsOpen = ref(false); // 设置弹窗
        const isCustomReplyOpen = ref(false); // 自定义回复弹窗
        const isExitModalOpen = ref(false); // 退出确认弹窗
        const isStoryLogOpen = ref(false); // 剧情记录弹窗
        
        // 已保存的剧情
        const savedStories = ref([]);

        // 当前选择的场景
        const selectedScene = ref(null);
        
        // 当前模式：'new' 新增角色，'existing' 已有角色
        const currentMode = ref('new');
        
        // 从QQ App读取真实联系人列表
        const contacts = computed(() => {
            if (!props.qqData) {
                return [];
            }
            if (!props.qqData.chatList) {
                return [];
            }
            return props.qqData.chatList.map(chat => ({
                id: chat.id,
                name: chat.remark || chat.name,
                avatar: chat.avatar || '',
                status: '在线',
                aiPersona: chat.aiPersona || '',
                userPersona: chat.userPersona || ''
            }));
        });
        
        // 当前选择的联系人
        const selectedContact = ref(null);

        // 角色配置存储
        const roleSettings = ref({});
        
        // 游戏对话内容
        const dialogueText = ref('欢迎来到恋爱轮盘！点击右上角设置开始配置你的故事...');
        
        // 游戏状态
        const isLoading = ref(false);
        const chatHistory = ref([]);
        const options = ref([]);
        const showOptions = ref(false);
        const dialogueQueue = ref([]); // 待显示的句子队列
        const isTyping = ref(false); // 是否正在打字
        const customReply = ref('');
        const fullTextToDisplay = ref(''); // 当前正在打字的完整文本
        const typingInterval = ref(null);
        const isGameStarted = ref(false);

        // 角色配置表单（新增角色）
        const characterForm = reactive({
            name: '',
            persona: '',
            userInfo: '',
            scenePrompt: '',
            writingStyle: '',
            image: '',
            imageSize: 300,
            imagePosition: { x: 0, y: 0 }
        });
        
        // 场景配置表单（已有角色）
        const sceneForm = reactive({
            scenePrompt: '',
            writingStyle: '',
            image: '',
            imageSize: 300,
            imagePosition: { x: 0, y: 0 }
        });
        
        // 新场景表单
        const newScene = reactive({
            name: '',
            image: '',
            description: ''
        });
        
        // 当前主题配置
        const currentThemeConfig = computed(() => themes[currentTheme.value]);
        
        // 打开添加场景模态框
        const openAddSceneModal = () => {
            newScene.name = '';
            newScene.image = '';
            newScene.description = '';
            isAddSceneModalOpen.value = true;
        };
        
        // 添加新场景
        const addScene = () => {
            if (!newScene.name.trim()) {
                alert('请输入场景名称');
                return;
            }
            
            // 默认图片
            const defaultImage = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=300&fit=crop';
            
            scenes.value.push({
                id: Date.now(),
                name: newScene.name.trim(),
                image: newScene.image.trim() || defaultImage,
                description: newScene.description.trim() || '自定义场景'
            });
            
            isAddSceneModalOpen.value = false;
        };
        
        // 删除场景
        const deleteScene = (id) => {
            if (confirm('确定要删除这个场景吗？')) {
                scenes.value = scenes.value.filter(s => s.id !== id);
            }
        };
        
        // 切换主题
        const changeTheme = (themeName) => {
            currentTheme.value = themeName;
            isThemeModalOpen.value = false;
        };
        
        // 选择场景 - 打开角色选择模态框
        const selectScene = (scene) => {
            selectedScene.value = scene;
            isRoleSelectModalOpen.value = true;
        };
        
        // 选择"跟QQ已有的角色"
        const selectExistingRole = () => {
            currentMode.value = 'existing';
            isRoleSelectModalOpen.value = false;
            isContactListOpen.value = true;
        };
        
        // 选择"新增角色"
        const selectNewRole = () => {
            currentMode.value = 'new';
            isRoleSelectModalOpen.value = false;
            isGameInterfaceOpen.value = true;
            resetGame();
            dialogueText.value = `欢迎来到【${selectedScene.value.name}】！点击右上角设置来配置你的角色和故事...`;
        };
        
        // 选择联系人
        const selectContact = (contact) => {
            selectedContact.value = contact;
            isContactListOpen.value = false;
            isGameInterfaceOpen.value = true;
            resetGame();
            
            // 加载已保存的配置或自动填充
            if (roleSettings.value[contact.id]) {
                const settings = roleSettings.value[contact.id];
                sceneForm.scenePrompt = settings.scenePrompt || selectedScene.value.description || `现在你们在【${selectedScene.value.name}】相遇。`;
                sceneForm.writingStyle = settings.writingStyle || '';
                sceneForm.image = settings.image || '';
                sceneForm.imageSize = settings.imageSize || 300;
                sceneForm.imagePosition = settings.imagePosition || { x: 0, y: 0 };
            } else {
                // 自动填充场景配置表单
                sceneForm.scenePrompt = selectedScene.value.description || `现在你们在【${selectedScene.value.name}】相遇。`;
                sceneForm.writingStyle = '';
                sceneForm.image = '';
                sceneForm.imageSize = 300;
                sceneForm.imagePosition = { x: 0, y: 0 };
            }
            
            dialogueText.value = `你与【${contact.name}】在【${selectedScene.value.name}】相遇了...点击右上角设置来配置场景详情。`;
        };
        
        // 重置游戏状态
        const resetGame = () => {
            chatHistory.value = [];
            options.value = [];
            showOptions.value = false;
            dialogueQueue.value = [];
            isTyping.value = false;
            isGameStarted.value = false;
            if (typingInterval.value) clearInterval(typingInterval.value);
        };

        // 返回场景列表
        const backToSceneList = () => {
            isGameInterfaceOpen.value = false;
            selectedScene.value = null;
            selectedContact.value = null;
            resetGame();
        };

        // 处理返回按钮点击
        const handleBackClick = () => {
            // 如果游戏已经开始且有对话历史（除了初始的system和user prompt），则询问是否保存
            if (isGameStarted.value && chatHistory.value.length > 2) {
                isExitModalOpen.value = true;
            } else {
                backToSceneList();
            }
        };

        // 确认退出
        const confirmExit = async (save) => {
            if (save) {
                const roleName = currentMode.value === 'new' ? characterForm.name : selectedContact.value.name;
                
                // 过滤掉 system 消息和初始设置消息
                const cleanHistory = chatHistory.value.filter(msg => {
                    if (msg.role === 'system') return false;
                    // 简单的判断：如果内容包含 "角色人设" 且是 user 发送的，认为是初始设置
                    if (msg.role === 'user' && msg.content.includes('角色人设')) return false;
                    return true;
                });

                const story = {
                    id: Date.now(),
                    date: new Date().toLocaleString(),
                    scene: selectedScene.value.name,
                    role: roleName,
                    history: JSON.parse(JSON.stringify(cleanHistory))
                };
                savedStories.value.unshift(story); // 添加到开头
                await localforage.setItem('otome_saved_stories', JSON.stringify(savedStories.value));
            }
            isExitModalOpen.value = false;
            backToSceneList();
        };

        // 打开剧情记录
        const openStoryLog = () => {
            isStoryLogOpen.value = true;
        };

        // 删除剧情记录
        const deleteStory = async (id) => {
            if (confirm('确定要删除这条记录吗？')) {
                savedStories.value = savedStories.value.filter(s => s.id !== id);
                await localforage.setItem('otome_saved_stories', JSON.stringify(savedStories.value));
            }
        };
        
        // 返回联系人列表
        const backToContactList = () => {
            isGameInterfaceOpen.value = false;
            isContactListOpen.value = true;
        };
        
        // 打开设置弹窗
        const openSettings = () => {
            isSettingsOpen.value = true;
        };
        
        // --- 预设管理逻辑 ---
        const scenePresets = ref([]);
        const characterPresets = ref([]);
        const selectedScenePresetId = ref('');
        const selectedCharacterPresetId = ref('');
        const isPresetModalOpen = ref(false);
        const presetNameInput = ref('');

        // 监听预设变化并保存
        watch(scenePresets, async (val) => await localforage.setItem('otome_scene_presets', JSON.stringify(val)), { deep: true });
        watch(characterPresets, async (val) => await localforage.setItem('otome_character_presets', JSON.stringify(val)), { deep: true });

        // 打开预设管理模态框
        const openPresetModal = () => {
            presetNameInput.value = '';
            isPresetModalOpen.value = true;
        };

        // 应用预设
        const applyPreset = () => {
            if (currentMode.value === 'new') {
                const preset = characterPresets.value.find(p => p.id === selectedCharacterPresetId.value);
                if (preset) {
                    characterForm.name = preset.charName || '';
                    characterForm.persona = preset.persona || '';
                    characterForm.userInfo = preset.userInfo || '';
                    characterForm.scenePrompt = preset.scenePrompt || '';
                    characterForm.writingStyle = preset.writingStyle || '';
                    characterForm.image = preset.image || '';
                    characterForm.imageSize = preset.imageSize || 300;
                    characterForm.imagePosition = preset.imagePosition || { x: 0, y: 0 };
                }
            } else {
                const preset = scenePresets.value.find(p => p.id === selectedScenePresetId.value);
                if (preset) {
                    sceneForm.scenePrompt = preset.scenePrompt || '';
                    sceneForm.writingStyle = preset.writingStyle || '';
                    sceneForm.image = preset.image || '';
                    sceneForm.imageSize = preset.imageSize || 300;
                    sceneForm.imagePosition = preset.imagePosition || { x: 0, y: 0 };
                }
            }
        };

        // 保存新预设
        const saveNewPreset = () => {
            if (!presetNameInput.value.trim()) {
                alert('请输入预设名称');
                return;
            }
            
            const newId = Date.now().toString();
            
            if (currentMode.value === 'new') {
                characterPresets.value.push({
                    id: newId,
                    presetName: presetNameInput.value.trim(),
                    charName: characterForm.name,
                    persona: characterForm.persona,
                    userInfo: characterForm.userInfo,
                    scenePrompt: characterForm.scenePrompt,
                    writingStyle: characterForm.writingStyle,
                    image: characterForm.image,
                    imageSize: characterForm.imageSize,
                    imagePosition: characterForm.imagePosition
                });
                selectedCharacterPresetId.value = newId;
            } else {
                scenePresets.value.push({
                    id: newId,
                    presetName: presetNameInput.value.trim(),
                    scenePrompt: sceneForm.scenePrompt,
                    writingStyle: sceneForm.writingStyle,
                    image: sceneForm.image,
                    imageSize: sceneForm.imageSize,
                    imagePosition: sceneForm.imagePosition
                });
                selectedScenePresetId.value = newId;
            }
            
            isPresetModalOpen.value = false;
        };

        // 更新当前预设
        const updateCurrentPreset = () => {
            if (currentMode.value === 'new') {
                const index = characterPresets.value.findIndex(p => p.id === selectedCharacterPresetId.value);
                if (index !== -1) {
                    characterPresets.value[index] = {
                        ...characterPresets.value[index],
                        charName: characterForm.name,
                        persona: characterForm.persona,
                        userInfo: characterForm.userInfo,
                        scenePrompt: characterForm.scenePrompt,
                        writingStyle: characterForm.writingStyle,
                        image: characterForm.image,
                        imageSize: characterForm.imageSize,
                        imagePosition: characterForm.imagePosition
                    };
                    alert('预设已更新');
                    isPresetModalOpen.value = false;
                }
            } else {
                const index = scenePresets.value.findIndex(p => p.id === selectedScenePresetId.value);
                if (index !== -1) {
                    scenePresets.value[index] = {
                        ...scenePresets.value[index],
                        scenePrompt: sceneForm.scenePrompt,
                        writingStyle: sceneForm.writingStyle,
                        image: sceneForm.image,
                        imageSize: sceneForm.imageSize,
                        imagePosition: sceneForm.imagePosition
                    };
                    alert('预设已更新');
                    isPresetModalOpen.value = false;
                }
            }
        };

        // 删除当前预设
        const deleteCurrentPreset = () => {
            if (!confirm('确定要删除这个预设吗？')) return;
            
            if (currentMode.value === 'new') {
                characterPresets.value = characterPresets.value.filter(p => p.id !== selectedCharacterPresetId.value);
                selectedCharacterPresetId.value = '';
            } else {
                scenePresets.value = scenePresets.value.filter(p => p.id !== selectedScenePresetId.value);
                selectedScenePresetId.value = '';
            }
            isPresetModalOpen.value = false;
        };

        // 保存配置
        const saveSettings = async () => {
            if (currentMode.value === 'new') {
                if (!characterForm.name.trim()) {
                    alert('请输入角色名字');
                    return;
                }
                if (!characterForm.persona.trim()) {
                    alert('请输入角色人设');
                    return;
                }
                // 保存新增角色的表单数据
                await localforage.setItem('otome_char_form', JSON.stringify(characterForm));
                
                dialogueText.value = `配置已保存！点击对话框开始剧情...`;
            } else {
                // 保存已有角色的配置
                if (selectedContact.value) {
                    roleSettings.value[selectedContact.value.id] = {
                        scenePrompt: sceneForm.scenePrompt,
                        writingStyle: sceneForm.writingStyle,
                        image: sceneForm.image,
                        imageSize: sceneForm.imageSize,
                        imagePosition: sceneForm.imagePosition
                    };
                    await localforage.setItem('otome_role_settings', JSON.stringify(roleSettings.value));
                }
                dialogueText.value = `配置已保存！点击对话框开始剧情...`;
            }
            isSettingsOpen.value = false;
            // alert('配置已保存！');
        };
        
        // === 游戏核心逻辑 ===

        // 点击对话框
        const handleDialogueClick = () => {
            if (isTyping.value) {
                // 如果正在打字，瞬间显示全句
                clearInterval(typingInterval.value);
                dialogueText.value = fullTextToDisplay.value;
                isTyping.value = false;
                checkQueueAndOptions();
            } else if (dialogueQueue.value.length > 0) {
                // 如果有下一句，显示下一句
                playNextSentence();
            } else if (!isGameStarted.value) {
                // 如果游戏还没开始，开始游戏
                startGame();
            } else if (showOptions.value) {
                // 如果显示了选项，点击对话框无反应（或者提示请选择选项）
            } else {
                // 队列空了，也没选项，可能是异常状态或者等待生成
                if (!isLoading.value) {
                    // 尝试继续生成（如果之前中断了）
                    // generateContent(); 
                }
            }
        };

        // 开始游戏
        const startGame = () => {
            if (!props.apiConfig || !props.apiConfig.key) {
                alert('请先在设置中配置 API Key！');
                return;
            }
            
            isGameStarted.value = true;
            
            // 构建 System Prompt
            let systemPrompt = `你是一个乙女游戏/Galgame的剧本生成器。请根据用户提供的人设、场景和文风进行角色扮演。
请务必以 JSON 格式返回，不要包含 markdown 代码块标记。格式如下：
{
  "text": "剧情内容，可以包含多句话。请用生动的语言描写动作、神态和对话。请根据情况将长段落分成适合阅读的句子。",
  "options": ["选项1", "选项2", "选项3"]
}
注意：text 中的内容请丰富一些，大约500字左右，详细描写场景、心理活动和对话。options 必须包含 3 个建议的玩家回复选项。`;

            // 注入世界书内容
            if (selectedWorldbookIds.value && selectedWorldbookIds.value.length > 0) {
                const selectedBooks = worldbooks.value.filter(b => selectedWorldbookIds.value.includes(b.id));
                if (selectedBooks.length > 0) {
                    systemPrompt += `\n\n【世界观/背景设定】\n`;
                    selectedBooks.forEach((book, index) => {
                        if (book.content) {
                            systemPrompt += `[设定${index + 1}: ${book.title}]\n${book.content}\n\n`;
                        }
                    });
                    systemPrompt += `请严格遵循以上世界观设定进行剧情演绎，确保角色行为和环境描述符合该世界观。`;
                }
            }

            let userPrompt = '';
            
            if (currentMode.value === 'new') {
                userPrompt = `角色名：${characterForm.name}
角色人设：${characterForm.persona}
玩家信息：${characterForm.userInfo}
场景：${selectedScene.value.name}
场景描述：${characterForm.scenePrompt}
文风要求：${characterForm.writingStyle}

请开始剧情。`;
            } else {
                userPrompt = `角色名：${selectedContact.value.name}
角色人设：${selectedContact.value.aiPersona}
玩家设定：${selectedContact.value.userPersona}
场景：${selectedScene.value.name}
场景描述：${sceneForm.scenePrompt}
文风要求：${sceneForm.writingStyle}

请开始剧情。`;
            }
            
            chatHistory.value = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            generateContent();
        };

        // 生成内容
        const generateContent = async () => {
            isLoading.value = true;
            showOptions.value = false;
            dialogueText.value = '正在生成剧情...';
            
            try {
                const response = await callAI(chatHistory.value);
                
                // 尝试解析 JSON
                let content = response.trim();
                
                // 智能提取 JSON 对象：查找第一个 { 和最后一个 }
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1) {
                    content = content.substring(firstBrace, lastBrace + 1);
                } else {
                    // 如果找不到花括号，尝试去除 markdown 标记
                    content = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '');
                }
                
                let result;
                try {
                    result = JSON.parse(content);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    // 容错处理：如果不是 JSON，直接作为文本
                    // 使用原始响应但去除代码块标记，避免显示 JSON 结构字符
                    result = {
                        text: response.replace(/```json/g, '').replace(/```/g, ''),
                        options: ['继续', '微笑', '沉默']
                    };
                }

                // 清洗文本：去除字面量的 \n 和真实的换行符，以及多余的空格
                if (result.text) {
                    result.text = result.text.replace(/\\n/g, '').replace(/[\r\n]/g, '').trim();
                }
                
                // 将 AI 回复加入历史 (存纯文本，避免 JSON 格式泄露到剧情回顾)
                chatHistory.value.push({ role: 'assistant', content: result.text });
                
                // 处理文本：按句子分割
                // 简单的分割逻辑：按 。！？分割，保留标点
                const sentences = result.text.match(/[^。！？]+[。！？]+|[^。！？]+$/g) || [result.text];
                
                dialogueQueue.value = sentences;
                options.value = result.options || [];
                
                // 开始播放第一句
                playNextSentence();
                
            } catch (error) {
                console.error('API Error:', error);
                dialogueText.value = '生成失败，请检查 API 设置或网络。';
                isLoading.value = false;
            }
        };

        // 重新生成剧情
        const rerollStory = () => {
            if (!isGameStarted.value) return;

            // 如果正在请求 API (isLoading=true 且不是在打字)，则提示等待
            if (isLoading.value && !isTyping.value && dialogueQueue.value.length === 0) {
                alert('正在生成剧情中，请稍候...');
                return;
            }
            
            // 停止当前的打字效果
            if (typingInterval.value) clearInterval(typingInterval.value);
            isTyping.value = false;
            dialogueQueue.value = [];
            
            // 检查历史记录
            if (chatHistory.value.length > 0) {
                const lastMsg = chatHistory.value[chatHistory.value.length - 1];
                if (lastMsg.role === 'assistant') {
                    chatHistory.value.pop();
                }
            } else {
                alert('没有可重生成的剧情内容');
                return;
            }
            
            // 重新生成
            generateContent();
        };

        // 播放下一句
        const playNextSentence = () => {
            if (dialogueQueue.value.length === 0) {
                checkQueueAndOptions();
                return;
            }
            
            const sentence = dialogueQueue.value.shift();
            fullTextToDisplay.value = sentence;
            dialogueText.value = '';
            isTyping.value = true;
            
            let i = 0;
            if (typingInterval.value) clearInterval(typingInterval.value);
            
            typingInterval.value = setInterval(() => {
                dialogueText.value += sentence[i];
                i++;
                if (i >= sentence.length) {
                    clearInterval(typingInterval.value);
                    isTyping.value = false;
                    checkQueueAndOptions();
                }
            }, 50); // 打字速度
        };

        // 检查队列和选项状态
        const checkQueueAndOptions = () => {
            if (dialogueQueue.value.length === 0 && !isTyping.value) {
                // 队列空了，显示选项
                showOptions.value = true;
                isLoading.value = false;
            }
        };

        // 处理选项选择
        const handleOptionSelect = (option) => {
            if (isLoading.value) return;
            
            // 将用户选择加入历史
            chatHistory.value.push({ role: 'user', content: option });
            
            // 隐藏选项
            showOptions.value = false;
            
            // 生成下一段
            generateContent();
        };

        // 打开自定义回复
        const openCustomReply = () => {
            customReply.value = '';
            isCustomReplyOpen.value = true;
        };

        // 发送自定义回复
        const sendCustomReply = () => {
            if (!customReply.value.trim()) return;
            isCustomReplyOpen.value = false;
            handleOptionSelect(customReply.value);
        };

        // 调用 AI API
        const callAI = async (messages) => {
            const { endpoint, key, model, temperature } = props.apiConfig;
            
            // 处理 API Endpoint
            let baseUrl = endpoint.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) {
                baseUrl = baseUrl.slice(0, -3);
            }
            const url = `${baseUrl}/v1/chat/completions`;
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            };
            
            const body = {
                model: model || 'gpt-3.5-turbo',
                messages: messages,
                temperature: temperature !== undefined ? Number(temperature) : 0.8
            };
            
            const res = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`API Error: ${res.status} - ${errText}`);
            }
            
            const data = await res.json();
            return data.choices[0].message.content;
        };

        // 加载数据的函数
        const loadOtomeData = async () => {
            try {
                // 1. Scenes
                let storedScenes = await localforage.getItem('otome_scenes');
                if (!storedScenes) {
                    const local = localStorage.getItem('otome_scenes');
                    if (local) {
                        console.log("🔄 [Otomegame] 迁移场景数据...");
                        storedScenes = local;
                        await localforage.setItem('otome_scenes', local);
                        localStorage.removeItem('otome_scenes');
                    }
                }
                if (storedScenes) scenes.value = JSON.parse(storedScenes);

                // 2. Role Settings
                let storedSettings = await localforage.getItem('otome_role_settings');
                if (!storedSettings) {
                    const local = localStorage.getItem('otome_role_settings');
                    if (local) {
                        console.log("🔄 [Otomegame] 迁移角色设置...");
                        storedSettings = local;
                        await localforage.setItem('otome_role_settings', local);
                        localStorage.removeItem('otome_role_settings');
                    }
                }
                if (storedSettings) roleSettings.value = JSON.parse(storedSettings);

                // 3. Character Form
                let storedCharForm = await localforage.getItem('otome_char_form');
                if (!storedCharForm) {
                    const local = localStorage.getItem('otome_char_form');
                    if (local) {
                        console.log("🔄 [Otomegame] 迁移角色表单...");
                        storedCharForm = local;
                        await localforage.setItem('otome_char_form', local);
                        localStorage.removeItem('otome_char_form');
                    }
                }
                if (storedCharForm) Object.assign(characterForm, JSON.parse(storedCharForm));

                // 4. Scene Presets
                let storedScenePresets = await localforage.getItem('otome_scene_presets');
                if (!storedScenePresets) {
                    const local = localStorage.getItem('otome_scene_presets');
                    if (local) {
                        console.log("🔄 [Otomegame] 迁移场景预设...");
                        storedScenePresets = local;
                        await localforage.setItem('otome_scene_presets', local);
                        localStorage.removeItem('otome_scene_presets');
                    }
                }
                if (storedScenePresets) scenePresets.value = JSON.parse(storedScenePresets);

                // 5. Character Presets
                let storedCharPresets = await localforage.getItem('otome_character_presets');
                if (!storedCharPresets) {
                    const local = localStorage.getItem('otome_character_presets');
                    if (local) {
                        console.log("🔄 [Otomegame] 迁移角色预设...");
                        storedCharPresets = local;
                        await localforage.setItem('otome_character_presets', local);
                        localStorage.removeItem('otome_character_presets');
                    }
                }
                if (storedCharPresets) characterPresets.value = JSON.parse(storedCharPresets);

                // 6. Saved Stories
                let storedStories = await localforage.getItem('otome_saved_stories');
                if (storedStories) savedStories.value = JSON.parse(storedStories);

                // 7. Worldbooks (从 WorldbookApp 的存储中读取)
                const storedWorldbooks = await localforage.getItem('worldbooks');
                if (storedWorldbooks) {
                    worldbooks.value = JSON.parse(storedWorldbooks);
                } else {
                    // 尝试从 localStorage 读取（兼容旧数据）
                    const localWB = localStorage.getItem('worldbooks');
                    if (localWB) worldbooks.value = JSON.parse(localWB);
                }

                // 8. Selected Worldbook
                const storedSelectedBookIds = await localforage.getItem('otome_selected_worldbook_ids');
                if (storedSelectedBookIds && Array.isArray(storedSelectedBookIds)) {
                    selectedWorldbookIds.value = storedSelectedBookIds;
                } else {
                    // 尝试迁移旧的单选数据
                    const storedSelectedBookId = await localforage.getItem('otome_selected_worldbook');
                    if (storedSelectedBookId) {
                        selectedWorldbookIds.value = [storedSelectedBookId];
                    }
                }

                console.log("✅ [Otomegame] 数据加载/迁移完成");

            } catch (e) {
                console.error("Failed to load otome data", e);
            }
        };

        onMounted(() => {
            loadOtomeData();
        });

        return {
            themes,
            currentTheme,
            currentThemeConfig,
            scenes,
            isAddSceneModalOpen,
            isThemeModalOpen,
            isRoleSelectModalOpen,
            isContactListOpen,
            isGameInterfaceOpen,
            isSettingsOpen,
            isCustomReplyOpen,
            isExitModalOpen,
            isStoryLogOpen,
            savedStories,
            selectedScene,
            currentMode,
            contacts,
            selectedContact,
            dialogueText,
            characterForm,
            sceneForm,
            newScene,
            isLoading,
            showOptions,
            options,
            customReply,
            isTyping,
            dialogueQueue,
            isGameStarted,
            rerollStory,
            openAddSceneModal,
            addScene,
            deleteScene,
            changeTheme,
            selectScene,
            selectExistingRole,
            selectNewRole,
            selectContact,
            backToSceneList,
            handleBackClick,
            confirmExit,
            openStoryLog,
            deleteStory,
            backToContactList,
            openSettings,
            saveSettings,
            handleDialogueClick,
            handleOptionSelect,
            openCustomReply,
            sendCustomReply,
            scenePresets,
            characterPresets,
            selectedScenePresetId,
            selectedCharacterPresetId,
            isPresetModalOpen,
            presetNameInput,
            openPresetModal,
            applyPreset,
            saveNewPreset,
            updateCurrentPreset,
            deleteCurrentPreset,
            worldbooks,
            selectedWorldbookIds
        };
    },
    template: `
    <div class="app-window otomegame-app" :class="{ open: isOpen }">
        <!-- 顶部标题栏 -->
        <div class="otomegame-header" 
             style="background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <button @click="$emit('close')" class="header-btn" style="position: absolute; left: 15px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>
            
            <div class="header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">
                选择场景
            </div>
            
            <button @click="openStoryLog" class="header-btn" style="position: absolute; right: 55px;" :style="{ color: currentThemeConfig.primary }">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>
            <button @click="isThemeModalOpen = true" class="header-btn" style="position: absolute; right: 15px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
        </div>
        
        <!-- 场景列表 -->
        <div v-if="!isGameInterfaceOpen" class="otomegame-content">
            <div class="scenes-list">
                <div v-for="(scene, index) in scenes" :key="scene.id" class="scene-card-horizontal" :class="{ 'name-left': index % 2 === 0, 'name-right': index % 2 === 1 }">
                    <div class="scene-image-container" @click="selectScene(scene)"
                         :style="{
                             boxShadow: '0 0 10px 3px ' + currentThemeConfig.primary
                         }">
                        <img :src="scene.image" :alt="scene.name" class="scene-image">
                    </div>
                    <div class="scene-info" :class="{ 'info-left': index % 2 === 0, 'info-right': index % 2 === 1 }">
                        <div class="scene-name">{{ scene.name }}</div>
                    </div>
                    <button @click="deleteScene(scene.id)" class="delete-scene-btn" title="删除场景" :style="{ color: currentThemeConfig.primary }">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
                
                <!-- 添加场景卡片 -->
                <div class="scene-card-horizontal add-scene-card" @click="openAddSceneModal">
                    <div class="add-scene-content">
                        <div class="add-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v8m-4-4h8"/>
                            </svg>
                        </div>
                        <div class="add-text">添加场景</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 添加场景模态框 -->
        <div v-if="isAddSceneModalOpen" class="modal-overlay" @click.self="isAddSceneModalOpen = false">
            <div class="modal-content otomegame-modal">
                <div class="modal-title">添加新场景</div>
                
                <div class="input-group">
                    <label class="input-label">场景名称</label>
                    <input 
                        v-model="newScene.name" 
                        type="text" 
                        class="modal-input" 
                        placeholder="请输入场景名称"
                        maxlength="20"
                    >
                </div>
                
                <div class="input-group">
                    <label class="input-label">场景图片链接（可选）</label>
                    <input 
                        v-model="newScene.image" 
                        type="text" 
                        class="modal-input" 
                        placeholder="留空将使用默认图片"
                    >
                    <div class="input-hint">请输入图片的完整URL地址</div>
                </div>
                
                <div class="input-group">
                    <label class="input-label">场景描述（可选）</label>
                    <textarea 
                        v-model="newScene.description" 
                        class="modal-textarea" 
                        placeholder="简单描述这个场景..."
                        rows="3"
                        maxlength="100"
                    ></textarea>
                </div>
                
                <!-- 预览 -->
                <div v-if="newScene.image" class="image-preview">
                    <div class="preview-label">图片预览</div>
                    <img :src="newScene.image" alt="预览" class="preview-image" @error="$event.target.style.display='none'">
                </div>
                
                <div class="modal-buttons">
                    <button @click="isAddSceneModalOpen = false" class="modal-btn cancel">取消</button>
                    <button @click="addScene" class="modal-btn confirm">添加</button>
                </div>
            </div>
        </div>
        
        <!-- 主题/设置模态框 -->
        <div v-if="isThemeModalOpen" class="modal-overlay center-popup" @click.self="isThemeModalOpen = false">
            <div class="modal-content otomegame-modal" style="width: 360px; height: 75vh; display: flex; flex-direction: column; max-height: 800px;">
                <div class="modal-title">游戏设置</div>
                
                <div style="flex: 1; overflow-y: auto; padding: 0 5px;">
                    <!-- 主题选择 -->
                    <div class="section-title" style="margin: 10px 0; font-size: 16px; font-weight: bold;">界面主题</div>
                    <div class="theme-grid">
                        <div 
                            v-for="(theme, key) in themes" 
                            :key="key"
                            @click="changeTheme(key)"
                            class="theme-option"
                            :class="{ active: currentTheme === key }"
                        >
                            <div class="theme-preview" :style="{ background: 'linear-gradient(135deg, ' + theme.primary + ' 0%, ' + theme.secondary + ' 100%)' }">
                                <div v-if="currentTheme === key" class="theme-check">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="theme-name">{{ theme.name }}</div>
                        </div>
                    </div>

                    <!-- 世界书选择 -->
                    <div class="section-title" style="margin: 25px 0 10px 0; font-size: 16px; font-weight: bold; border-top: 1px solid #eee; padding-top: 15px;">世界书设定</div>
                    <div class="input-hint" style="margin-bottom: 10px;">选择世界书以在剧情中生效（可多选）</div>
                    
                    <div class="worldbook-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 5px; background: #f9f9f9;">
                        <div v-if="worldbooks.length === 0" style="padding: 10px; text-align: center; color: #999; font-size: 14px;">暂无世界书</div>
                        <div v-for="book in worldbooks" :key="book.id" style="padding: 8px; border-bottom: 1px solid #eee; display: flex; align-items: center;">
                            <input type="checkbox" :id="'wb-' + book.id" :value="book.id" v-model="selectedWorldbookIds" style="margin-right: 10px; width: 16px; height: 16px;">
                            <label :for="'wb-' + book.id" style="flex: 1; cursor: pointer; font-size: 14px;">{{ book.title }}</label>
                        </div>
                    </div>
                    
                    <div v-if="selectedWorldbookIds.length > 0" style="margin-top: 15px; font-size: 13px; color: #555; background: #f0f7ff; padding: 12px; border-radius: 8px; border-left: 4px solid #007aff;">
                        <div style="font-weight: bold; margin-bottom: 4px;">已启用 {{ selectedWorldbookIds.length }} 本世界书</div>
                        <div style="color: #888; font-size: 12px;">
                            {{ worldbooks.filter(b => selectedWorldbookIds.includes(b.id)).map(b => b.title).join(', ') }}
                        </div>
                    </div>
                </div>
                
                <button @click="isThemeModalOpen = false" class="modal-btn confirm" style="margin-top: 20px; width: 100%; flex: none;">
                    完成
                </button>
            </div>
        </div>
        
        <!-- 角色选择模态框 -->
        <div v-if="isRoleSelectModalOpen" class="modal-overlay center-popup" @click.self="isRoleSelectModalOpen = false">
            <div class="modal-content otomegame-modal role-select-modal">
                <div class="modal-title">选择互动方式</div>
                <div class="role-select-options">
                    <div class="role-option" @click="selectExistingRole">
                        <div class="role-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div class="role-title">跟QQ已有的角色约会</div>
                        <div class="role-desc">选择一个现有的联系人开始互动</div>
                    </div>
                    
                    <div class="role-option" @click="selectNewRole">
                        <div class="role-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <line x1="20" y1="8" x2="20" y2="14"/>
                                <line x1="23" y1="11" x2="17" y2="11"/>
                            </svg>
                        </div>
                        <div class="role-title">新增角色</div>
                        <div class="role-desc">创建一个全新的角色开始故事</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 联系人列表 -->
        <div v-if="isContactListOpen" class="modal-overlay center-popup" @click.self="isContactListOpen = false">
            <div class="modal-content otomegame-modal" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; height: 60vh;">
                <div class="game-header" style="margin-top: 0; background: transparent; border-bottom: 1px solid #eee;">
                    <button @click="isContactListOpen = false; isRoleSelectModalOpen = true;" class="game-back-btn" style="position: absolute; left: 15px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <div class="game-title">选择联系人</div>
                </div>
                
                <div class="contact-list" style="background: white; overflow-y: auto; flex: 1;">
                    <div v-if="contacts.length === 0" style="text-align: center; padding: 40px; color: #999;">
                        <div style="font-size: 48px; margin-bottom: 10px;">💬</div>
                        <div>还没有QQ联系人</div>
                        <div style="font-size: 12px; margin-top: 5px;">请先在QQ App中添加好友</div>
                    </div>
                    <div v-for="contact in contacts" :key="contact.id" class="contact-item" @click="selectContact(contact)">
                        <img :src="contact.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27%3E%3Crect fill=%27%23ddd%27 width=%2750%27 height=%2750%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-size=%2720%27%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E'" :alt="contact.name" class="contact-avatar">
                        <div class="contact-info">
                            <div class="contact-name">{{ contact.name }}</div>
                            <div class="contact-persona">{{ contact.aiPersona ? contact.aiPersona.substring(0, 30) + '...' : '暂无人设' }}</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Galgame 互动界面 -->
        <div v-if="isGameInterfaceOpen" class="game-interface">
            <!-- 背景图片 -->
            <div class="game-background" :style="{ backgroundImage: 'url(' + selectedScene.image + ')' }">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.3);"></div>
            </div>
            
            <!-- 角色立绘 -->
            <div v-if="currentMode === 'new' && characterForm.image" class="character-sprite" 
                 :style="{ 
                     width: characterForm.imageSize + 'px',
                     maxWidth: 'none',
                     maxHeight: 'none',
                     transform: 'translate(calc(-50% + ' + characterForm.imagePosition.x + 'px), calc(-50% + ' + characterForm.imagePosition.y + 'px))'
                 }">
                <img :src="characterForm.image" alt="角色立绘">
            </div>
            <div v-if="currentMode === 'existing' && sceneForm.image" class="character-sprite"
                 :style="{ 
                     width: sceneForm.imageSize + 'px',
                     maxWidth: 'none',
                     maxHeight: 'none',
                     transform: 'translate(calc(-50% + ' + sceneForm.imagePosition.x + 'px), calc(-50% + ' + sceneForm.imagePosition.y + 'px))'
                 }">
                <img :src="sceneForm.image" alt="角色立绘">
            </div>
            
            <!-- 顶部工具栏 -->
            <div class="game-toolbar">
                <button @click="handleBackClick" class="toolbar-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                
                <div style="display: flex; gap: 10px;">
                    <button @click="rerollStory" class="toolbar-btn" title="重新生成这段剧情" :style="{ opacity: (isLoading && !isTyping) ? 0.5 : 1 }">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                    </button>

                    <button @click="openSettings" class="toolbar-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- 选项区域 -->
            <div v-if="showOptions" class="game-options-container">
                <div v-for="(option, index) in options" :key="index" class="game-option-btn" @click="handleOptionSelect(option)">
                    {{ option }}
                </div>
                <div class="game-option-btn custom-reply-btn" @click="openCustomReply">
                    ✨ 自定义回复
                </div>
            </div>
            
            <!-- 底部对话框 -->
            <div class="dialogue-box" @click="handleDialogueClick">
                <div class="dialogue-name" v-if="currentMode === 'new' && characterForm.name">【{{ characterForm.name }}】</div>
                <div class="dialogue-name" v-else-if="currentMode === 'existing' && selectedContact">【{{ selectedContact.name }}】</div>
                <div class="dialogue-text">{{ dialogueText }}</div>
                <div v-if="!isTyping && !showOptions && (!isLoading || dialogueQueue.length > 0)" class="dialogue-arrow"></div>
            </div>
        </div>
        
        <!-- 设置弹窗 -->
        <div v-if="isSettingsOpen" class="settings-overlay center-popup" @click.self="isSettingsOpen = false">
            <div class="settings-panel">
                <!-- 新增角色模式 -->
                <div v-if="currentMode === 'new'" class="settings-content">
                    <div class="settings-header">
                        <div class="settings-title">角色配置</div>
                        <button @click="saveSettings" class="save-btn">保存</button>
                    </div>

                    <!-- 预设管理栏 -->
                    <div class="preset-bar" style="padding: 10px 15px; background: #f5f5f5; border-bottom: 1px solid #eee; display: flex; gap: 10px; align-items: center;">
                        <select 
                            v-model="selectedCharacterPresetId" 
                            @change="applyPreset"
                            class="form-select" 
                            style="flex: 1; padding: 5px; border-radius: 4px; border: 1px solid #ddd;"
                        >
                            <option value="">-- 选择预设 --</option>
                            <option v-for="p in characterPresets" :key="p.id" :value="p.id">{{ p.presetName }}</option>
                        </select>
                        
                        <button @click="openPresetModal" class="modal-btn confirm" style="padding: 5px 10px; font-size: 12px; width: auto;">
                            预设管理
                        </button>
                    </div>
                    
                    <div class="settings-body">
                        <div class="form-section">
                            <div class="section-title">角色基本信息</div>
                            
                            <div class="form-group">
                                <label class="form-label">角色名字</label>
                                <input v-model="characterForm.name" type="text" class="form-input-small" placeholder="请输入角色名字" maxlength="20">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">角色人设</label>
                                <textarea v-model="characterForm.persona" class="form-textarea" placeholder="描述角色的性格、背景、特点..." rows="4"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <div class="section-title">用户信息</div>
                            
                            <div class="form-group">
                                <label class="form-label">你的信息</label>
                                <textarea v-model="characterForm.userInfo" class="form-textarea" placeholder="你的名字、身份、背景..." rows="3"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-divider"></div>
                        
                        <div class="form-section">
                            <div class="section-title">场景配置</div>
                            
                            <div class="form-group">
                                <label class="form-label">场景提示词</label>
                                <textarea v-model="characterForm.scenePrompt" class="form-textarea" placeholder="描述当前场景、氛围、故事背景..." rows="4"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">文风</label>
                                <textarea v-model="characterForm.writingStyle" class="form-textarea" placeholder="描述期望的对话风格、语气、叙述方式..." rows="3"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <div class="section-title">角色立绘</div>
                            <div class="form-group">
                                <label class="form-label">图片链接</label>
                                <input v-model="characterForm.image" type="text" class="form-input-small" placeholder="请输入图片URL...">
                            </div>
                            
                            <div class="form-group" v-if="characterForm.image">
                                <label class="form-label">立绘大小 (px)</label>
                                <input v-model.number="characterForm.imageSize" type="range" min="100" max="800" step="10" class="form-range">
                                <div style="text-align: right; font-size: 12px; color: #666;">{{ characterForm.imageSize }}px</div>
                            </div>

                            <div class="form-group" v-if="characterForm.image">
                                <label class="form-label">立绘位置调整</label>
                                <div class="position-controls">
                                    <div class="control-row">
                                        <label>水平 (X)</label>
                                        <input v-model.number="characterForm.imagePosition.x" type="range" min="-300" max="300" step="5" class="form-range">
                                        <span>{{ characterForm.imagePosition.x }}</span>
                                    </div>
                                    <div class="control-row">
                                        <label>垂直 (Y)</label>
                                        <input v-model.number="characterForm.imagePosition.y" type="range" min="-300" max="300" step="5" class="form-range">
                                        <span>{{ characterForm.imagePosition.y }}</span>
                                    </div>
                                </div>
                            </div>

                            <div v-if="characterForm.image" class="upload-preview" :style="{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative', background: '#eee' }">
                                <img :src="characterForm.image" alt="预览" 
                                     :style="{ 
                                         width: (characterForm.imageSize / 2) + 'px', 
                                         position: 'absolute',
                                         left: '50%',
                                         bottom: '0',
                                         transform: 'translate(calc(-50% + ' + (characterForm.imagePosition.x / 2) + 'px), ' + (characterForm.imagePosition.y / 2) + 'px)'
                                     }">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 已有角色模式 -->
                <div v-if="currentMode === 'existing'" class="settings-content">
                    <div class="settings-header">
                        <div class="settings-title">场景配置</div>
                        <button @click="saveSettings" class="save-btn">保存</button>
                    </div>

                    <!-- 预设管理栏 -->
                    <div class="preset-bar" style="padding: 10px 15px; background: #f5f5f5; border-bottom: 1px solid #eee; display: flex; gap: 10px; align-items: center;">
                        <select 
                            v-model="selectedScenePresetId" 
                            @change="applyPreset"
                            class="form-select" 
                            style="flex: 1; padding: 5px; border-radius: 4px; border: 1px solid #ddd;"
                        >
                            <option value="">-- 选择预设 --</option>
                            <option v-for="p in scenePresets" :key="p.id" :value="p.id">{{ p.presetName }}</option>
                        </select>
                        
                        <button @click="openPresetModal" class="modal-btn confirm" style="padding: 5px 10px; font-size: 12px; width: auto;">
                            预设管理
                        </button>
                    </div>
                    
                    <div class="settings-body">
                        <div class="form-section">
                            <div class="section-title">场景配置</div>
                            
                            <div class="form-group">
                                <label class="form-label">场景提示词</label>
                                <textarea v-model="sceneForm.scenePrompt" class="form-textarea" placeholder="描述当前场景、氛围、故事背景..." rows="4"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">文风</label>
                                <textarea v-model="sceneForm.writingStyle" class="form-textarea" placeholder="描述期望的对话风格、语气、叙述方式..." rows="3"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <div class="section-title">角色立绘（可选）</div>
                            <div class="form-group">
                                <label class="form-label">图片链接</label>
                                <input v-model="sceneForm.image" type="text" class="form-input-small" placeholder="请输入图片URL...">
                            </div>
                            
                            <div class="form-group" v-if="sceneForm.image">
                                <label class="form-label">立绘大小 (px)</label>
                                <input v-model.number="sceneForm.imageSize" type="range" min="100" max="800" step="10" class="form-range">
                                <div style="text-align: right; font-size: 12px; color: #666;">{{ sceneForm.imageSize }}px</div>
                            </div>

                            <div class="form-group" v-if="sceneForm.image">
                                <label class="form-label">立绘位置调整</label>
                                <div class="position-controls">
                                    <div class="control-row">
                                        <label>水平 (X)</label>
                                        <input v-model.number="sceneForm.imagePosition.x" type="range" min="-300" max="300" step="5" class="form-range">
                                        <span>{{ sceneForm.imagePosition.x }}</span>
                                    </div>
                                    <div class="control-row">
                                        <label>垂直 (Y)</label>
                                        <input v-model.number="sceneForm.imagePosition.y" type="range" min="-300" max="300" step="5" class="form-range">
                                        <span>{{ sceneForm.imagePosition.y }}</span>
                                    </div>
                                </div>
                            </div>

                            <div v-if="sceneForm.image" class="upload-preview" :style="{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative', background: '#eee' }">
                                <img :src="sceneForm.image" alt="预览" 
                                     :style="{ 
                                         width: (sceneForm.imageSize / 2) + 'px', 
                                         position: 'absolute',
                                         left: '50%',
                                         bottom: '0',
                                         transform: 'translate(calc(-50% + ' + (sceneForm.imagePosition.x / 2) + 'px), ' + (sceneForm.imagePosition.y / 2) + 'px)'
                                     }">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 预设管理弹窗 -->
        <div v-if="isPresetModalOpen" class="modal-overlay center-popup" style="z-index: 3100;" @click.self="isPresetModalOpen = false">
            <div class="modal-content otomegame-modal" style="width: 300px;">
                <div class="modal-title">预设管理</div>
                
                <!-- 保存新预设 -->
                <div class="input-group">
                    <label class="input-label">保存为新预设</label>
                    <div style="display: flex; gap: 5px;">
                        <input v-model="presetNameInput" type="text" class="modal-input" placeholder="输入预设名称">
                        <button @click="saveNewPreset" class="modal-btn confirm" style="width: auto; white-space: nowrap;">保存</button>
                    </div>
                </div>
                
                <!-- 更新/删除现有预设 -->
                <div v-if="(currentMode === 'new' && selectedCharacterPresetId) || (currentMode === 'existing' && selectedScenePresetId)" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <div class="input-label" style="margin-bottom: 10px;">当前选中: {{ currentMode === 'new' ? characterPresets.find(p => p.id === selectedCharacterPresetId)?.presetName : scenePresets.find(p => p.id === selectedScenePresetId)?.presetName }}</div>
                    <div style="display: flex; gap: 10px;">
                        <button @click="updateCurrentPreset" class="modal-btn confirm" style="background: #4CAF50;">更新覆盖</button>
                        <button @click="deleteCurrentPreset" class="modal-btn cancel" style="background: #f44336; color: white;">删除</button>
                    </div>
                    <div class="input-hint" style="margin-top: 5px;">更新将用当前表单内容覆盖此预设</div>
                </div>
                
                <button @click="isPresetModalOpen = false" class="modal-btn cancel" style="margin-top: 20px; width: 100%;">关闭</button>
            </div>
        </div>

        <!-- 自定义回复弹窗 -->
        <div v-if="isCustomReplyOpen" class="modal-overlay center-popup" @click.self="isCustomReplyOpen = false">
            <div class="modal-content otomegame-modal">
                <div class="modal-title">自定义回复</div>
                <div class="input-group">
                    <textarea 
                        v-model="customReply" 
                        class="modal-textarea" 
                        placeholder="请输入你想说的话..."
                        rows="3"
                        maxlength="100"
                    ></textarea>
                </div>
                <div class="modal-buttons">
                    <button @click="isCustomReplyOpen = false" class="modal-btn cancel">取消</button>
                    <button @click="sendCustomReply" class="modal-btn confirm">发送</button>
                </div>
            </div>
        </div>

        <!-- 退出确认弹窗 -->
        <div v-if="isExitModalOpen" class="modal-overlay center-popup" style="z-index: 4000;" @click.self="isExitModalOpen = false">
            <div class="modal-content otomegame-modal">
                <div class="modal-title">退出游戏</div>
                <div style="text-align: center; margin-bottom: 20px; color: #666;">
                    是否要保存当前的剧情记录？
                </div>
                <div class="modal-buttons" style="flex-direction: column;">
                    <button @click="confirmExit(true)" class="modal-btn confirm" style="margin-bottom: 10px;">记录剧情并退出</button>
                    <button @click="confirmExit(false)" class="modal-btn cancel">不记录直接退出</button>
                </div>
            </div>
        </div>

        <!-- 剧情记录弹窗 -->
        <div v-if="isStoryLogOpen" class="modal-overlay center-popup" @click.self="isStoryLogOpen = false">
            <div class="modal-content otomegame-modal" style="height: 70vh; display: flex; flex-direction: column;">
                <div class="modal-title">剧情回忆录</div>
                
                <div v-if="savedStories.length === 0" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📖</div>
                    <div>暂无剧情记录</div>
                </div>

                <div v-else style="flex: 1; overflow-y: auto; padding-right: 5px;">
                    <div v-for="story in savedStories" :key="story.id" style="background: #f9f9f9; border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div>
                                <div style="font-weight: bold; font-size: 16px; color: #333;">{{ story.role }}</div>
                                <div style="font-size: 12px; color: #888;">{{ story.scene }} · {{ story.date }}</div>
                            </div>
                            <button @click="deleteStory(story.id)" style="background: none; border: none; color: #ff3b30; cursor: pointer; padding: 5px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                        </div>
                        <div style="max-height: 150px; overflow-y: auto; font-size: 14px; color: #555; line-height: 1.5; background: #fff; padding: 10px; border-radius: 8px;">
                            <div v-for="(msg, idx) in story.history" :key="idx" v-show="msg.role !== 'system'" style="margin-bottom: 8px;">
                                <span v-if="msg.role === 'user'" style="color: #007aff; font-weight: bold;">你：</span>
                                <span v-else-if="msg.role === 'assistant'" style="color: #ff69b4; font-weight: bold;">{{ story.role }}：</span>
                                <span>{{ msg.content }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button @click="isStoryLogOpen = false" class="modal-btn confirm" style="margin-top: 15px; flex: none;">关闭</button>
            </div>
        </div>
    </div>
    `
};
