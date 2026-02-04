import { ref, computed, watch, onMounted, toRefs } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
    props: {
        isOpen: Boolean,
        apiConfig: Object,
        taobaoData: Object
    },
    emits: ['close'],
    setup(props, { emit }) {
        const { balance, cart, products, orders, transactions } = toRefs(props.taobaoData);

        const activeTab = ref('home');
        const profileTab = ref('orders'); // 'orders' or 'transactions'
        const searchQuery = ref('');
        const selectedProduct = ref(null);
        const isSearching = ref(false);
        const showRecharge = ref(false);
        const rechargeAmount = ref('');
        const showPaymentChoice = ref(false);
        const itemsToBuy = ref([]);
        
        const defaultProducts = [
            {
                id: 1,
                title: '复古加厚卫衣',
                price: '128.00',
                color: '#d1d1d1',
                comments: [
                    { id: 1, user: '小***猫', rating: 5, content: '质量很好，很厚实，穿着暖和。' },
                    { id: 2, user: 't***1', rating: 4, content: '稍微有点色差，不过版型不错。' }
                ]
            },
            {
                id: 2,
                title: '全自动晴雨伞',
                price: '49.90',
                color: '#bfbfbf',
                comments: [
                    { id: 1, user: '雨***天', rating: 5, content: '非常结实，抗风能力强。' },
                    { id: 2, user: 's***9', rating: 5, content: '自动开合很方便。' },
                    { id: 3, user: 'k***2', rating: 3, content: '有点重。' }
                ]
            },
            {
                id: 3,
                title: '陶瓷马克杯',
                price: '25.00',
                color: '#e0e0e0',
                comments: [
                    { id: 1, user: 'c***fee', rating: 5, content: '包装很严实，杯子很好看。' },
                    { id: 2, user: 'm***k', rating: 4, content: '容量刚好。' }
                ]
            }
        ];

        const openProduct = (product) => {
            selectedProduct.value = product;
        };

        const closeProduct = () => {
            selectedProduct.value = null;
        };

        const addToCart = () => {
            if (selectedProduct.value) {
                cart.value.push({
                    ...selectedProduct.value,
                    checked: false
                });
                selectedProduct.value = null;
                activeTab.value = 'cart';
            }
        };

        const isAllChecked = computed({
            get: () => cart.value.length > 0 && cart.value.every(item => item.checked),
            set: (val) => {
                cart.value.forEach(item => item.checked = val);
            }
        });

        const openRecharge = () => {
            showRecharge.value = true;
            rechargeAmount.value = '';
        };

        const closeRecharge = () => {
            showRecharge.value = false;
        };

        const confirmRecharge = () => {
            const amount = parseFloat(rechargeAmount.value);
            if (isNaN(amount) || amount <= 0) {
                alert('请输入有效的金额');
                return;
            }
            balance.value = parseFloat((balance.value + amount).toFixed(2));
            transactions.value.unshift({
                id: Date.now(),
                type: 'income',
                description: '钱包充值',
                amount: `+${amount.toFixed(2)}`
            });
            closeRecharge();
        };

        const buyItems = () => {
            const selectedItems = cart.value.filter(item => item.checked);
            if (selectedItems.length === 0) {
                alert('请选择要购买的商品');
                return;
            }
            itemsToBuy.value = selectedItems;
            showPaymentChoice.value = true;
        };

        const closePaymentChoice = () => {
            showPaymentChoice.value = false;
            itemsToBuy.value = [];
        };

        const payBySelf = () => {
            const totalCost = itemsToBuy.value.reduce((sum, item) => sum + parseFloat(item.price), 0);

            if (balance.value < totalCost) {
                alert('钱包余额不足');
                return;
            }

            // 更新余额
            balance.value = parseFloat((balance.value - totalCost).toFixed(2));

            // 记录交易
            transactions.value.unshift({
                id: Date.now(),
                type: 'expense',
                description: `购买 ${itemsToBuy.value.length} 件商品`,
                amount: `-${totalCost.toFixed(2)}`
            });

            // 移动商品
            itemsToBuy.value.forEach(item => {
                orders.value.unshift({ ...item, purchaseDate: new Date().toLocaleDateString() });
            });

            // 从购物车移除
            cart.value = cart.value.filter(item => !item.checked);
            
            alert('购买成功！');
            closePaymentChoice();
        };

        const payByOther = () => {
            alert('功能暂未开放');
            closePaymentChoice();
        };

        const buyNow = (product) => {
            itemsToBuy.value = [product];
            showPaymentChoice.value = true;
        };

        onMounted(() => {
            // 如果从父组件加载后产品列表仍为空，则填充默认产品
            if (!products.value || products.value.length === 0) {
                products.value = defaultProducts;
            }
        });

        const searchProducts = async () => {
            if (!searchQuery.value.trim()) return;
            if (!props.apiConfig || !props.apiConfig.endpoint || !props.apiConfig.key) {
                alert("请先在设置中配置 API");
                return;
            }

            isSearching.value = true;
            
            try {
                let baseUrl = props.apiConfig.endpoint.trim().replace(/\/+$/, '');
                if (baseUrl.endsWith('/v1')) baseUrl = baseUrl.slice(0, -3);

                const prompt = `请生成关于"${searchQuery.value}"的6个淘宝商品数据。
要求：
1. 返回纯 JSON 数组格式，不要包含 markdown 代码块标记。
2. 每个商品包含以下字段：
   - id: 数字 (1-6)
   - title: 商品标题 (吸引人)
   - price: 价格 (字符串，保留两位小数)
   - color: 背景色 (十六进制颜色代码，柔和的浅色)
   - comments: 数组，包含2-3条评论对象 { id, user, rating (1-5), content }
3. 确保6个商品的描述、价格、评分各不相同。
4. 评分要有高有低，不要全是5分。`;

                const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${props.apiConfig.key}`
                    },
                    body: JSON.stringify({
                        model: props.apiConfig.model || 'gpt-3.5-turbo',
                        messages: [
                            { role: "system", content: "你是一个淘宝商品数据生成器。请只返回 JSON 数组，不要返回任何其他文本。" },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.7
                    })
                });

                if (!response.ok) throw new Error('API 请求失败');

                const data = await response.json();
                const content = data.choices[0].message.content;
                
                // 尝试解析 JSON
                let parsedProducts = [];
                try {
                    // 清理可能存在的 markdown 标记
                    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
                    parsedProducts = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("JSON 解析失败", e);
                    alert("生成数据格式有误，请重试");
                    return;
                }

                if (Array.isArray(parsedProducts)) {
                    products.value = parsedProducts;
                }

            } catch (e) {
                console.error(e);
                alert("搜索失败: " + e.message);
            } finally {
                isSearching.value = false;
            }
        };

        return { 
            activeTab, 
            searchQuery, 
            products,
            selectedProduct,
            openProduct,
            closeProduct,
            cart,
            addToCart,
            isAllChecked,
            searchProducts,
            isSearching,
            balance,
            showRecharge,
            rechargeAmount,
            openRecharge,
            closeRecharge,
            confirmRecharge,
            orders,
            transactions,
            buyItems,
            profileTab,
            showPaymentChoice,
            closePaymentChoice,
            payBySelf,
            payByOther,
            buyNow
        };
    },
    template: `
    <div class="app-window" style="background: #f5f5f5; display: flex; flex-direction: column;" :class="{ open: isOpen }">
        <!-- 顶部 Header -->
        <div class="app-header" style="height: 60px; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-bottom: none; flex-shrink: 0; z-index: 10;">
            <div class="app-header-title" style="font-size: 19px; font-weight: bold; letter-spacing: 1px; color: #ff5000;">桃Bao</div>
            <div class="app-header-close" @click="$emit('close')">关闭</div>
        </div>
        
        <!-- 内容区域 -->
        <div class="app-content" style="flex: 1; overflow-y: auto; padding: 0;">
            <!-- 首页 -->
            <div v-if="activeTab === 'home'" style="padding-bottom: 20px;">
                <!-- 搜索栏 -->
                <div style="padding: 10px 15px; background: #fff; display: flex; align-items: center;">
                    <div style="flex: 1; background: #f0f0f0; border-radius: 20px; padding: 5px 15px; display: flex; align-items: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input v-model="searchQuery" @keyup.enter="searchProducts" placeholder="搜索宝贝" style="border: none; background: transparent; margin-left: 8px; outline: none; width: 100%; font-size: 14px;">
                    </div>
                    <button @click="searchProducts" :disabled="isSearching" style="margin-left: 10px; background: #ff5000; color: white; border: none; border-radius: 18px; padding: 6px 15px; font-size: 13px; font-weight: bold; opacity: isSearching ? 0.7 : 1;">
                        {{ isSearching ? '...' : '搜索' }}
                    </button>
                </div>

                <!-- 分割线 -->
                <div style="height: 10px; background: #f5f5f5;"></div>

                <!-- 商品列表 -->
                <div style="padding: 10px; display: flex; flex-wrap: wrap; justify-content: space-between;">
                    <div v-for="product in products" :key="product.id" @click="openProduct(product)"
                         style="width: 48%; background: #fff; border-radius: 8px; overflow: hidden; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer;">
                        <!-- 灰色占位图 -->
                        <div :style="{ background: product.color }" style="height: 150px; width: 100%;"></div>
                        <div style="padding: 10px;">
                            <div style="font-size: 14px; color: #333; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ product.title }}</div>
                            <div style="color: #ff5000; font-weight: bold; font-size: 16px;">¥{{ product.price }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="activeTab === 'cart'" style="height: 100%; display: flex; flex-direction: column; position: relative;">
                <!-- 购物车顶部全选 -->
                <div style="padding: 10px 15px; background: #fff; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center;">
                    <input type="checkbox" v-model="isAllChecked" style="margin-right: 8px; width: 18px; height: 18px;">
                    <span style="font-size: 14px; color: #333;">全选</span>
                </div>

                <!-- 购物车列表 -->
                <div style="flex: 1; overflow-y: auto; padding: 10px;">
                    <div v-if="cart.length === 0" style="text-align: center; color: #999; margin-top: 50px;">购物车空空如也</div>
                    <div v-for="(item, index) in cart" :key="index" style="background: #fff; border-radius: 8px; padding: 10px; margin-bottom: 10px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <!-- 勾选按钮 -->
                        <input type="checkbox" v-model="item.checked" style="margin-right: 10px; width: 18px; height: 18px; flex-shrink: 0;">
                        
                        <!-- 商品图片 -->
                        <div :style="{ background: item.color }" style="width: 80px; height: 80px; border-radius: 4px; margin-right: 10px; flex-shrink: 0;"></div>
                        
                        <!-- 商品信息 -->
                        <div style="flex: 1;">
                            <div style="font-size: 14px; color: #333; margin-bottom: 5px;">{{ item.title }}</div>
                            <div style="color: #ff5000; font-weight: bold;">¥{{ item.price }}</div>
                        </div>
                    </div>
                </div>

                <!-- 底部结算栏 -->
                <div style="background: #fff; border-top: 1px solid #eee; padding: 10px 15px; display: flex; justify-content: flex-end; align-items: center;">
                    <button @click="buyItems" style="background: #ff5000; color: white; border: none; border-radius: 20px; padding: 8px 20px; font-size: 14px; font-weight: bold;">购买</button>
                </div>
            </div>
            <div v-if="activeTab === 'profile'" style="padding: 15px; height: 100%; display: flex; flex-direction: column;">
                <div @click="openRecharge" style="background: linear-gradient(135deg, #ff9000 0%, #ff5000 100%); border-radius: 12px; padding: 20px; color: white; box-shadow: 0 4px 12px rgba(255, 80, 0, 0.3); margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; flex-shrink: 0;">
                    <div>
                        <div style="font-size: 22px; font-weight: bold; margin-bottom: 8px;">我的钱包余额</div>
                        <div style="font-size: 28px; font-weight: bold;">¥{{ balance.toFixed(2) }}</div>
                    </div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;">
                        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                        <path d="M4 6v12c0 1.1.9 2 2-2h14v-4"></path>
                        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
                    </svg>
                </div>

                <!-- 分割线 -->
                <div style="height: 1px; background: #e0e0e0; margin-bottom: 15px; flex-shrink: 0;"></div>

                <!-- 切换按钮 -->
                <div style="display: flex; margin-bottom: 15px; background: #f0f0f0; border-radius: 8px; padding: 4px; flex-shrink: 0;">
                    <button @click="profileTab = 'orders'" 
                            :style="{ 
                                flex: 1, 
                                padding: '8px', 
                                border: 'none', 
                                borderRadius: '6px',
                                background: profileTab === 'orders' ? '#fff' : 'transparent', 
                                color: profileTab === 'orders' ? '#ff5000' : '#666',
                                fontWeight: profileTab === 'orders' ? 'bold' : 'normal',
                                boxShadow: profileTab === 'orders' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }">
                        已购商品
                    </button>
                    <button @click="profileTab = 'transactions'"
                            :style="{ 
                                flex: 1, 
                                padding: '8px', 
                                border: 'none', 
                                borderRadius: '6px',
                                background: profileTab === 'transactions' ? '#fff' : 'transparent', 
                                color: profileTab === 'transactions' ? '#ff5000' : '#666',
                                fontWeight: profileTab === 'transactions' ? 'bold' : 'normal',
                                boxShadow: profileTab === 'transactions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }">
                        收支记录
                    </button>
                </div>

                <!-- 内容区域 -->
                <div style="flex: 1; overflow-y: auto; background: #fff; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <!-- 已购买的商品 -->
                    <div v-if="profileTab === 'orders'">
                        <div v-if="orders.length === 0" style="text-align: center; color: #999; padding-top: 40px; font-size: 13px;">暂无购买记录</div>
                        <div v-for="order in orders" :key="order.id" style="display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px;">
                            <div :style="{ background: order.color }" style="width: 50px; height: 50px; border-radius: 4px; margin-right: 10px; flex-shrink: 0;"></div>
                            <div style="flex: 1; overflow: hidden;">
                                <div style="font-size: 13px; color: #333; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">{{ order.title }}</div>
                                <div style="font-size: 12px; color: #888; margin-top: 4px;">{{ order.purchaseDate }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 支出收入记录 -->
                    <div v-if="profileTab === 'transactions'">
                        <div v-if="transactions.length === 0" style="text-align: center; color: #999; padding-top: 40px; font-size: 13px;">暂无收支记录</div>
                        <div v-for="tx in transactions" :key="tx.id" style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #f5f5f5;">
                            <span>{{ tx.description }}</span>
                            <span :style="{ color: tx.type === 'income' ? '#28a745' : '#dc3545', fontWeight: 'bold' }">{{ tx.amount }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 商品详情弹窗 -->
        <div v-if="selectedProduct" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center;">
            <div style="width: 85%; height: 70%; background: #fff; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <!-- 弹窗关闭按钮 -->
                <div @click="closeProduct" style="position: absolute; top: 10px; right: 10px; z-index: 10; background: rgba(0,0,0,0.3); color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; cursor: pointer; font-size: 14px;">✕</div>
                
                <!-- 弹窗内容 -->
                <div style="flex: 1; overflow-y: auto;">
                    <!-- 商品大图 -->
                    <div :style="{ background: selectedProduct.color }" style="height: 250px; width: 100%;"></div>
                    
                    <div style="padding: 15px;">
                        <div style="color: #ff5000; font-size: 24px; font-weight: bold;">¥{{ selectedProduct.price }}</div>
                        <div style="font-size: 18px; font-weight: bold; color: #333; margin-top: 8px;">{{ selectedProduct.title }}</div>
                        
                        <div style="height: 1px; background: #eee; margin: 15px 0;"></div>
                        
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">宝贝评价 ({{ selectedProduct.comments.length }})</div>
                        
                        <div v-for="comment in selectedProduct.comments" :key="comment.id" style="margin-bottom: 15px; border-bottom: 1px solid #f9f9f9; padding-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #666; font-size: 12px;">{{ comment.user }}</span>
                                <span style="color: #ffb400; font-size: 12px;">{{ '★'.repeat(comment.rating) }}</span>
                            </div>
                            <div style="font-size: 13px; color: #333;">{{ comment.content }}</div>
                        </div>
                    </div>
                </div>
                
                <!-- 底部购买按钮 -->
                <div style="height: 50px; border-top: 1px solid #eee; display: flex;">
                    <div @click="addToCart" style="flex: 1; display: flex; align-items: center; justify-content: center; color: #333; font-size: 14px; cursor: pointer;">加入购物车</div>
                    <div @click="buyNow(selectedProduct)" style="flex: 1; background: #ff5000; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; cursor: pointer;">立即购买</div>
                </div>
            </div>
        </div>

        <!-- 充值弹窗 -->
        <div v-if="showRecharge" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center;">
            <div style="width: 80%; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center;">充值余额</div>
                <input v-model="rechargeAmount" type="number" placeholder="请输入充值金额" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; font-size: 16px; box-sizing: border-box;">
                <div style="display: flex; gap: 10px;">
                    <button @click="closeRecharge" style="flex: 1; padding: 10px; border: 1px solid #ddd; background: #fff; border-radius: 20px; color: #666;">取消</button>
                    <button @click="confirmRecharge" style="flex: 1; padding: 10px; border: none; background: #ff5000; border-radius: 20px; color: white; font-weight: bold;">确认充值</button>
                </div>
            </div>
        </div>

        <!-- 支付选择弹窗 -->
        <div v-if="showPaymentChoice" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center;">
            <div style="width: 80%; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 20px; text-align: center;">选择付款方式</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button @click="payBySelf" style="padding: 12px; border: none; background: #ff5000; border-radius: 20px; color: white; font-weight: bold; font-size: 16px;">自己付钱</button>
                    <button @click="payByOther" style="padding: 12px; border: 1px solid #ddd; background: #fff; border-radius: 20px; color: #666; font-size: 16px;">让TA付钱</button>
                    <button @click="closePaymentChoice" style="margin-top: 10px; padding: 10px; border: none; background: transparent; color: #999;">取消</button>
                </div>
            </div>
        </div>

        <!-- 底部导航栏 -->
        <div style="height: calc(55px + env(safe-area-inset-bottom)); border-top: 1px solid #eee; display: flex; background: #fff; flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom);">
            <div @click="activeTab = 'home'" 
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
                 :style="{ color: activeTab === 'home' ? '#ff5000' : '#999' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span style="font-size: 10px; margin-top: 4px;">首页</span>
            </div>
            <div @click="activeTab = 'cart'" 
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
                 :style="{ color: activeTab === 'cart' ? '#ff5000' : '#999' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span style="font-size: 10px; margin-top: 4px;">购物车</span>
            </div>
            <div @click="activeTab = 'profile'" 
                 style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
                 :style="{ color: activeTab === 'profile' ? '#ff5000' : '#999' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span style="font-size: 10px; margin-top: 4px;">我的</span>
            </div>
        </div>
    </div>
    `
};
