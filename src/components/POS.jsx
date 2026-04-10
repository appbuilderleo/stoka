import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, X, CreditCard, Banknote, Box, Package, Coffee, Droplet, ShoppingBag, Wine, Milk } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Helper for dynamic icons
const getIcon = (name) => {
  const iconMap = { Box, Package, Coffee, Droplet, ShoppingBag, Wine, Milk };
  const Icon = iconMap[name] || Box;
  return <Icon size={32} />;
};

export default function POS() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  // Supabase Data States
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeId, setStoreId] = useState(null);

  // Selection Modal State
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Fetch Data from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Obter o store_id do utilizador autenticado
        const { data: { user } } = await supabase.auth.getUser();
        let currentStoreId = null;
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
          if (profile?.store_id) {
            currentStoreId = profile.store_id;
            setStoreId(currentStoreId);
          }
        }

        const [productsRes, brandsRes] = await Promise.all([
          currentStoreId ? supabase.from('products').select('*').eq('store_id', currentStoreId) : supabase.from('products').select('*').is('store_id', null),
          currentStoreId ? supabase.from('brands').select('*').eq('store_id', currentStoreId) : supabase.from('brands').select('*').is('store_id', null)
        ]);
        
        if (productsRes.data) setProducts(productsRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Computed
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  
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
      // 1. Insert into Sales
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ total: Number(total), payment_method: paymentMethod, store_id: storeId }])
        .select()
        .single();
        
      if (saleError) throw saleError;

      // 2. Insert into Sale items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        brand_id: item.brandId,
        quantity: item.quantity,
        price_at_time: item.price,
        subtotal: item.quantity * item.price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Reset cart on success
      setCart([]);
      alert(`Venda finalizada via ${paymentMethod}! (ID: ${saleData.id})`);
    } catch (error) {
      console.error("Error saving sale:", error);
      alert("Houve um erro ao processar a venda.");
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
        <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-1px' }}>
          KaziHub
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
                <div className="product-icon" style={{ color: 'var(--primary)' }}>
                  {getIcon(product.icon)}
                </div>
                <span style={{ fontSize: '18px' }}>{product.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Cart */}
        <div className="cart-section">
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

        {/* Payment */}
        <div className="payment-section">
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
            <CreditCard size={28} />
            <span>{isProcessing ? 'Processando...' : 'M-Pesa'}</span>
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
    </div>
  );
}
