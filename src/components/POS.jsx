import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Plus, Minus, X, CreditCard, Banknote, Box, Package, Coffee, Droplet, ShoppingBag, Wine, Milk, LayoutDashboard, CheckCircle, XCircle, Info, Beef, Drumstick, Fish, Bean, Wheat, CupSoda, GlassWater, Wallet, Sparkles, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

// Custom icon for Grains (pile of grains)
const GrainsIcon = ({ size, color, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="18" r="1.5" fill={fill} />
    <circle cx="9" cy="18.5" r="1.5" fill={fill} />
    <circle cx="15" cy="18.5" r="1.5" fill={fill} />
    <circle cx="10.5" cy="15.5" r="1.5" fill={fill} />
    <circle cx="13.5" cy="15.5" r="1.5" fill={fill} />
    <circle cx="12" cy="13" r="1.5" fill={fill} />
  </svg>
);

// Helper for dynamic icons
const getIconProps = (name) => {
  const map = {
    Box: { icon: Box, color: '#8b5cf6', fill: '#ede9fe', bg: '#f5f3ff' }, // Purple
    Package: { icon: Package, color: '#f59e0b', fill: '#fef3c7', bg: '#fffbeb' }, // Amber
    Coffee: { icon: Coffee, color: '#84cc16', fill: '#ecfccb', bg: '#f7fee7' }, // Lime (Cafe/Açúcar)
    Droplet: { icon: Droplet, color: '#0ea5e9', fill: '#e0f2fe', bg: '#f0f9ff' }, // Light Blue (Water/Oil)
    ShoppingBag: { icon: ShoppingBag, color: '#10b981', fill: '#d1fae5', bg: '#ecfdf5' }, // Green (Groceries)
    Wine: { icon: Wine, color: '#e11d48', fill: '#ffe4e6', bg: '#fff1f2' }, // Rose (Drinks/Wine)
    Milk: { icon: Milk, color: '#6366f1', fill: '#e0e7ff', bg: '#eef2ff' }, // Indigo (Dairy)
    Beef: { icon: Beef, color: '#b91c1c', fill: '#fef2f2', bg: '#fff1f1' }, // Red (Meat)
    Drumstick: { icon: Drumstick, color: '#d97706', fill: '#fffbeb', bg: '#fff8e1' }, // Orange (Chicken)
    Fish: { icon: Fish, color: '#0891b2', fill: '#ecfeff', bg: '#f0fdff' }, // Cyan (Fish)
    Bean: { icon: GrainsIcon, color: '#78350f', fill: '#fef3c7', bg: '#fffaf0' }, // Brown (Grains/Beans)
    Wheat: { icon: Wheat, color: '#ca8a04', fill: '#fefce8', bg: '#fffdf0' }, // Gold (Wheat/Flour)
    CupSoda: { icon: CupSoda, color: '#db2777', fill: '#fdf2f8', bg: '#fff0f6' }, // Pink (Soda)
    GlassWater: { icon: GlassWater, color: '#2563eb', fill: '#eff6ff', bg: '#f0f7ff' }, // Blue (Oil/Water)
    Pocket: { icon: Wallet, color: '#4b5563', fill: '#f3f4f6', bg: '#f9fafb' }, // Gray (Sachet)
    Sparkles: { icon: Sparkles, color: '#fbbf24', fill: '#fffbeb', bg: '#fffdf0' }, // Yellow (Powder)
  };
  return map[name] || { icon: Box, color: '#64748b', fill: '#f1f5f9', bg: '#f8fafc' };
};

const renderIcon = (name) => {
  const { icon: Icon, color, fill, bg } = getIconProps(name);
  return (
    <div style={{
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '8px',
      border: `2px solid ${fill}`
    }}>
      <Icon size={26} color={color} fill={fill} strokeWidth={2} />
    </div>
  );
};

export default function POS() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [cart, setCart] = useState([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Database States
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  // Selection Modal State
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Toast State
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success', title = '') => {
    setToast({ message, type, title: title || (type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Informação') });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Data from API
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setIsLoading(true);
      try {
        const profilesRes = await api.get('/profiles');
        const profile = profilesRes.data.find(p => p.id === user.id);
        const storeId = profile?.store_id;

        const [productsRes, brandsRes] = await Promise.all([
          api.get(storeId ? `/products?store_id=${storeId}` : '/products'),
          api.get(storeId ? `/brands?store_id=${storeId}` : '/brands')
        ]);
        
        if (productsRes.data) setProducts(productsRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
        
        // Also keep storeId in local state if needed for finalizing sales
        setCurrentStoreId(storeId);
      } catch (error) {
        console.error("POS: Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Computed
  const filteredProducts = products.filter(p => {
    const hasBrands = brands.some(b => String(b.product_id) === String(p.id));
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return hasBrands && matchesSearch;
  });
  
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const formattedTotal = Number(total).toFixed(2);

  // Handlers
  const openSelection = (product) => {
    setActiveProduct(product);
    setSelectedBrand(null);
    setQuantity(1);
  };

  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
  };

  const addToCart = () => {
    if (!activeProduct || !selectedBrand) return;

    const existingItemIndex = cart.findIndex(
      item => item.productId === activeProduct.id && item.brandId === selectedBrand.id
    );

    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += Number(quantity);
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: activeProduct.id,
        productName: activeProduct.name,
        brandId: selectedBrand.id,
        brandName: selectedBrand.name,
        price: selectedBrand.price,
        quantity: Number(quantity)
      }]);
    }

    setActiveProduct(null);
    setSelectedBrand(null);
    setQuantity(1);
  };

  const updateCartQuantity = (index, delta) => {
    const newCart = [...cart];
    const currentQty = Number(newCart[index].quantity) || 0;
    const newQty = currentQty + delta;
    if (newQty <= 0 && delta < 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].quantity = Math.max(0, newQty);
    }
    setCart(newCart);
  };

  const setExactCartQuantity = (index, value) => {
    const newCart = [...cart];
    newCart[index].quantity = value;
    setCart(newCart);
  };

  const removeCartItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleCheckout = async (paymentMethod) => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const payload = {
        total: Number(total),
        payment_method: paymentMethod,
        store_id: currentStoreId,
        items: cart.map(item => ({
          brand_id: item.brandId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price
        }))
      };

      const res = await api.post('/sales', payload);

      // Reset cart on success
      setCart([]);
      showToast(`Venda finalizada! ID: ${res.data.sale_id}`, 'success', 'Venda Concluída');
    } catch (error) {
      console.error("Error saving sale:", error);
      showToast("Erro ao processar a venda.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Get brands for current selected product
  const activeBrands = activeProduct 
    ? brands.filter(b => b.product_id === activeProduct.id) 
    : [];

  return (
    <div className="pos-container">
      {/* Header */}
      <header className="pos-header">
        <div className="pos-header-left">
          <button className="pos-dashboard-btn" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={20} />
          </button>
          <div className="pos-brand">
            <img src="/stokaw.png" alt="Stoka Logo" style={{ height: '24px', width: 'auto' }} />
          </div>
        </div>
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Pesquisar produto (ex: arroz)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="pos-main">
        {/* Products Grid */}
        <div className="products-section">
          {isLoading ? (
            <div style={{ color: 'var(--secondary)' }}>Carregando catálogo...</div>
          ) : (
            filteredProducts.map(product => (
              <button 
                key={product.id} 
                className="product-btn"
                onClick={() => openSelection(product)}
              >
                <div className="product-icon-container" style={{ display: 'flex', justifyContent: 'center' }}>
                  {renderIcon(product.icon)}
                </div>
                <span>{product.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Desktop Cart (visível apenas no desktop) */}
        <div className="cart-section cart-desktop">
          <div className="cart-header">
            <span>Carrinho</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontSize: '14px' }}>
              <ShoppingCart size={18} />
              {cart.length} itens
            </div>
          </div>
          
          <div className="cart-items">
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--secondary)', padding: '40px 20px' }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p>Nenhum produto selecionado</p>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map((item, idx) => (
                  <motion.div 
                    key={`${item.productId}-${item.brandId}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="cart-item"
                  >
                    <div className="cart-item-info">
                      <div className="cart-item-title">{item.productName}</div>
                      <div className="cart-item-brand">{item.brandName} - {item.price} MZN</div>
                    </div>
                    <div className="cart-item-controls">
                      <button className="qty-btn" onClick={() => updateCartQuantity(idx, -1)}>
                        <Minus size={16} />
                      </button>
                      <input 
                        type="number"
                        step="any"
                        min="0"
                        style={{ 
                          fontWeight: '600', 
                          width: '50px', 
                          textAlign: 'center',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          background: 'transparent',
                          outline: 'none',
                          MozAppearance: 'textfield'
                        }}
                        value={item.quantity}
                        onChange={(e) => setExactCartQuantity(idx, e.target.value)}
                        onBlur={() => {
                          if (Number(item.quantity) <= 0) removeCartItem(idx);
                        }}
                      />
                      <button className="qty-btn" onClick={() => updateCartQuantity(idx, 1)}>
                        <Plus size={16} />
                      </button>
                      <div className="item-price">
                        {Number(item.price * item.quantity).toFixed(2)} MZN
                      </div>
                      <button className="remove-btn" onClick={() => removeCartItem(idx)}>
                        <X size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formattedTotal} MZN</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{formattedTotal} MZN</span>
            </div>
          </div>
        </div>

        {/* Desktop Payment (visível apenas no desktop) */}
        <div className="payment-section payment-desktop">
          <button 
            className="pay-btn pay-cash" 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => handleCheckout('Dinheiro')}
          >
            <Banknote size={28} />
            <span>{isProcessing ? 'Processando...' : 'Dinheiro'}</span>
          </button>
          <button 
            className="pay-btn pay-mpesa" 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => handleCheckout('M-Pesa')}
          >
            <Smartphone size={28} />
            <span>{isProcessing ? 'Processando...' : 'M-Pesa'}</span>
          </button>
          
          <button 
            className="pay-btn pay-emola" 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => handleCheckout('E-Mola')}
          >
            <Smartphone size={28} />
            <span>{isProcessing ? 'Processando...' : 'E-Mola'}</span>
          </button>

          <button 
            className="pay-btn pay-mkesh" 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => handleCheckout('M-Kesh')}
          >
            <Smartphone size={28} />
            <span>{isProcessing ? 'Processando...' : 'M-Kesh'}</span>
          </button>
          
          <button 
            className="pay-btn pay-cancel" 
            onClick={() => setCart([])}
            disabled={cart.length === 0 || isProcessing}
          >
            <X size={24} />
            <span>Cancelar</span>
          </button>
        </div>
      </main>

      {/* Botão Flutuante do Carrinho (Mobile Only) */}
      <button 
        className="mobile-cart-fab"
        onClick={() => setIsMobileCartOpen(true)}
      >
        <ShoppingCart size={24} />
        {cart.length > 0 && (
          <span className="cart-badge">{cart.length}</span>
        )}
      </button>

      {/* Painel do Carrinho Mobile (Slide-Up) */}
      <AnimatePresence>
        {isMobileCartOpen && (
          <motion.div
            className="mobile-cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileCartOpen(false)}
          >
            <motion.div
              className="mobile-cart-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="mobile-cart-handle">
                <div className="handle-bar"></div>
              </div>
              <div className="cart-header">
                <span>Carrinho</span>
                <button onClick={() => setIsMobileCartOpen(false)} style={{ background: 'none', color: 'var(--secondary)', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="cart-items" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--secondary)', padding: '30px 20px' }}>
                    <ShoppingCart size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                    <p>Carrinho vazio</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={`m-${item.productId}-${item.brandId}`} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-title">{item.productName}</div>
                        <div className="cart-item-brand">{item.brandName} - {item.price} MZN</div>
                      </div>
                      <div className="cart-item-controls">
                        <button className="qty-btn" onClick={() => updateCartQuantity(idx, -1)}><Minus size={14} /></button>
                        <span style={{ fontWeight: '600', minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateCartQuantity(idx, 1)}><Plus size={14} /></button>
                        <div className="item-price">{Number(item.price * item.quantity).toFixed(2)}</div>
                        <button className="remove-btn" onClick={() => removeCartItem(idx)}><X size={16} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-summary">
                <div className="summary-total">
                  <span>Total</span>
                  <span>{formattedTotal} MZN</span>
                </div>
              </div>

              <div className="mobile-cart-actions">
                <button 
                  className="mobile-pay-btn pay-cash" 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => { handleCheckout('Dinheiro'); setIsMobileCartOpen(false); }}
                >
                  <Banknote size={16} />
                  Dinheiro
                </button>
                <button 
                  className="mobile-pay-btn pay-mpesa" 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => { handleCheckout('M-Pesa'); setIsMobileCartOpen(false); }}
                >
                  <Smartphone size={16} />
                  M-Pesa
                </button>
                <button 
                  className="mobile-pay-btn pay-emola" 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => { handleCheckout('E-Mola'); setIsMobileCartOpen(false); }}
                >
                  <Smartphone size={16} />
                  E-Mola
                </button>
                <button 
                  className="mobile-pay-btn pay-mkesh" 
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => { handleCheckout('M-Kesh'); setIsMobileCartOpen(false); }}
                >
                  <Smartphone size={16} />
                  M-Kesh
                </button>
                <button 
                  className="mobile-pay-btn pay-cancel" 
                  disabled={cart.length === 0}
                  onClick={() => { setCart([]); setIsMobileCartOpen(false); }}
                >
                  <X size={16} />
                  Limpar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Selection Modal */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div 
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveProduct(null)}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="modal-title" style={{ margin: 0 }}>
                  {activeProduct.name} {selectedBrand ? `> ${selectedBrand.name}` : ''}
                </div>
                <button onClick={() => setActiveProduct(null)} style={{ background: 'none', color: 'var(--secondary)' }}>
                  <X size={24} />
                </button>
              </div>

              {!selectedBrand ? (
                // Step 1: Select Brand
                activeBrands.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="brands-grid"
                  >
                    {activeBrands.map(brand => (
                      <button 
                        key={brand.id} 
                        className="brand-btn"
                        onClick={() => handleBrandSelect(brand)}
                      >
                        <span style={{ fontWeight: '600' }}>{brand.name}</span>
                        <span className="brand-price">{brand.price} MZN</span>
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <p style={{ color: 'var(--secondary)', textAlign: 'center' }}>Nenhuma marca disponível para este produto.</p>
                )
              ) : (
                // Step 2: Select Quantity
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="qty-selector"
                >
                  <p style={{ textAlign: 'center', color: 'var(--secondary)', marginBottom: '8px' }}>
                    Defina a quantidade de <strong>{selectedBrand.name}</strong>
                  </p>
                  
                  <div className="qty-controls">
                    <button onClick={() => setQuantity(Math.max(0, Number(quantity) - 1))}>
                      <Minus size={24} />
                    </button>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      className="qty-display"
                      style={{ 
                        width: '120px', 
                        textAlign: 'center', 
                        border: 'none', 
                        borderBottom: '2px solid var(--border)', 
                        background: 'transparent',
                        outline: 'none',
                        MozAppearance: 'textfield',
                        fontFamily: 'inherit',
                        color: 'var(--primary)'
                      }}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    <button onClick={() => setQuantity(Number(quantity) + 1)}>
                      <Plus size={24} />
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: '700', color: 'var(--primary)', margin: '16px 0' }}>
                    Subtotal: {Number(selectedBrand.price * Number(quantity)).toFixed(2)} MZN
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      style={{ flex: 1, padding: '16px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-dark)' }}
                      onClick={() => setSelectedBrand(null)}
                    >
                      Voltar
                    </button>
                    <button 
                      className="add-cart-btn" 
                      style={{ flex: 2, margin: 0 }}
                      onClick={addToCart}
                    >
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle size={24} />}
              {toast.type === 'error' && <XCircle size={24} />}
              {toast.type === 'info' && <Info size={24} />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => setToast(null)}>
              <X size={16} />
            </button>
            <div className="toast-progress">
              <div className="toast-progress-bar" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
