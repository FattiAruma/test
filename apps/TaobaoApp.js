// apps/TaobaoApp.js
export default {
    props: {
        isOpen: Boolean
    },
    emits: ['close'],
    setup(props, { emit }) {
        return {};
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header" style="height: 60px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-bottom: none;">
            <div class="app-header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">桃Bao</div>
            <div class="app-header-close" @click="$emit('close')">关闭</div>
        </div>
        <div class="app-content">
            <div style="padding: 20px; text-align: center; color: #888;">
                这里是桃Bao页面
            </div>
        </div>
    </div>
    `
};
