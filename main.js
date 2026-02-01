// main.js
import { createApp, ref, reactive, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import QQApps from './apps/QQApps.js';
import SettingsApp from './apps/SettingsApp.js';
import ThemeApps from './apps/ThemeApps.js';
import TypefaceApp from './apps/TypefaceApp.js';
import OtomegameApp from './apps/OtomegameApp.js';
import WorldbookApp from './apps/WorldbookApp.js';

createApp({
    components: { QQApps, SettingsApp, ThemeApps, TypefaceApp, OtomegameApp, WorldbookApp },
    setup() {
        // === 1. 定义默认数据 ===
        const defaultData = {
            wallpaper: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
            avatar: { img: '', frame: 'frame-pink' },
            profile: { name: '小手机 <3', bio1: 'Welcome to my world', bio2: '点击下方图标开始聊天' },
            colors: { app: '#5D4037', widget: '#5D4037', header: '#5D4037', accent: '#007aff' },
            photos: [
                'https://images.unsplash.com/photo-1516961642265-531546e84af2?q=80&w=400&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=400&auto=format&fit=crop'
            ],
            desktopApps: {
                qq: { icon: '🐧', name: 'QQ', img: '' },
                world: { icon: '📕', name: '世界书', img: '' },
                phone: { icon: '📱', name: '查手机', img: '' },
                otomegame: { icon: '🎮', name: '恋爱轮盘', img: '' },
            },
            desktopAppsPage2: {
                taobao: { icon: '淘', name: '桃Bao', img: '' },
                bilibili: { icon: '📺', name: '哔哩哔哩', img: '' },
                ins: { icon: '📷', name: 'ins', img: '' },
                musicgame: { icon: '🎵', name: '音游', img: '' },
                mailbox: { icon: '🤫', name: '匿名箱', img: '' },
                discord: { icon: '💬', name: 'Discord', img: '' },
                live: { icon: '🔴', name: '直播间', img: '' },
                novel: { icon: '📖', name: '小说', img: '' },
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
        const desktopAppsPage2 = reactive(JSON.parse(JSON.stringify(defaultData.desktopAppsPage2)));
        const dockApps = reactive(JSON.parse(JSON.stringify(defaultData.dockApps)));
        const textWidgets = reactive(JSON.parse(JSON.stringify(defaultData.textWidgets)));
        const customFrames = reactive([]);
        const presetFrames = [
            'https://i.postimg.cc/gcNzFt0D/Magic-Eraser-260125-110430.png',
            'https://i.postimg.cc/JhVmc9Tj/Magic-Eraser-260125-105611.png',
            'https://i.postimg.cc/gj8kWmBY/Magic-Eraser-260125-105728.png',
            'https://i.postimg.cc/W1Xpj9S1/Magic-Eraser-260125-110308.png',
            'https://i.postimg.cc/brYV5KF5/Magic_Eraser_260125_110639.png',
            'https://i.postimg.cc/90XgkvNv/Magic_Eraser_260125_110709.png',
            'https://i.postimg.cc/63D6BfC6/Magic_Eraser_260131_201545.png',
            'https://i.postimg.cc/Y9J2tzQ4/Magic_Eraser_260131_201619.png',
            'https://i.postimg.cc/qR9Bpx2h/Magic_Eraser_260131_201701.png',
            'https://i.postimg.cc/50Z9fS8C/Magic_Eraser_260131_201734.png',
            'https://i.postimg.cc/4dr4XQpH/Magic_Eraser_260131_201821.png',
            'https://i.postimg.cc/W3Qpsw00/Magic_Eraser_260131_201859.png'
        ];
        
        const apiConfig = reactive({ ...defaultData.apiConfig });
        const modelList = ref([]);
        const savedApis = ref([]);
        const qqData = reactive({ chatList: [], currentChatId: null, inputMsg: '', isSending: false, aiGeneralStickers: [], userStickers: [], universalWallpaper: '' });
        
        // App 开关状态
        const isQQOpen = ref(false);
        const isSettingsOpen = ref(false);
        const isBeautifyOpen = ref(false);
        const isFontOpen = ref(false);
        const isOtomegameOpen = ref(false);
        const isWorldbookOpen = ref(false);

        // 页面滑动
        const currentPage = ref(0);
        const touchstartX = ref(0);
        const currentX = ref(0);
        const dragX = ref(0);
        const isDragging = ref(false);
        const screenWidth = ref(window.innerWidth);

        const screensContainerStyle = computed(() => {
            // 使用百分比来处理页面切换，避免 resize 时的抖动
            // screens-container 宽度是 200%，所以切换一页是 50%
            const percentage = -currentPage.value * 50;
            const pixelOffset = dragX.value;
            
            const transition = isDragging.value ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            return {
                transform: `translateX(calc(${percentage}% + ${pixelOffset}px))`,
                transition: transition,
            };
        });

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

        const allApps = computed(() => ({ ...desktopApps, ...desktopAppsPage2, ...dockApps }));

        const wallpapers = reactive({
            menu: computed(() => wallpaper.value),
            qqUniversal: computed(() => qqData.universalWallpaper)
        });
        
        const themeState = reactive({
            colors, allApps, avatar, presetFrames, customFrames, wallpapers
        });

        const STORAGE_KEY = 'mySpaceData_v6_vue_split';

        // === 3. 读写存档逻辑 (升级为 IndexedDB) ===
        
        const loadData = async () => {
            try {
                // 优先从 IndexedDB 读取
                let saved = await localforage.getItem(STORAGE_KEY);
                
                // 迁移逻辑：如果 IndexedDB 为空，尝试从 LocalStorage 读取旧数据
                if (!saved) {
                    const localSaved = localStorage.getItem(STORAGE_KEY);
                    if (localSaved) {
                        console.log("🔄 检测到旧版存档，正在迁移到大容量存储...");
                        saved = localSaved;
                        // 迁移成功后，可以考虑清除旧的 localStorage，这里暂时保留作为备份
                    }
                }

                if (saved) {
                    const data = JSON.parse(saved);
                    
                    // 逐项恢复数据
                    if(data.wallpaper) wallpaper.value = data.wallpaper;
                    if(data.avatar) Object.assign(avatar, data.avatar);
                    if(data.profile) Object.assign(profile, data.profile);
                    if(data.colors) Object.assign(colors, data.colors);
                    // 确保 accent 存在 (兼容旧存档)
                    if (!colors.accent) colors.accent = '#007aff';
                    
                    if(data.photos) photos.splice(0, photos.length, ...data.photos);
                    
                    // 智能合并应用数据
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

                    if(data.desktopAppsPage2) {
                         for (const key in desktopAppsPage2) {
                             if(data.desktopAppsPage2[key]) Object.assign(desktopAppsPage2[key], data.desktopAppsPage2[key]);
                         }
                    }

                    if(data.textWidgets) textWidgets.splice(0, textWidgets.length, ...data.textWidgets);
                    if(data.apiConfig) Object.assign(apiConfig, data.apiConfig);
                    if(data.modelList) modelList.value = data.modelList;
                    if(data.savedApis) savedApis.value = data.savedApis;
                    if(data.qqChats) qqData.chatList = data.qqChats;
                    
                    if(data.aiGeneralStickers) qqData.aiGeneralStickers = data.aiGeneralStickers;
                    if(data.userStickers) qqData.userStickers = data.userStickers;
                    
                    if(data.customFrames) customFrames.splice(0, customFrames.length, ...data.customFrames);
                    
                    if(data.qqUniversalWallpaper) qqData.universalWallpaper = data.qqUniversalWallpaper;

                    console.log("✅ 存檔讀取成功 (IndexedDB)");
                }
            } catch (e) { console.error("讀取存檔失敗", e); }
            
            // ★★★ 关键步骤：只有读取完（无论成功失败），才允许后续的保存操作 ★★★
            isDataLoaded.value = true;
        };

        let saveTimeout = null;
        const saveData = () => {
            // ★★★ 安全锁检查：如果还没加载完，严禁保存！ ★★★
            if (!isDataLoaded.value) return;

            // 防抖：避免频繁写入 IndexedDB
            if (saveTimeout) clearTimeout(saveTimeout);

            saveTimeout = setTimeout(async () => {
                const dataToSave = {
                    wallpaper: wallpaper.value, avatar: avatar, profile: profile, colors: colors,
                    photos: photos, desktopApps: desktopApps, desktopAppsPage2: desktopAppsPage2, dockApps: dockApps, textWidgets: textWidgets,
                    apiConfig: apiConfig, modelList: modelList.value, savedApis: savedApis.value,
                    qqChats: qqData.chatList,
                    aiGeneralStickers: qqData.aiGeneralStickers,
                    userStickers: qqData.userStickers,
                    qqUniversalWallpaper: qqData.universalWallpaper,
                    customFrames: customFrames
                };
                try { 
                    await localforage.setItem(STORAGE_KEY, JSON.stringify(dataToSave)); 
                    // 保存成功后，清理旧的 LocalStorage 以释放空间并避免双重占用
                    if (localStorage.getItem(STORAGE_KEY)) {
                        localStorage.removeItem(STORAGE_KEY);
                    }
                } catch (e) {
                    console.error("Save failed", e);
                    alert("⚠️ 保存失败: " + e.message);
                }
            }, 1000); // 1秒延迟保存
        };

        // 生成头像框样式
        const generateFrameStyles = () => {
            let styleEl = document.getElementById('custom-frame-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'custom-frame-styles';
                document.head.appendChild(styleEl);
            }
            
            let css = '';
            
            // 预设头像框
            presetFrames.forEach((frameUrl, index) => {
                // 检查是否是需要调整的特定头像框 (索引 6 到 11)
                const isSpecialFrame = index >= 6 && index <= 11;
                const transformStyle = isSpecialFrame 
                    ? 'transform: translate(-50%, -57%) scale(1.07);' // 向上微调并放大
                    : 'transform: translate(-50%, -50%);'; // 默认居中

                css += `
                    .avatar.preset-frame-${index}::before {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: calc(100% + 16px);
                        height: calc(100% + 16px);
                        background-image: url('${frameUrl}');
                        background-size: cover;
                        background-position: center;
                        z-index: -1;
                        ${transformStyle}
                    }
                `;
            });

            // 自定义头像框
            customFrames.forEach((frameUrl, index) => {
                css += `
                    .avatar.custom-frame-${index}::before {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: calc(100% + 16px);
                        height: calc(100% + 16px);
                        background-image: url('${frameUrl}');
                        background-size: cover;
                        background-position: center;
                        z-index: -1;
                        transform: translate(-50%, -50%);
                    }
                `;
            });
            styleEl.textContent = css;
        };

        
        // 监听自定义头像框变化，更新样式
        watch(customFrames, () => {
            generateFrameStyles();
        }, { deep: true });

        // 更新主题色 CSS 变量
        const updateAccentColor = () => {
            const root = document.documentElement;
            const color = colors.accent || '#007aff';
            root.style.setProperty('--accent-color', color);
            
            // 简单的变暗处理用于渐变
            // 这里简单处理，如果需要更精确的颜色操作可以使用库，或者直接用纯色
            // 为了保持简单，我们这里直接设置一个稍微变暗的颜色变量，或者直接让 CSS 使用 color-mix
            // 但为了兼容性，我们可以在这里计算一个简单的 hex 变暗
            // 简单起见，我们让 CSS 使用 color-mix 或者直接用纯色代替渐变，或者只改变主色
            // 这里我们尝试计算一个 darken 颜色
            try {
                let r = parseInt(color.substring(1, 3), 16);
                let g = parseInt(color.substring(3, 5), 16);
                let b = parseInt(color.substring(5, 7), 16);
                
                r = Math.floor(r * 0.85);
                g = Math.floor(g * 0.85);
                b = Math.floor(b * 0.85);
                
                const darkColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                root.style.setProperty('--accent-color-dark', darkColor);
                
                const shadowColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
                root.style.setProperty('--accent-color-shadow', shadowColor);
            } catch (e) {
                root.style.setProperty('--accent-color-dark', color);
                root.style.setProperty('--accent-color-shadow', color); // Fallback
            }
        };

        // 监听变化自动保存
        watch([wallpaper, avatar, profile, colors, photos, desktopApps, desktopAppsPage2, dockApps, textWidgets, customFrames, apiConfig, modelList, savedApis, () => qqData.chatList, () => qqData.aiGeneralStickers, () => qqData.userStickers, () => qqData.universalWallpaper], () => {
            saveData();
        }, { deep: true });
        
        // 监听颜色变化更新 CSS
        watch(() => colors.accent, () => {
            updateAccentColor();
        });

        // 挂载时读取并生成样式
        onMounted(() => {
            loadData();
            updateAccentColor();
            setTimeout(() => generateFrameStyles(), 100);
            
            // 添加滑动事件监听
            const screensWrapper = document.querySelector('.screens-wrapper');
            if (screensWrapper) {
                screensWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
                screensWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
                screensWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
            }
            window.addEventListener('resize', () => {
                screenWidth.value = window.innerWidth;
            });
        });

        // 滑动逻辑
        const handleTouchStart = (e) => {
            // 如果事件发生在可滚动元素内部，则不启动拖动
            if (e.target.closest('.app-window, .modal-overlay')) return;
            
            isDragging.value = true;
            touchstartX.value = e.touches[0].clientX;
            currentX.value = e.touches[0].clientX;
        };

        const handleTouchMove = (e) => {
            if (!isDragging.value) return;
            
            // 阻止页面默认的上下滚动行为，以优化左右滑动体验
            e.preventDefault();

            const dx = e.touches[0].clientX - currentX.value;
            currentX.value = e.touches[0].clientX;
            dragX.value += dx;
        };

        const handleTouchEnd = (e) => {
            if (!isDragging.value) return;

            isDragging.value = false;
            const swipeThreshold = 50; // 调整滑动阈值，50px 应该会灵敏很多

            if (dragX.value < -swipeThreshold) {
                // 向左滑，切换到下一页
                if (currentPage.value < 1) {
                    currentPage.value++;
                }
            } else if (dragX.value > swipeThreshold) {
                // 向右滑，切换到上一页
                if (currentPage.value > 0) {
                    currentPage.value--;
                }
            }

            // 重置拖动距离
            dragX.value = 0;
        };

        // 处理 App 点击
        const handleAppClick = (key) => {
            if (key === 'theme') isBeautifyOpen.value = true;
            else if (key === 'settings') isSettingsOpen.value = true;
            else if (key === 'qq') isQQOpen.value = true;
            else if (key === 'font') isFontOpen.value = true;
            else if (key === 'otomegame') isOtomegameOpen.value = true;
            else if (key === 'world') isWorldbookOpen.value = true;
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
                if (desktopAppsPage2[key]) desktopAppsPage2[key].img = url;
                if (dockApps[key]) dockApps[key].img = url;
            } else if (uploadTargetType.value === 'qq-wallpaper-universal') {
                qqData.universalWallpaper = url;
            }
            activeModal.value = null;
        };

        const handleThemeUpload = (payload) => {
            if (payload.type === 'wallpaper-menu') handleLinkUpload('wallpaper');
            else if (payload.type === 'icon') handleLinkUpload('icon', payload.key);
            else if (payload.type === 'wallpaper-qq-universal') handleLinkUpload('qq-wallpaper-universal');
        };
        
        const handleFrameAction = (payload) => {
            if (payload.type === 'set') {
                setFrame(payload.frame);
            } else if (payload.type === 'add') {
                addCustomFrame();
            } else if (payload.type === 'delete') {
                deleteCustomFrame(payload.index);
            }
        };

        // 其他 Modal 逻辑
        const openImageModal = (type, index) => { handleLinkUpload(type, index); }; 
        const setFrame = (f) => { avatar.frame = f; activeModal.value = null; };
        
        // 添加自定义头像框
        const addCustomFrame = () => {
            activeModal.value = null;
            setTimeout(() => {
                const url = prompt("请输入自定义头像框图片链接:", "https://");
                if (url && url.trim() && url !== "https://") {
                    customFrames.push(url);
                    // 自动设置为新添加的头像框
                    avatar.frame = 'custom-frame-' + (customFrames.length - 1);
                }
            }, 100);
        };
        
        const deleteCustomFrame = (index) => {
            if (confirm('确定要删除这个自定义头像框吗？')) {
                // 如果当前使用的是要删除的头像框，切换到无头像框
                if (avatar.frame === 'custom-frame-' + index) {
                    avatar.frame = '';
                }
                // 如果使用的是后面的头像框，需要更新索引
                else if (avatar.frame.startsWith('custom-frame-')) {
                    const currentIndex = parseInt(avatar.frame.replace('custom-frame-', ''));
                    if (currentIndex > index) {
                        avatar.frame = 'custom-frame-' + (currentIndex - 1);
                    }
                }
                
                // 删除头像框
                customFrames.splice(index, 1);
                
                // 重新生成样式
                generateFrameStyles();
            }
        };
        
        const openSingleEdit = (key, label) => { editTargetKey.value = key; editTargetLabel.value = label; tempInputVal.value = profile[key]; activeModal.value = 'singleEdit'; };
        const saveSingleEdit = () => { if (editTargetKey.value) profile[editTargetKey.value] = tempInputVal.value; activeModal.value = null; };
        
        const openTextEdit = (index) => { const w = textWidgets[index]; tempText.title = w.title; tempText.desc = w.desc; tempText.align = w.align || 'left'; tempText.index = index; activeModal.value = 'textEdit'; };
        const saveTextEdit = () => { const i = tempText.index; textWidgets[i].title = tempText.title; textWidgets[i].desc = tempText.desc; textWidgets[i].align = tempText.align; activeModal.value = null; };
        
        const getFlexAlign = (a) => { if (a === 'center') return 'center'; if (a === 'right') return 'flex-end'; return 'flex-start'; };

        // === 5. 安全的重置逻辑 (保留API) ===
        const resetBeautify = () => {
            if(confirm("确定要重置美化设置吗？\n(包括桌面组件和卡片头像)")) {
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

                const resetDesktop2 = JSON.parse(JSON.stringify(defaultData.desktopAppsPage2));
                for(const k in desktopAppsPage2) {
                    if(resetDesktop2[k]) Object.assign(desktopAppsPage2[k], resetDesktop2[k]);
                    else if(desktopAppsPage2[k].img) desktopAppsPage2[k].img = '';
                }
                
                const resetDock = JSON.parse(JSON.stringify(defaultData.dockApps));
                for(const k in dockApps) {
                    if(resetDock[k]) Object.assign(dockApps[k], resetDock[k]);
                    else if(dockApps[k].img) dockApps[k].img = '';
                }

                textWidgets.splice(0, textWidgets.length, ...JSON.parse(JSON.stringify(defaultData.textWidgets)));
                
                // 重置QQ通用壁纸
                qqData.universalWallpaper = '';

                alert("✅ 美化已重置");
                
                // 重置完成，恢复保存功能，并强制保存一次
                isDataLoaded.value = true;
                saveData();
            }
        };

        return {
            wallpaper, avatar, profile, colors, photos, desktopApps, desktopAppsPage2, dockApps, textWidgets,
            isQQOpen, isSettingsOpen, isBeautifyOpen, isFontOpen, isOtomegameOpen, isWorldbookOpen,
            activeModal, tempText, tempInputVal, editTargetLabel, fileInput,
            apiConfig, modelList, savedApis, qqData, themeState,
            uploadTargetType, uploadTargetIndex, customFrames, presetFrames,
            currentPage,
            screensContainerStyle, // 导出样式
            handleAppClick, handleFileChange, handleLinkUpload, triggerFileUpload,
            openImageModal, setFrame, addCustomFrame, deleteCustomFrame, openTextEdit, saveTextEdit, openSingleEdit, saveSingleEdit,
            getFlexAlign, handleThemeUpload, resetBeautify, handleFrameAction
        };
    }
}).mount('#app');
