import { ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean
    },
    emits: ['close'],
    setup(props, { emit }) {
        const worldbooks = ref([]);
        const showModal = ref(false);
        const isEditing = ref(false);
        
        const currentBook = reactive({
            id: null,
            title: '',
            content: ''
        });

        // 从 localStorage 加载数据
        const loadBooks = () => {
            try {
                const saved = localStorage.getItem('worldbooks');
                if (saved) {
                    worldbooks.value = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Failed to load worldbooks', e);
            }
        };
        
        // 保存数据到 localStorage
        const saveToStorage = () => {
            localStorage.setItem('worldbooks', JSON.stringify(worldbooks.value));
        };

        onMounted(() => {
            loadBooks();
        });

        const openAddModal = () => {
            currentBook.id = null;
            currentBook.title = '';
            currentBook.content = '';
            isEditing.value = false;
            showModal.value = true;
        };

        const openEditModal = (book) => {
            currentBook.id = book.id;
            currentBook.title = book.title;
            currentBook.content = book.content;
            isEditing.value = true;
            showModal.value = true;
        };

        const saveBook = () => {
            if (!currentBook.title.trim()) {
                alert('请输入世界书名');
                return;
            }

            if (isEditing.value) {
                const index = worldbooks.value.findIndex(b => b.id === currentBook.id);
                if (index !== -1) {
                    worldbooks.value[index] = { ...currentBook };
                }
            } else {
                const newBook = {
                    id: Date.now(),
                    title: currentBook.title,
                    content: currentBook.content
                };
                worldbooks.value.push(newBook);
            }
            saveToStorage();
            showModal.value = false;
        };

        const deleteBook = (book) => {
            if(confirm('确定要删除这个世界书吗？')) {
                worldbooks.value = worldbooks.value.filter(b => b.id !== book.id);
                saveToStorage();
            }
        };

        return {
            worldbooks,
            showModal,
            currentBook,
            isEditing,
            openAddModal,
            openEditModal,
            saveBook,
            deleteBook
        };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }" style="background: #f5f5f5;">
        <!-- 顶部标题栏 -->
        <div class="otomegame-header" style="background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; position: relative;">
            <button @click="$emit('close')" class="header-btn" style="position: absolute; left: 15px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>
            
            <div class="header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">
                管理世界书
            </div>

            <button @click="openAddModal" class="header-btn" style="position: absolute; right: 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
            </button>
        </div>
        
        <div class="app-content" style="padding: 15px; overflow-y: auto;">
            <div v-if="worldbooks.length === 0" style="text-align: center; margin-top: 50px; color: #888;">
                暂无世界书，点击右上角添加
            </div>
            
            <div v-else class="book-list">
                <div v-for="book in worldbooks" :key="book.id" @click="openEditModal(book)" 
                     style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.1s; position: relative;">
                    <button @click.stop="deleteBook(book)" style="position: absolute; top: 7px; right: 10px; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.15); color: var(--accent-color);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #333; padding-right: 20px;">{{ book.title }}</div>
                    <div style="color: #666; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ book.content || '暂无内容' }}</div>
                </div>
            </div>
        </div>

        <!-- 模态框 -->
        <div v-if="showModal" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; width: 90%; max-height: 80%; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin: 0 0 15px 0; text-align: center; color: #333;">{{ isEditing ? '编辑世界书' : '新建世界书' }}</h3>
                
                <input v-model="currentBook.title" placeholder="世界书名" 
                       style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; outline: none;">
                
                <textarea v-model="currentBook.content" placeholder="在此输入世界书内容..." 
                          style="width: 100%; height: 200px; padding: 12px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; resize: none; box-sizing: border-box; outline: none; font-family: inherit;"></textarea>
                
                <div style="display: flex; gap: 10px;">
                    <button @click="showModal = false" style="flex: 1; background: #f0f0f0; color: #333; border: none; padding: 12px; border-radius: 8px; font-size: 16px;">取消</button>
                    <button @click="saveBook" style="flex: 2; background: #4CAF50; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 16px; font-weight: bold;">保存</button>
                </div>
            </div>
        </div>
    </div>
    `
};
