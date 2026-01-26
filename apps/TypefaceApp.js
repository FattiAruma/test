// apps/TypefaceApp.js
import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean
    },
    emits: ['close'],
    setup(props, { emit }) {
        const fontUrl = ref('');
        const fontName = ref('');
        const previewText = ref('这是字体预览效果 The quick brown fox jumps over the lazy dog 1234567890');
        const showPreview = ref(false);

        // 从 localStorage 加载已保存的字体设置
        const loadSavedFont = () => {
            const savedUrl = localStorage.getItem('customFontUrl');
            const savedName = localStorage.getItem('customFontName');
            
            if (savedUrl && savedName) {
                fontUrl.value = savedUrl;
                fontName.value = savedName;
                applyFont(savedUrl, savedName);
                showPreview.value = true;
            }
        };

        // 检测是否为字体文件链接
        const isFontFile = (url) => {
            const fontExtensions = ['.ttf', '.woff', '.woff2', '.otf', '.eot'];
            const lowerUrl = url.toLowerCase();
            return fontExtensions.some(ext => lowerUrl.includes(ext));
        };

        // 获取字体格式
        const getFontFormat = (url) => {
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('.woff2')) return 'woff2';
            if (lowerUrl.includes('.woff')) return 'woff';
            if (lowerUrl.includes('.ttf')) return 'truetype';
            if (lowerUrl.includes('.otf')) return 'opentype';
            if (lowerUrl.includes('.eot')) return 'embedded-opentype';
            return 'truetype'; // 默认
        };

        // 应用字体到整个网站
        const applyFont = (url, name) => {
            // 移除旧的字体样式
            const oldStyle = document.getElementById('customFontStyle');
            if (oldStyle) {
                oldStyle.remove();
            }
            
            // 移除旧的字体链接
            const oldLink = document.getElementById('customFontLink');
            if (oldLink) {
                oldLink.remove();
            }

            if (isFontFile(url)) {
                // 对于字体文件（TTF, WOFF, WOFF2 等），使用 @font-face
                const format = getFontFormat(url);
                const style = document.createElement('style');
                style.id = 'customFontStyle';
                style.textContent = `
                    @font-face {
                        font-family: '${name}';
                        src: url('${url}') format('${format}');
                        font-weight: normal;
                        font-style: normal;
                        font-display: swap;
                    }
                `;
                document.head.appendChild(style);
            } else {
                // 对于 CSS 样式表链接（如 Google Fonts），使用 link 标签
                const link = document.createElement('link');
                link.id = 'customFontLink';
                link.rel = 'stylesheet';
                link.href = url;
                document.head.appendChild(link);
            }

            // 应用字体到整个页面 - 使用更高优先级的样式
            // 移除旧的全局字体样式
            const oldGlobalStyle = document.getElementById('customFontGlobal');
            if (oldGlobalStyle) {
                oldGlobalStyle.remove();
            }
            
            // 创建新的全局字体样式，使用 !important 覆盖所有其他样式
            const globalStyle = document.createElement('style');
            globalStyle.id = 'customFontGlobal';
            globalStyle.textContent = `
                *, *::before, *::after {
                    font-family: '${name}', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
                }
            `;
            document.head.appendChild(globalStyle);
        };

        // 应用字体按钮
        const handleApplyFont = () => {
            const url = fontUrl.value.trim();
            const name = fontName.value.trim();

            if (!url || !name) {
                alert('请输入字体链接和字体名称！');
                return;
            }

            // 应用字体
            applyFont(url, name);

            // 保存到 localStorage
            localStorage.setItem('customFontUrl', url);
            localStorage.setItem('customFontName', name);

            showPreview.value = true;
            alert('✅ 字体已应用！整个网站现在使用新字体。');
        };

        // 重置为默认字体
        const handleResetFont = () => {
            if (!confirm('确定要恢复默认字体吗？')) {
                return;
            }

            // 移除自定义字体样式（@font-face）
            const style = document.getElementById('customFontStyle');
            if (style) {
                style.remove();
            }

            // 移除自定义字体链接
            const link = document.getElementById('customFontLink');
            if (link) {
                link.remove();
            }

            // 恢复默认字体
            document.body.style.fontFamily = '';

            // 清除保存的数据
            localStorage.removeItem('customFontUrl');
            localStorage.removeItem('customFontName');

            // 清空输入框
            fontUrl.value = '';
            fontName.value = '';
            showPreview.value = false;

            alert('✅ 已恢复默认字体！');
        };

        // 组件挂载时加载已保存的字体
        onMounted(() => {
            loadSavedFont();
        });

        return {
            fontUrl,
            fontName,
            previewText,
            showPreview,
            handleApplyFont,
            handleResetFont
        };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header">
            <div class="app-header-title">字体设置</div>
            <div class="app-header-close" @click="$emit('close')">完成</div>
        </div>
        <div class="app-content">
            <div style="padding: 15px;">
                <div style="font-size: 13px; color: #888; margin-bottom: 8px;">字体链接</div>
                <div class="settings-group" style="margin-bottom: 15px;">
                    <div style="padding: 12px 15px;">
                        <input 
                            type="text" 
                            v-model="fontUrl" 
                            placeholder="例如：https://fonts.googleapis.com/css2?family=Roboto"
                            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
                        />
                        <div style="font-size: 12px; color: #999; margin-top: 8px;">
                            💡 推荐使用 Google Fonts 或其他在线字体服务
                        </div>
                    </div>
                </div>

                <div style="font-size: 13px; color: #888; margin-bottom: 8px;">字体名称</div>
                <div class="settings-group" style="margin-bottom: 15px;">
                    <div style="padding: 12px 15px;">
                        <input 
                            type="text" 
                            v-model="fontName" 
                            placeholder="例如：Roboto"
                            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
                        />
                        <div style="font-size: 12px; color: #999; margin-top: 8px;">
                            📝 输入字体的准确名称（区分大小写）
                        </div>
                    </div>
                </div>

                <div v-if="showPreview" style="margin-bottom: 15px;">
                    <div style="font-size: 13px; color: #888; margin-bottom: 8px;">字体预览</div>
                    <div class="settings-group">
                        <div style="padding: 15px; line-height: 1.6;" :style="{ fontFamily: fontName }">
                            {{ previewText }}
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <div class="settings-item" @click="handleApplyFont" style="justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin-bottom: 10px;">
                        <span style="font-size: 15px; font-weight: 500;">✨ 应用字体</span>
                    </div>
                    <div class="settings-item" @click="handleResetFont" style="justify-content: center; color: #ff3b30;">
                        <span style="font-size: 15px;">🔄 恢复默认</span>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 12px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; line-height: 1.6;">
                    <div style="font-weight: 500; margin-bottom: 5px;">📖 使用说明：</div>
                    <div>1. 访问 <a href="https://fonts.google.com" target="_blank" style="color: #667eea;">Google Fonts</a> 选择喜欢的字体</div>
                    <div>2. 点击字体后，复制提供的链接</div>
                    <div>3. 将链接粘贴到"字体链接"输入框</div>
                    <div>4. 输入字体的准确名称到"字体名称"输入框</div>
                    <div>5. 点击"应用字体"即可生效</div>
                </div>
            </div>
        </div>
    </div>
    `
};
