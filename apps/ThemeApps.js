// apps/ThemeApps.js
import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        state: Object // 传入整个状态对象，方便修改颜色和图标
    },
    emits: ['close', 'reset', 'trigger-upload'],
    setup(props, { emit }) {
        const allApps = props.state.allApps; // 从 props 访问
        const activeModal = ref(null);
        
        // 简单的本地处理，具体的上传逻辑委托给 Main 处理
        const openIconModal = (key) => {
            emit('trigger-upload', { type: 'icon', key: key });
        };

        const triggerWallpaper = () => {
             // 打开选择壁纸的弹窗
             activeModal.value = 'wallpaper';
        };
        
        // 这里的 modal 只是 Theme App 内部的小弹窗，或者委托给 Main
        // 为了简化，我们在 ThemeApp 内部只显示列表，点击后由 Main 弹窗处理
        // 但颜色修改是实时的
        
        const getWallpaperStyle = (wallpaperUrl) => ({
            width: '35px',
            height: '55px',
            borderRadius: '4px',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            marginLeft: 'auto',
            marginRight: '8px',
            border: '1px solid #ddd',
            backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : 'none',
            backgroundColor: props.state.colors ? props.state.colors.background : '#f0f0f0'
        });
        
        return { 
            activeModal,
            openIconModal,
            triggerWallpaper,
            getWallpaperStyle
        };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header" style="height: 60px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-bottom: none;">
            <div class="app-header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">美化中心</div>
            <div class="app-header-close" @click="$emit('close')">完成</div>
        </div>
        <div class="app-content">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">壁纸设置</div>
            <div class="settings-group">
                <div class="settings-item" @click="$emit('trigger-upload', { type: 'wallpaper-menu' })">
                    <span class="item-icon">🖼️</span>
                    <span class="item-label">更换屏幕壁纸</span>
                    <div :style="getWallpaperStyle(state.wallpapers && state.wallpapers.menu)"></div>
                    <span class="item-arrow">＞</span>
                </div>
                <div class="settings-item" @click="$emit('trigger-upload', { type: 'wallpaper-qq-universal' })">
                    <span class="item-icon">💬</span>
                    <span class="item-label">QQ聊天室通用壁纸</span>
                    <div :style="getWallpaperStyle(state.wallpapers && state.wallpapers.qqUniversal)"></div>
                    <span class="item-arrow">＞</span>
                </div>
            </div>
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">图标管理</div>
            <div class="settings-group">
                <div class="settings-item" v-for="(app, key) in state.allApps" :key="key" @click="openIconModal(key)">
                    <span class="item-icon">{{ app.icon }}</span><span class="item-label">{{ app.name }} 图标</span><span class="item-arrow">＞</span>
                </div>
            </div>
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">文字颜色</div>
            <div class="settings-group">
                <div class="settings-item">
                    <div class="color-preview-dot" :style="{ backgroundColor: state.colors.app }"></div>
                    <span class="item-label">App 图标文字</span><span class="item-arrow">＞</span>
                    <input type="color" class="hidden-color-input" v-model="state.colors.app">
                </div>
                <div class="settings-item">
                    <div class="color-preview-dot" :style="{ backgroundColor: state.colors.appNameShadow }"></div>
                    <span class="item-label">App 图标文字阴影</span><span class="item-arrow">＞</span>
                    <input type="color" class="hidden-color-input" v-model="state.colors.appNameShadow">
                </div>
                <div class="settings-item">
                    <div class="color-preview-dot" :style="{ backgroundColor: state.colors.widget }"></div>
                    <span class="item-label">桌面组件文字</span><span class="item-arrow">＞</span>
                    <input type="color" class="hidden-color-input" v-model="state.colors.widget">
                </div>
                <div class="settings-item">
                    <div class="color-preview-dot" :style="{ backgroundColor: state.colors.header }"></div>
                    <span class="item-label">顶部卡片文字</span><span class="item-arrow">＞</span>
                    <input type="color" class="hidden-color-input" v-model="state.colors.header">
                </div>
            </div>
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">系统主题色</div>
            <div class="settings-group">
                <div class="settings-item">
                    <div class="color-preview-dot" :style="{ backgroundColor: state.colors.accent || '#007aff' }"></div>
                    <span class="item-label">全局强调色 (按钮/边框等)</span><span class="item-arrow">＞</span>
                    <input type="color" class="hidden-color-input" v-model="state.colors.accent">
                </div>
            </div>
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">重置</div>
            <div class="settings-group">
                <div class="settings-item" @click="$emit('reset')" style="justify-content: center;">
                    <span class="item-label" style="color: #ff3b30; text-align: center; flex: none;">⚠️ 重置美化</span>
                </div>
            </div>
        </div>
    </div>
    `
};
