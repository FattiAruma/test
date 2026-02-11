import { ref, onMounted, watch, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        apiConfig: Object
    },
    emits: ['close'],
    setup(props, { emit }) {
        const isFormOpen = ref(false);
        const isGenerating = ref(false);
        const savedStories = ref([]);
        const currentStory = ref(null); // 当前正在阅读或生成的小说
        
        const form = ref({
            type: 'SFW',
            style: '',
            content: '',
            wordCount: 1000
        });

        // 加载保存的小说
        onMounted(async () => {
            try {
                const saved = await localforage.getItem('story-app-data');
                if (saved) {
                    savedStories.value = JSON.parse(saved);
                }
            } catch (e) {
                console.error('加载小说数据失败', e);
            }
        });

        // 监听变化并保存
        watch(savedStories, async (newVal) => {
            try {
                await localforage.setItem('story-app-data', JSON.stringify(newVal));
            } catch (e) {
                console.error('保存小说数据失败', e);
            }
        }, { deep: true });

        const toggleForm = () => {
            isFormOpen.value = !isFormOpen.value;
        };

        const deleteStory = (index) => {
            if (confirm('确定要删除这篇小说吗？')) {
                savedStories.value.splice(index, 1);
            }
        };

        const openStory = (story) => {
            currentStory.value = story;
        };

        const closeStory = () => {
            currentStory.value = null;
        };

        const formattedContent = computed(() => {
            if (!currentStory.value || !currentStory.value.content) return '';
            // 将 “...” 替换为带下划线的 span
            return currentStory.value.content.replace(/“([^”]+)”/g, '<span style="text-decoration: underline; text-decoration-color: #8e8e93; text-underline-offset: 4px;">“$1”</span>');
        });

        const generate = async () => {
            if (!form.value.content) {
                alert("请输入故事内容或梗概");
                return;
            }

            if (!props.apiConfig || !props.apiConfig.endpoint || !props.apiConfig.key) {
                alert("请先在系统设置中配置 API 地址和密钥");
                return;
            }

            isGenerating.value = true;
            isFormOpen.value = false;

            // 创建新小说对象
            const newStory = {
                id: Date.now(),
                title: '生成中...',
                content: '',
                date: new Date().toLocaleString(),
                isGenerating: true
            };
            
            // 立即进入阅读模式
            currentStory.value = newStory;

            const prompt = `请根据以下要求创作一篇小说：
【类型】：${form.value.type}
【文风】：${form.value.style || '默认'}
【期望字数】：约 ${form.value.wordCount} 字
【故事梗概/设定】：${form.value.content}

请直接开始创作正文，不需要额外的开场白。请为小说起一个标题，格式为《标题》。`;

            let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/v1')) {
                baseUrl = baseUrl.slice(0, -3);
            }

            try {
                const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${props.apiConfig.key}`
                    },
                    body: JSON.stringify({
                        model: props.apiConfig.model || 'gpt-3.5-turbo',
                        messages: [
                            { role: "system", content: "你是一个专业的小说家，擅长根据用户的设定创作引人入胜的故事。" },
                            { role: "user", content: prompt }
                        ],
                        temperature: props.apiConfig.temperature || 0.7,
                        stream: true
                    })
                });

                if (!response.ok) {
                    throw new Error(`API 请求失败: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let fullContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6);
                            if (dataStr === '[DONE]') continue;
                            
                            try {
                                const data = JSON.parse(dataStr);
                                const content = data.choices[0]?.delta?.content || '';
                                fullContent += content;
                                currentStory.value.content = fullContent;
                                
                                // 尝试提取标题
                                const titleMatch = fullContent.match(/《(.*?)》/);
                                if (titleMatch) {
                                    currentStory.value.title = titleMatch[1];
                                }
                            } catch (e) {
                                console.warn('解析流数据失败', e);
                            }
                        }
                    }
                }
                
                // 生成完成后，添加到列表并保存
                newStory.isGenerating = false;
                // 如果没有提取到标题，使用默认标题
                if (newStory.title === '生成中...') {
                    newStory.title = '无题小说';
                }
                savedStories.value.unshift(newStory);

            } catch (error) {
                console.error("生成失败:", error);
                currentStory.value.content += `\n\n[生成出错]: ${error.message}`;
                newStory.isGenerating = false;
                newStory.title = '生成失败';
                savedStories.value.unshift(newStory);
            } finally {
                isGenerating.value = false;
            }
        };

        return {
            isFormOpen,
            isGenerating,
            savedStories,
            currentStory,
            form,
            formattedContent,
            toggleForm,
            generate,
            deleteStory,
            openStory,
            closeStory
        };
    },
    template: `
    <div class="app-window story-app" :class="{ open: isOpen }" style="background: #f5f5f7; display: flex; flex-direction: column;">
        <!-- 顶部标题栏 -->
        <div class="story-header" 
             style="height: 60px; display: flex; justify-content: center; align-items: center; position: relative; flex-shrink: 0; margin-top: env(safe-area-inset-top); background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); z-index: 20;">
            <button @click="currentStory ? closeStory() : $emit('close')" class="header-btn" style="position: absolute; left: 15px; background: transparent; border: none; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; color: #007AFF;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
                <span style="font-size: 17px; margin-left: 4px;">{{ currentStory ? '列表' : '返回' }}</span>
            </button>
            
            <div class="header-title" style="font-size: 17px; font-weight: 600;">
                {{ currentStory ? (currentStory.title.length > 10 ? currentStory.title.slice(0,10) + '...' : currentStory.title) : '小说生成器' }}
            </div>
        </div>
        
        <!-- 列表视图 -->
        <div v-if="!currentStory" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <!-- 顶部操作区 -->
            <div style="background: #fff; padding: 15px; z-index: 10; flex-shrink: 0;">
                <button @click="toggleForm" :disabled="isGenerating" style="width: 100%; background: #007AFF; color: white; border: none; padding: 12px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,122,255,0.2); cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.3s;">
                    <span style="margin-right: 6px;">{{ isFormOpen ? '收起设置' : '开始创作' }}</span>
                    <svg :style="{ transform: isFormOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>

                <!-- 表单区域 (可折叠) -->
                <div v-if="isFormOpen" style="margin-top: 15px; animation: slideDown 0.3s ease-out;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 13px; color: #8e8e93; margin-bottom: 6px; font-weight: 500;">小说类型</label>
                        <select v-model="form.type" style="width: 100%; padding: 10px; border: 1px solid #e5e5ea; border-radius: 8px; font-size: 15px; background: #f2f2f7; -webkit-appearance: none; color: #1c1c1e;">
                            <option value="SFW">SFW (全年龄)</option>
                            <option value="NSFW">NSFW (限制级)</option>
                            <option value="BL">BL (耽美)</option>
                            <option value="GL">GL (百合)</option>
                            <option value="BG">BG (言情)</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 13px; color: #8e8e93; margin-bottom: 6px; font-weight: 500;">文风</label>
                            <input v-model="form.style" type="text" placeholder="例如：轻松" style="width: 100%; padding: 10px; border: 1px solid #e5e5ea; border-radius: 8px; font-size: 15px; background: #f2f2f7; box-sizing: border-box; color: #1c1c1e;">
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 13px; color: #8e8e93; margin-bottom: 6px; font-weight: 500;">期望字数</label>
                            <input v-model="form.wordCount" type="number" step="100" style="width: 100%; padding: 10px; border: 1px solid #e5e5ea; border-radius: 8px; font-size: 15px; background: #f2f2f7; box-sizing: border-box; color: #1c1c1e;">
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 13px; color: #8e8e93; margin-bottom: 6px; font-weight: 500;">故事内容 / 梗概</label>
                        <textarea v-model="form.content" rows="4" placeholder="请输入大致的故事内容..." style="width: 100%; padding: 10px; border: 1px solid #e5e5ea; border-radius: 8px; font-size: 15px; background: #f2f2f7; resize: none; box-sizing: border-box; font-family: inherit; color: #1c1c1e;"></textarea>
                    </div>

                    <button @click="generate" :disabled="isGenerating" style="width: 100%; background: #34c759; color: white; border: none; padding: 12px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 8px rgba(52,199,89,0.3); cursor: pointer; display: flex; justify-content: center; align-items: center;">
                        <span v-if="!isGenerating">生成</span>
                        <span v-else>生成中...</span>
                    </button>
                </div>
            </div>

            <!-- 分割线 -->
            <div style="height: 1px; background: #e5e5ea; width: 100%;"></div>

            <!-- 小说列表 -->
            <div class="story-list" style="flex: 1; overflow-y: auto; padding: 15px;">
                <div v-if="savedStories.length === 0" style="height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8e8e93;">
                    <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;">📚</div>
                    <p>暂无小说，快去创作吧</p>
                </div>

                <div v-for="(story, index) in savedStories" :key="story.id" @click="openStory(story)" style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); position: relative; cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 17px; font-weight: 600; color: #1c1c1e; margin-bottom: 8px; padding-right: 30px;">{{ story.title }}</div>
                    <div style="font-size: 13px; color: #8e8e93;">{{ story.date }}</div>
                    <div style="font-size: 14px; color: #3a3a3c; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">
                        {{ story.content.slice(0, 100) }}...
                    </div>
                    
                    <!-- 删除按钮 -->
                    <button @click.stop="deleteStory(index)" style="position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; border-radius: 50%; background: #f2f2f7; border: none; color: #8e8e93; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- 阅读器视图 -->
        <div v-else style="flex: 1; overflow-y: auto; padding: 20px; background: #fff;">
            <h2 style="margin-top: 0; margin-bottom: 10px; font-size: 22px; color: #1c1c1e;">{{ currentStory.title }}</h2>
            <div style="font-size: 13px; color: #8e8e93; margin-bottom: 20px; border-bottom: 1px solid #f2f2f7; padding-bottom: 15px;">
                {{ currentStory.date }}
            </div>
            <div style="white-space: pre-wrap; line-height: 1.6; color: #1c1c1e; font-size: 17px; text-align: justify;"><span v-html="formattedContent"></span><span v-if="isGenerating && currentStory.isGenerating" class="typing-cursor">|</span></div>
            
            <div v-if="!currentStory.isGenerating" style="margin-top: 40px; text-align: center; color: #c7c7cc; font-size: 12px; padding-bottom: 20px;">
                — End —
            </div>
        </div>
    </div>
    `
};
