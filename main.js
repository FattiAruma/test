// main.js
import { createApp, ref, reactive, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import QQApps from './apps/QQApps.js';
import SettingsApp from './apps/SettingsApp.js';
import ThemeApps from './apps/ThemeApps.js';

createApp({
    components: { QQApps, SettingsApp, ThemeApps },
    setup() {
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

        // 响应式状态
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
        const qqData = reactive({ chatList: [], currentChatId: null, inputMsg: '', isSending: false });
        
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

        const allApps = computed(() => ({ ...desktopApps, ...dockApps }));
        
        // 专门传递给 ThemeApp 的状态包
        const themeState = reactive({
            colors, allApps
        });

        const STORAGE_KEY = 'mySpaceData_v6_vue_split';

        const loadData = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if(data.wallpaper) wallpaper.value = data.wallpaper;
                    if(data.avatar) Object.assign(avatar, data.avatar);
                    if(data.profile) Object.assign(profile, data.profile);
                    if(data.colors) Object.assign(colors, data.colors);
                    if(data.photos) photos.splice(0, photos.length, ...data.photos);
                    if(data.desktopApps) Object.assign(desktopApps, data.desktopApps);
                    if(data.dockApps) Object.assign(dockApps, data.dockApps);
                    if(data.textWidgets) textWidgets.splice(0, textWidgets.length, ...data.textWidgets);
                    if(data.apiConfig) Object.assign(apiConfig, data.apiConfig);
                    if(data.modelList) modelList.value = data.modelList;
                    if(data.savedApis) savedApis.value = data.savedApis;
                    if(data.qqChats) qqData.chatList = data.qqChats;
                } catch (e) { console.error("读取存档失败", e); }
            }
        };

        const saveData = () => {
            const dataToSave = {
                wallpaper: wallpaper.value, avatar: avatar, profile: profile, colors: colors,
                photos: photos, desktopApps: desktopApps, dockApps: dockApps, textWidgets: textWidgets,
                apiConfig: apiConfig, modelList: modelList.value, savedApis: savedApis.value,
                qqChats: qqData.chatList
            };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave)); } catch (e) {}
        };

        watch([wallpaper, avatar, profile, colors, photos, desktopApps, dockApps, textWidgets, apiConfig, modelList, savedApis, () => qqData.chatList], () => {
            saveData();
        }, { deep: true });

        onMounted(() => loadData());

        // 处理 App 点击
        const handleAppClick = (key) => {
            if (key === 'theme') isBeautifyOpen.value = true;
            else if (key === 'settings') isSettingsOpen.value = true;
            else if (key === 'qq') isQQOpen.value = true;
        };

        // 处理上传逻辑 (通用)
        const triggerFileUpload = (type, index = null) => {
            uploadTargetType.value = type;
            uploadTargetIndex.value = index;
            fileInput.value.click();
        };

        const handleFileChange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (ev) => {
                    const url = ev.target.result; // 这里简化了压缩逻辑
                    applyUpload(url);
                };
            }
            e.target.value = '';
        };

        const handleLinkUpload = (type, index = null) => {
            uploadTargetType.value = type;
            if (index !== null) uploadTargetIndex.value = index;
            activeModal.value = null;
            setTimeout(() => {
                const url = prompt("请输入图片链接:");
                if (url && url.trim()) applyUpload(url);
            }, 100);
        };

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

        // 接收 ThemeApp 的上传请求
        const handleThemeUpload = (payload) => {
            if (payload.type === 'wallpaper-menu') activeModal.value = 'wallpaper';
            else if (payload.type === 'icon') {
                uploadTargetType.value = 'icon';
                uploadTargetIndex.value = payload.key;
                activeModal.value = 'icon';
            }
        };

        // 其他 Modal 逻辑
        const openImageModal = (type, index) => { triggerFileUpload(type, index); activeModal.value = 'image'; }; // 简化
        const setFrame = (f) => { avatar.frame = f; activeModal.value = null; };
        const openSingleEdit = (key, label) => { editTargetKey.value = key; editTargetLabel.value = label; tempInputVal.value = profile[key]; activeModal.value = 'singleEdit'; };
        const saveSingleEdit = () => { if (editTargetKey.value) profile[editTargetKey.value] = tempInputVal.value; activeModal.value = null; };
        
        const openTextEdit = (index) => { const w = textWidgets[index]; tempText.title = w.title; tempText.desc = w.desc; tempText.align = w.align || 'left'; tempText.index = index; activeModal.value = 'textEdit'; };
        const saveTextEdit = () => { const i = tempText.index; textWidgets[i].title = tempText.title; textWidgets[i].desc = tempText.desc; textWidgets[i].align = tempText.align; activeModal.value = null; };
        
        const getFlexAlign = (a) => { if (a === 'center') return 'center'; if (a === 'right') return 'flex-end'; return 'flex-start'; };

        const resetBeautify = () => {
             if(confirm("重置美化？")) {
                wallpaper.value = defaultData.wallpaper;
                Object.assign(avatar, defaultData.avatar);
                Object.assign(profile, defaultData.profile);
                Object.assign(colors, defaultData.colors);
                photos.splice(0, photos.length, ...defaultData.photos);
                Object.assign(desktopApps, JSON.parse(JSON.stringify(defaultData.desktopApps)));
                Object.assign(dockApps, JSON.parse(JSON.stringify(defaultData.dockApps)));
                alert("已重置");
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
