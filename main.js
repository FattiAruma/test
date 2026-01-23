// main.js
import { createApp, ref, reactive, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import QQApps from './apps/QQApps.js';
import SettingsApp from './apps/SettingsApp.js';
import ThemeApps from './apps/ThemeApps.js';

createApp({
    components: { QQApps, SettingsApp, ThemeApps },
    setup() {
        // === 1. 定义默认数据 ===
        const defaultData = {
            wallpaper: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
            avatar: { img: '', frame: 'frame-pink' },
            profile: { name: '小手机 <3', bio1: 'Welcome to my world', bio2: '点击下方图标开始聊天' },
            colors: { app: '#5D4037', widget: '#5D4037', header: '#5D4037' },
            photos: [
                'https://images.unsplash.com/photo-1516961642265-531546e84af2?q=80&w=400&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=400&auto=format&fit=crop'
            ],
            desktopApps: {
                qq: { icon: '🐧', name: 'QQ', img: '' },
                world: { icon: '📕', name: '世界书', img: '' },
                phone: { icon: '📱', name: '查手机', img: '' },
                game: { icon: '🎮', name: '小游戏', img: '' },
            },
            dockApps: {
                settings: { icon: '⚙️', name: '设置', img: '' },
                storage: { icon: '💾', name: '储存', img: '' },
                font: { icon: '🔤', name: '字体', img: '' },
                theme: { icon: '🎨', name: '美化', img: '' },
            },
            textWidgets: [
                { title: '状态', desc: '心情美美哒 ✨', align: 'center' },
                { title: '备忘', desc: '记得喝水哦 🥛', align: 'center' }
            ],
            apiConfig: { endpoint: '', key: '', model: '' },
            modelList: [],
            savedApis: [],
            qqChats: [] 
        };

        // === 2. 响应式状态 ===
        const wallpaper = ref(defaultData.wallpaper);
        const avatar = reactive({ ...defaultData.avatar });
        const profile = reactive({ ...defaultData.profile });
        const colors = reactive({ ...defaultData.colors });
        const photos = reactive([...defaultData.photos]);
        const desktopApps = reactive(JSON.parse(JSON.stringify(defaultData.desktopApps)));
        const dockApps = reactive(JSON.parse(JSON.stringify(defaultData.dockApps)));
        const textWidgets = reactive(JSON.parse(JSON.stringify(defaultData.textWidgets)));
        
        const apiConfig = reactive({ ...defaultData.apiConfig });
        const modelList = ref([]);
        const savedApis = ref([]);
        const qqData = reactive({ chatList: [], currentChatId: null, inputMsg: '', isSending: false, aiGeneralStickers: [], userStickers: [] });
        
        // App 开关状态
        const isQQOpen = ref(false);
        const isSettingsOpen = ref(false);
        const isBeautifyOpen = ref(false);

        // 弹窗控制
        const activeModal = ref(null);
        const uploadTargetType = ref('');
        const uploadTargetIndex = ref(null);
        const fileInput = ref(null);
        const tempText = reactive({ title: '', desc: '', align: 'left', index: null });
        const tempInputVal = ref('');
        const editTargetKey = ref('');
        const editTargetLabel = ref('');
        
        // ★★★ 安全锁：默认锁定，直到读取存档完成后才解锁 ★★★
        const isDataLoaded = ref(false);

        const allApps = computed(() => ({ ...desktopApps, ...dockApps }));
        
        const themeState = reactive({
            colors, allApps
        });

        const STORAGE_KEY = 'mySpaceData_v6_vue_split';

        // === 3. 读写存档逻辑 ===
        
        const loadData = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    
                    // 逐项恢复数据
                    if(data.wallpaper) wallpaper.value = data.wallpaper;
                    if(data.avatar) Object.assign(avatar, data.avatar);
                    if(data.profile) Object.assign(profile, data.profile);
                    if(data.colors) Object.assign(colors, data.colors);
                    if(data.photos) photos.splice(0, photos.length, ...data.photos);
                    
                    // 智能合并应用数据（防止代码新增App时被旧存档覆盖消失）
                    if(data.desktopApps) {
                         for (const key in desktopApps) {
                             if(data.desktopApps[key]) Object.assign(desktopApps[key], data.desktopApps[key]);
                         }
                    }
                    if(data.dockApps) {
                        for (const key in dockApps) {
                            if(data.dockApps[key]) Object.assign(dockApps[key], data.dockApps[key]);
                        }
                    }

                    if(data.textWidgets) textWidgets.splice(0, textWidgets.length, ...data.textWidgets);
                    if(data.apiConfig) Object.assign(apiConfig, data.apiConfig);
                    if(data.modelList) modelList.value = data.modelList;
                    if(data.savedApis) savedApis.value = data.savedApis;
                    if(data.qqChats) qqData.chatList = data.qqChats;
                    
                    // ★新增：恢復表情包數據
                    if(data.aiGeneralStickers) qqData.aiGeneralStickers = data.aiGeneralStickers;
                    if(data.userStickers) qqData.userStickers = data.userStickers;
                    
                    console.log("✅ 存檔讀取成功");
                } catch (e) { console.error("讀取存檔失敗", e); }
            }
            // ★★★ 关键步骤：只有读取完（无论成功失败），才允许后续的保存操作 ★★★
            isDataLoaded.value = true;
        };

        const saveData = () => {
            // ★★★ 安全锁检查：如果还没加载完，严禁保存！ ★★★
            if (!isDataLoaded.value) {
                // console.log("⏳ 初始化中，跳过自动保存...");
                return;
            }

            const dataToSave = {
                wallpaper: wallpaper.value, avatar: avatar, profile: profile, colors: colors,
                photos: photos, desktopApps: desktopApps, dockApps: dockApps, textWidgets: textWidgets,
                apiConfig: apiConfig, modelList: modelList.value, savedApis: savedApis.value,
                qqChats: qqData.chatList,
                // ★新增：保存表情包數據
                aiGeneralStickers: qqData.aiGeneralStickers,
                userStickers: qqData.userStickers
            };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave)); } catch (e) {
                 if (e.name === 'QuotaExceededError') {
                    alert("⚠️ 空間不足！請確保只使用鏈接上傳。");
                }
            }
        };

        // 监听变化自动保存
        watch([wallpaper, avatar, profile, colors, photos, desktopApps, dockApps, textWidgets, apiConfig, modelList, savedApis, () => qqData.chatList, () => qqData.aiGeneralStickers, () => qqData.userStickers], () => {
            saveData();
        }, { deep: true });

        // 挂载时读取
        onMounted(() => loadData());

        // 处理 App 点击
        const handleAppClick = (key) => {
            if (key === 'theme') isBeautifyOpen.value = true;
            else if (key === 'settings') isSettingsOpen.value = true;
            else if (key === 'qq') isQQOpen.value = true;
        };

        // === 4. 强制链接上传逻辑 ===
        const handleLinkUpload = (type, index = null) => {
            uploadTargetType.value = type;
            if (index !== null) uploadTargetIndex.value = index;
            activeModal.value = null; 
            
            setTimeout(() => {
                const url = prompt("请输入图片链接 (推荐使用图床或网络图片):", "https://");
                if (url && url.trim() && url !== "https://") {
                     applyUpload(url);
                }
            }, 100);
        };

        const triggerFileUpload = (type, index = null) => {
            handleLinkUpload(type, index);
        };

        const handleFileChange = async (e) => { e.target.value = ''; };

        const applyUpload = (url) => {
            if (uploadTargetType.value === 'avatar') avatar.img = url;
            else if (uploadTargetType.value === 'wallpaper') wallpaper.value = url;
            else if (uploadTargetType.value === 'photo') photos[uploadTargetIndex.value] = url;
            else if (uploadTargetType.value === 'icon') {
                const key = uploadTargetIndex.value;
                if (desktopApps[key]) desktopApps[key].img = url;
                if (dockApps[key]) dockApps[key].img = url;
            }
            activeModal.value = null;
        };

        const handleThemeUpload = (payload) => {
            if (payload.type === 'wallpaper-menu') handleLinkUpload('wallpaper');
            else if (payload.type === 'icon') handleLinkUpload('icon', payload.key);
        };

        // 其他 Modal 逻辑
        const openImageModal = (type, index) => { handleLinkUpload(type, index); }; 
        const setFrame = (f) => { avatar.frame = f; activeModal.value = null; };
        const openSingleEdit = (key, label) => { editTargetKey.value = key; editTargetLabel.value = label; tempInputVal.value = profile[key]; activeModal.value = 'singleEdit'; };
        const saveSingleEdit = () => { if (editTargetKey.value) profile[editTargetKey.value] = tempInputVal.value; activeModal.value = null; };
        
        const openTextEdit = (index) => { const w = textWidgets[index]; tempText.title = w.title; tempText.desc = w.desc; tempText.align = w.align || 'left'; tempText.index = index; activeModal.value = 'textEdit'; };
        const saveTextEdit = () => { const i = tempText.index; textWidgets[i].title = tempText.title; textWidgets[i].desc = tempText.desc; textWidgets[i].align = tempText.align; activeModal.value = null; };
        
        const getFlexAlign = (a) => { if (a === 'center') return 'center'; if (a === 'right') return 'flex-end'; return 'flex-start'; };

        // === 5. 安全的重置逻辑 (保留API) ===
        const resetBeautify = () => {
            if(confirm("确定要重置美化设置吗？\n(包括桌面组件和卡片头像，但保留API设置)")) {
                // 暂停保存，防止重置过程中的中间状态被保存
                isDataLoaded.value = false; 

                wallpaper.value = defaultData.wallpaper;
                Object.assign(avatar, defaultData.avatar);
                Object.assign(profile, defaultData.profile);
                Object.assign(colors, defaultData.colors);
                photos.splice(0, photos.length, ...defaultData.photos);
                
                // 深拷贝重置 Apps，去除所有自定义图片
                const resetDesktop = JSON.parse(JSON.stringify(defaultData.desktopApps));
                for(const k in desktopApps) {
                     if(resetDesktop[k]) Object.assign(desktopApps[k], resetDesktop[k]);
                     else if(desktopApps[k].img) desktopApps[k].img = ''; // 如果是旧代码里没有的App，至少清空图片
                }
                
                const resetDock = JSON.parse(JSON.stringify(defaultData.dockApps));
                for(const k in dockApps) {
                    if(resetDock[k]) Object.assign(dockApps[k], resetDock[k]);
                    else if(dockApps[k].img) dockApps[k].img = '';
                }

                textWidgets.splice(0, textWidgets.length, ...JSON.parse(JSON.stringify(defaultData.textWidgets)));
                
                alert("✅ 美化已重置 (API配置已保留)");
                
                // 重置完成，恢复保存功能，并强制保存一次
                isDataLoaded.value = true;
                saveData();
            }
        };

        return {
            wallpaper, avatar, profile, colors, photos, desktopApps, dockApps, textWidgets,
            isQQOpen, isSettingsOpen, isBeautifyOpen,
            activeModal, tempText, tempInputVal, editTargetLabel, fileInput,
            apiConfig, modelList, savedApis, qqData, themeState,
            handleAppClick, handleFileChange, handleLinkUpload, triggerFileUpload,
            openImageModal, setFrame, openTextEdit, saveTextEdit, openSingleEdit, saveSingleEdit,
            getFlexAlign, handleThemeUpload, resetBeautify
        };
    }
}).mount('#app');
