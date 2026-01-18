// apps/ThemeApps.js
import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        state: Object 
    },
    emits: ['close', 'reset', 'trigger-upload'],
    setup(props, { emit }) {
        const openIconModal = (key) => {
            emit('trigger-upload', { type: 'icon', key: key });
        };
        return { openIconModal };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header">
            <div class="app-header-title">美化中心</div>
            <div class="app-header-close" @click="$emit('close')">完成</div>
        </div>
        <div class="app-content">
            <div style="font-size: 13px; color: #888; margin-bottom: 8px; margin-left: 15px;">壁纸设置</div>
            <div class="settings-group">
                <div class="settings-item" @click="$emit('trigger-upload', { type: 'wallpaper-menu' })">
                    <span class="item-icon">🖼️</span><span class="item-label">更换屏幕壁纸</span><span class="item-arrow">＞</span>
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
