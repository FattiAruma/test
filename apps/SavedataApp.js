// apps/SavedataApp.js
import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean
    },
    emits: ['close'],
    setup(props, { emit }) {
        const handleExport = () => {
            console.log('Export clicked');
            alert('导出功能开发中');
        };
        
        const handleImport = () => {
            console.log('Import clicked');
            alert('导入功能开发中');
        };
        
        const handleAdvanced = () => {
            console.log('Advanced clicked');
            alert('进阶功能开发中');
        };

        return {
            handleExport,
            handleImport,
            handleAdvanced
        };
    },
    template: `
    <div class="app-window" :class="{ open: isOpen }">
        <div class="app-header" style="height: 60px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-bottom: none;">
            <div class="app-header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">导出设置</div>
            <div class="app-header-close" @click="$emit('close')">完成</div>
        </div>
        <div class="app-content">
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                
                <div @click="handleExport" style="
                    background: #e1f5fe;
                    padding: 20px;
                    border-radius: 16px;
                    color: #0277bd;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(2, 119, 189, 0.1);
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="font-size: 24px; margin-right: 15px;">📤</div>
                    <div>
                        <div style="font-size: 18px; font-weight: bold;">导出存档</div>
                        <div style="font-size: 12px; opacity: 0.9;">备份当前所有数据</div>
                    </div>
                </div>

                <div @click="handleImport" style="
                    background: #fce4ec;
                    padding: 20px;
                    border-radius: 16px;
                    color: #c2185b;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(194, 24, 91, 0.1);
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="font-size: 24px; margin-right: 15px;">📥</div>
                    <div>
                        <div style="font-size: 18px; font-weight: bold;">导入存档</div>
                        <div style="font-size: 12px; opacity: 0.9;">恢复之前的备份</div>
                    </div>
                </div>

                <div @click="handleAdvanced" style="
                    background: #f3e5f5;
                    padding: 20px;
                    border-radius: 16px;
                    color: #7b1fa2;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(123, 31, 162, 0.1);
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="font-size: 24px; margin-right: 15px;">🛠️</div>
                    <div>
                        <div style="font-size: 18px; font-weight: bold;">进阶导出/导入</div>
                        <div style="font-size: 12px; opacity: 0.9;">手动管理 JSON 数据</div>
                    </div>
                </div>

            </div>
        </div>
    </div>
    `
};
