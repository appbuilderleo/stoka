import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Package, 
  CreditCard, 
  Settings, 
  BarChart3, 
  LogOut,
  Plus,
  MonitorPlay,
  Crown,
  Zap,
  Shield,
  Check,
  Calendar,
  ArrowUpCircle,
  RefreshCw,
  AlertTriangle,
  Download,
  Filter,
  FileText,
  FileSpreadsheet,
  Save,
  Store,
  Phone,
  Mail,
  MapPin,
  Hash,
  Menu,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import saveAs from 'file-saver';
import './Dashboard.css';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Data states
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscription states
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', icon: 'Box' });
  
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState({ product_id: '', name: '', price: '', stock: '' });

  const [showReinforceStockModal, setShowReinforceStockModal] = useState(false);
  const [reinforceStockData, setReinforceStockData] = useState({ brand_id: '', added_stock: '', new_price: '' });

  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [userProfile, setUserProfile] = useState(null);
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Loja Matola',
    nuit: '123456789',
    address: 'Av. das Indústrias, Matola',
    phone: '+258 84 123 4567',
    email: 'contacto@lojamatola.co.mz'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sessão inválida. Faça login novamente.");
        return;
      }

      let currentStoreId = userProfile?.store_id;

      if (!currentStoreId) {
        // Criar Loja Nova
        const { data: newStore, error: storeError } = await supabase.from('stores').insert({
          name: storeSettings.storeName,
          nuit: storeSettings.nuit,
          address: storeSettings.address,
          phone: storeSettings.phone,
          email: storeSettings.email
        }).select().single();
        
        if (storeError) throw storeError;
        
        // Vincular a Loja ao Perfil do dono
        const { error: profileError } = await supabase.from('profiles').update({ store_id: newStore.id }).eq('id', user.id);
        if (profileError) throw profileError;

        setUserProfile({ ...userProfile, store_id: newStore.id });
      } else {
        // Atualizar Loja Existente
        const { error: storeError } = await supabase.from('stores').update({
          name: storeSettings.storeName,
          nuit: storeSettings.nuit,
          address: storeSettings.address,
          phone: storeSettings.phone,
          email: storeSettings.email
        }).eq('id', currentStoreId);
        
        if (storeError) throw storeError;
      }
      
      alert('Configurações da loja salvas com sucesso no banco de dados!');
    } catch (err) {
      alert(`Erro ao guardar: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) return;
    setIsSaving(true);
    try {
      // Verifica se a Categoria já existe (ignorando maiúsculas e minúsculas)
      const { data: exist } = await supabase
        .from('products')
        .select('*')
        .ilike('name', newProduct.name);

      if (exist && exist.length > 0) {
        alert('Este Produto/Categoria já existe! Não é possível duplicar.');
        setIsSaving(false);
        return;
      }

      const { data, error } = await supabase.from('products').insert([{ ...newProduct, store_id: currentStoreId }]).select();
      if (error) throw error;
      setProducts([...products, data[0]]);
      setShowProductModal(false);
      setNewProduct({ name: '', icon: 'Box' });
      if (products.length === 0) setNewBrand({ ...newBrand, product_id: data[0].id });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand.product_id || !newBrand.name || !newBrand.price || !newBrand.stock) {
      alert("Preencha todos os campos!");
      return;
    }
    setIsSaving(true);
    try {
      // Procurar se esta Marca já existe dentro deste Produto
      const { data: existingItems, error: searchError } = await supabase
        .from('brands')
        .select('*')
        .eq('product_id', Number(newBrand.product_id))
        .ilike('name', newBrand.name);

      if (searchError) throw searchError;

      const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;

      if (existingItem) {
        // Já existe! Então apenas soma o stock e atualiza o preço
        const novoStock = Number(existingItem.stock) + Number(newBrand.stock);
        
        const { data, error } = await supabase
          .from('brands')
          .update({ 
            stock: novoStock, 
            price: Number(newBrand.price) 
          })
          .eq('id', existingItem.id)
          .select('*, products(name)');
          
        if (error) throw error;
        
        // Atualiza a tabela na UI
        setBrands(brands.map(b => b.id === existingItem.id ? data[0] : b));
        alert(`O item '${existingItem.name}' já existia! O seu stock foi atualizado para ${novoStock} unidades.`);

      } else {
        // Não existe, cria um registo totalmente novo
        const { data, error } = await supabase.from('brands').insert([{
          product_id: Number(newBrand.product_id),
          name: newBrand.name,
          price: Number(newBrand.price),
          stock: Number(newBrand.stock),
          store_id: currentStoreId
        }]).select('*, products(name)');
        
        if (error) throw error;
        setBrands([...brands, data[0]]);
        alert('Novo item de venda registado com sucesso!');
      }

      setShowBrandModal(false);
      setNewBrand({ product_id: products[0]?.id || '', name: '', price: '', stock: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar marca/variação');
    } finally {
      setIsSaving(false);
    }
  };
  
  const openBrandModal = () => {
    if (products.length === 0) {
      alert("Crie um Produto/Categoria Primeiro (Ex: Arroz) antes de registar o stock!");
      return;
    }
    setNewBrand({ ...newBrand, product_id: products[0].id });
    setShowBrandModal(true);
  };

  const openReinforceStockModal = () => {
    if (brands.length === 0) {
      alert("Ainda não tem marcas/itens registados. Registe primeiro!");
      return;
    }
    setReinforceStockData({ brand_id: brands[0].id, added_stock: '', new_price: brands[0].price });
    setShowReinforceStockModal(true);
  };

  const handleBrandSelectionForReinforce = (e) => {
    const selectedId = e.target.value;
    const selectedBrand = brands.find(b => b.id === Number(selectedId));
    setReinforceStockData({
      ...reinforceStockData,
      brand_id: selectedId,
      new_price: selectedBrand ? selectedBrand.price : ''
    });
  };

  const handleReinforceStock = async () => {
    if (!reinforceStockData.brand_id || !reinforceStockData.added_stock) {
      alert("Selecione a marca e informe a quantidade a adicionar!");
      return;
    }
    
    const brandToUpdate = brands.find(b => b.id === Number(reinforceStockData.brand_id));
    if (!brandToUpdate) return;

    setIsSaving(true);
    try {
      const novoStock = Number(brandToUpdate.stock) + Number(reinforceStockData.added_stock);
      const novoPreco = reinforceStockData.new_price ? Number(reinforceStockData.new_price) : Number(brandToUpdate.price);

      const { data, error } = await supabase
        .from('brands')
        .update({ 
          stock: novoStock, 
          price: novoPreco 
        })
        .eq('id', brandToUpdate.id)
        .select('*, products(name)');
        
      if (error) throw error;
      
      setBrands(brands.map(b => b.id === brandToUpdate.id ? data[0] : b));
      alert(`Stock de '${brandToUpdate.name}' reforçado com sucesso! Novo stock: ${novoStock}`);
      
      setShowReinforceStockModal(false);
      setReinforceStockData({ brand_id: '', added_stock: '', new_price: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao reforçar stock');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Subscription Handlers ---
  const handleRenewSubscription = async () => {
    if (!currentSubscription) return;
    setIsProcessingSubscription(true);
    try {
      const nextDate = new Date(currentSubscription.next_billing_date);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          last_payment_date: new Date().toISOString().split('T')[0],
          next_billing_date: nextDate.toISOString().split('T')[0],
          amount_paid: currentSubscription.amount_paid
        })
        .eq('id', currentSubscription.id)
        .select('*, subscription_plans(*)');
      
      if (error) throw error;
      setCurrentSubscription(data[0]);
      setShowRenewModal(false);
      alert('Assinatura renovada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao renovar assinatura.');
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!currentSubscription || !selectedUpgradePlan) return;
    setIsProcessingSubscription(true);
    try {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);

      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: selectedUpgradePlan.id,
          status: 'active',
          last_payment_date: new Date().toISOString().split('T')[0],
          next_billing_date: nextDate.toISOString().split('T')[0],
          amount_paid: Number(selectedUpgradePlan.price)
        })
        .eq('id', currentSubscription.id)
        .select('*, subscription_plans(*)');

      if (error) throw error;
      setCurrentSubscription(data[0]);
      setShowUpgradeModal(false);
      setSelectedUpgradePlan(null);
      alert(`Plano alterado para ${selectedUpgradePlan.name} com sucesso!`);
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar plano.');
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const openUpgradeModal = (plan) => {
    setSelectedUpgradePlan(plan);
    setShowUpgradeModal(true);
  };

  const getSubscriptionStatusInfo = () => {
    if (!currentSubscription) return { label: 'Sem assinatura', color: '#6c757d', bg: '#f1f5f9' };
    const now = new Date();
    const nextBilling = new Date(currentSubscription.next_billing_date);
    const daysLeft = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
    
    if (currentSubscription.status === 'cancelled') return { label: 'Cancelada', color: '#ef4444', bg: '#fef2f2', daysLeft: 0 };
    if (daysLeft < 0) return { label: 'Expirada', color: '#ef4444', bg: '#fef2f2', daysLeft };
    if (daysLeft <= 5) return { label: `Expira em ${daysLeft} dia(s)`, color: '#f59e0b', bg: '#fffbeb', daysLeft };
    return { label: 'Activa', color: '#178236', bg: '#eefdf4', daysLeft };
  };

  const getPlanIcon = (planName) => {
    switch (planName) {
      case 'Básico': return <Zap size={28} />;
      case 'Profissional': return <Crown size={28} />;
      case 'Empresarial': return <Shield size={28} />;
      default: return <CreditCard size={28} />;
    }
  };

  const getPlanColor = (planName) => {
    switch (planName) {
      case 'Básico': return { main: '#6c757d', bg: '#f8f9fa', gradient: 'linear-gradient(135deg, #6c757d, #495057)' };
      case 'Profissional': return { main: '#178236', bg: '#eefdf4', gradient: 'linear-gradient(135deg, #178236, #136a2c)' };
      case 'Empresarial': return { main: '#1A1A2E', bg: '#f4f6f9', gradient: 'linear-gradient(135deg, #2a2a4a, #1A1A2E)' };
      default: return { main: '#6c757d', bg: '#f1f5f9', gradient: 'linear-gradient(135deg, #6c757d, #4b5563)' };
    }
  };

  const handleExportExcel = () => {
    if (sales.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const exportData = sales.map(sale => ({
      'ID Venda': `#${String(sale.id).padStart(5, '0')}`,
      'Data e Hora': new Date(sale.created_at).toLocaleString('pt-MZ'),
      'Método de Pagamento': sale.payment_method === 'mpesa' ? 'M-Pesa' : 'Dinheiro',
      'Valor Total (MZN)': Number(sale.total)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório de Vendas");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, "Relatorio_de_Vendas_KaziHub.xlsx");
  };

  const handleExportPDF = () => {
    if (sales.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    
    doc.setFontSize(22);
    doc.setTextColor(26, 26, 46); // var(--primary)
    doc.text("Relatório de Vendas KaziHub", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data de Geração: ${new Date().toLocaleString('pt-MZ')}`, 14, 30);

    const tableColumn = ["ID da Venda", "Data e Hora", "Método de Pag.", "Valor Total (MZN)"];
    const tableRows = [];

    let totalRevenue = 0;

    sales.forEach(sale => {
      const saleData = [
        `#${String(sale.id).padStart(5, '0')}`,
        new Date(sale.created_at).toLocaleString('pt-MZ'),
        sale.payment_method === 'mpesa' ? 'M-Pesa' : 'Dinheiro',
        Number(sale.total).toFixed(2)
      ];
      tableRows.push(saleData);
      totalRevenue += Number(sale.total);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 46], textColor: [255, 255, 255] },
      margin: { top: 40 }
    });

    const finalY = doc.lastAutoTable?.finalY || 40;
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 46);
    doc.text(`Total Faturado: ${totalRevenue.toFixed(2)} MZN`, 14, finalY + 15);

    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, "Relatorio_de_Vendas_KaziHub.pdf");
  };


  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          setUserProfile(profile);
          setCurrentStoreId(profile.store_id);
          if (profile.store_id) {
             const { data: store } = await supabase.from('stores').select('*').eq('id', profile.store_id).single();
             if (store) {
               setStoreSettings({
                  storeName: store.name || '',
                  nuit: store.nuit || '',
                  address: store.address || '',
                  phone: store.phone || '',
                  email: store.email || ''
               });
             }
          }
        }

        const storeId = profile?.store_id;

        const [productsRes, brandsRes, salesRes, plansRes, subsRes] = await Promise.all([
          storeId ? supabase.from('products').select('*').eq('store_id', storeId) : supabase.from('products').select('*').is('store_id', null),
          storeId ? supabase.from('brands').select('*, products(name)').eq('store_id', storeId) : supabase.from('brands').select('*, products(name)').is('store_id', null),
          storeId ? supabase.from('sales').select('*').eq('store_id', storeId).order('created_at', { ascending: false }) : supabase.from('sales').select('*').is('store_id', null).order('created_at', { ascending: false }),
          supabase.from('subscription_plans').select('*').order('price', { ascending: true }),
          storeId ? supabase.from('subscriptions').select('*, subscription_plans(*)').eq('store_id', storeId).limit(1) : supabase.from('subscriptions').select('*, subscription_plans(*)').is('store_id', null).limit(1)
        ]);
        
        if (productsRes.data) setProducts(productsRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
        if (salesRes.data) setSales(salesRes.data);
        if (plansRes.data) setSubscriptionPlans(plansRes.data);
        if (subsRes.data && subsRes.data.length > 0) setCurrentSubscription(subsRes.data[0]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'produtos', label: 'Produtos', icon: <Package size={20} /> },
    { id: 'assinaturas', label: 'Assinaturas', icon: <CreditCard size={20} /> },
    { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={20} /> },
    { id: 'configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
  ];

  // Computed Stats
  const totalSalesValue = sales.reduce((acc, sale) => acc + Number(sale.total), 0);
  const todaysSalesValue = sales
    .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((acc, sale) => acc + Number(sale.total), 0);

  return (
    <div className="dashboard-container">
      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">KaziHub Admin</div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
              <button 
               key={item.id}
               className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
               onClick={() => {
                 setActiveTab(item.id);
                 setIsMobileMenuOpen(false);
               }}
             >
               {item.icon}
               {item.label}
             </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-primary" style={{ width: '100%', marginBottom: '16px', justifyContent: 'center' }} onClick={() => navigate('/pos')}>
            <MonitorPlay size={18} />
            Abrir POS
          </button>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)', padding: '12px 0' }}>
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-greeting">Bem-vindo(a), {storeSettings.storeName}</div>
          </div>
          <div className="header-right">
             <div className="user-avatar">
               {storeSettings.storeName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="dashboard-content">
          <h1 className="page-title">
            {NAV_ITEMS.find(i => i.id === activeTab)?.label}
          </h1>

          {isLoading ? (
            <p style={{ color: 'var(--secondary)' }}>Sincronizando dados...</p>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Vendas de Hoje</span>
                        <span className="stat-value">{todaysSalesValue.toFixed(2)} MZN</span>
                      </div>
                      <div className="stat-icon"><BarChart3 size={24} /></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Total de Marcas Analisadas</span>
                        <span className="stat-value">{brands.length}</span>
                      </div>
                      <div className="stat-icon" style={{ backgroundColor: '#e2e8f0', color: 'var(--primary)' }}><Package size={24} /></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Faturado Histórico</span>
                        <span className="stat-value">{totalSalesValue.toFixed(2)} MZN</span>
                      </div>
                      <div className="stat-icon" style={{ backgroundColor: '#eefdf4', color: 'var(--success)' }}><CreditCard size={24} /></div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'produtos' && (
                <div className="content-card">
                  <div className="card-header">
                     <h3>Gestão de Marcas e Produtos</h3>
                     <div className="action-buttons-group">
                       <button className="btn-primary" style={{ backgroundColor: '#f97316' }} onClick={openReinforceStockModal}>
                          <Plus size={18} />
                          Reforçar Stock
                       </button>
                       <button className="btn-primary" style={{ backgroundColor: 'var(--primary)' }} onClick={() => setShowProductModal(true)}>
                          <Plus size={18} />
                          Novo Produto
                       </button>
                       <button className="btn-primary" onClick={openBrandModal}>
                          <Plus size={18} />
                          Nova Marca / Item
                       </button>
                     </div>
                  </div>
                  {brands.length === 0 ? (
                    <p style={{ color: 'var(--secondary)' }}>Nenhuma marca encontrada no sistema...</p>
                  ) : (
                    <table className="products-table">
                       <thead>
                         <tr>
                           <th>MARCA</th>
                           <th>PRODUTO (CATEGORIA)</th>
                           <th>PREÇO DE VENDA</th>
                           <th>STOCK</th>
                           <th>STATUS</th>
                         </tr>
                       </thead>
                       <tbody>
                         {brands.map(brand => (
                           <tr key={brand.id}>
                             <td><strong>{brand.name}</strong></td>
                             <td>{brand.products?.name || 'Desconhecido'}</td>
                             <td>{Number(brand.price).toFixed(2)} MZN</td>
                             <td>{brand.stock} un</td>
                             <td>
                               <span style={{ color: brand.stock > 50 ? 'var(--success)' : '#eab308' }}>
                                 {brand.stock > 50 ? 'Estável' : 'Abaixo do ideal'}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'assinaturas' && (
                <>
                  {/* Current Plan Status Banner */}
                  {currentSubscription && (() => {
                    const statusInfo = getSubscriptionStatusInfo();
                    const plan = currentSubscription.subscription_plans;
                    const planColor = plan ? getPlanColor(plan.name) : getPlanColor('');
                    return (
                      <div className="subscription-current-plan">
                        <div className="subscription-plan-info">
                          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {plan ? getPlanIcon(plan.name) : <CreditCard size={28} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', opacity: 0.85, marginBottom: '4px' }}>Plano Atual</div>
                            <div style={{ fontSize: '28px', fontWeight: '800' }}>{plan?.name || 'Sem Plano'}</div>
                            <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>{plan?.description || ''}</div>
                          </div>
                        </div>
                        <div className="subscription-plan-price">
                          <div className="subscription-status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                            {statusInfo.label}
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: '800' }}>{Number(currentSubscription.amount_paid).toFixed(2)} MZN</div>
                          <div style={{ fontSize: '13px', opacity: 0.8 }}>/ mês</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Info Cards Row */}
                  <div className="subscription-cards-grid">
                    <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--secondary)' }}>Próximo Pagamento</div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>
                          {currentSubscription ? new Date(currentSubscription.next_billing_date).toLocaleDateString('pt-MZ') : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eefdf4', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--secondary)' }}>Método de Pagamento</div>
                        <div style={{ fontWeight: '700', fontSize: '16px', textTransform: 'capitalize' }}>
                          {currentSubscription?.payment_method === 'mpesa' ? '📲 M-Pesa' : '💵 ' + (currentSubscription?.payment_method || '—')}
                        </div>
                      </div>
                    </div>
                    <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--secondary)' }}>Último Pagamento</div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>
                          {currentSubscription?.last_payment_date ? new Date(currentSubscription.last_payment_date).toLocaleDateString('pt-MZ') : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Renew Button */}
                  {currentSubscription && (() => {
                    const statusInfo = getSubscriptionStatusInfo();
                    if (statusInfo.daysLeft !== undefined && statusInfo.daysLeft <= 5) {
                      return (
                        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                            <span style={{ fontWeight: '600', color: '#92400e' }}>
                              {statusInfo.daysLeft < 0 ? 'A sua assinatura expirou!' : `A sua assinatura expira em ${statusInfo.daysLeft} dia(s).`}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowRenewModal(true)}
                            style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <RefreshCw size={16} />
                            Renovar Agora
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Plan Comparison Grid */}
                  <div className="content-card">
                    <div className="card-header">
                      <h3>Planos Disponíveis</h3>
                      {currentSubscription && (
                        <button
                          onClick={() => setShowRenewModal(true)}
                          style={{ backgroundColor: 'var(--success)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <RefreshCw size={16} />
                          Renovar Plano Atual
                        </button>
                      )}
                    </div>

                    <div className="subscription-comparison-grid">
                      {subscriptionPlans.map(plan => {
                        const isCurrentPlan = currentSubscription?.subscription_plans?.id === plan.id;
                        const planColor = getPlanColor(plan.name);
                        return (
                          <div key={plan.id} style={{
                            border: isCurrentPlan ? `2px solid ${planColor.main}` : '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '28px 24px',
                            position: 'relative',
                            backgroundColor: isCurrentPlan ? planColor.bg : 'var(--bg-surface)',
                            transition: 'all 0.3s',
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            {isCurrentPlan && (
                              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: planColor.main, color: 'white', padding: '4px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                                PLANO ATUAL
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                              <div style={{ color: planColor.main }}>{getPlanIcon(plan.name)}</div>
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '20px' }}>{plan.name}</div>
                              </div>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                              <span style={{ fontSize: '36px', fontWeight: '800', color: planColor.main }}>{Number(plan.price).toFixed(0)}</span>
                              <span style={{ fontSize: '16px', color: 'var(--secondary)' }}> MZN/mês</span>
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                              {plan.description}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <Check size={16} style={{ color: planColor.main }} />
                                <span>{plan.max_products === -1 ? 'Produtos ilimitados' : `Até ${plan.max_products} produtos`}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <Check size={16} style={{ color: planColor.main }} />
                                <span>{plan.max_brands === -1 ? 'Marcas ilimitadas' : `Até ${plan.max_brands} marcas`}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <Check size={16} style={{ color: planColor.main }} />
                                <span>{plan.max_users === 1 ? '1 utilizador' : `Até ${plan.max_users} utilizadores`}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                {plan.has_pos ? <Check size={16} style={{ color: planColor.main }} /> : <span style={{ width: '16px', height: '16px', display: 'inline-block', borderRadius: '50%', border: '2px solid #cbd5e1' }} />}
                                <span>POS (Vendas)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                {plan.has_reports ? <Check size={16} style={{ color: planColor.main }} /> : <span style={{ width: '16px', height: '16px', display: 'inline-block', borderRadius: '50%', border: '2px solid #cbd5e1' }} />}
                                <span>Relatórios avançados</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                {plan.has_priority_support ? <Check size={16} style={{ color: planColor.main }} /> : <span style={{ width: '16px', height: '16px', display: 'inline-block', borderRadius: '50%', border: '2px solid #cbd5e1' }} />}
                                <span>Suporte prioritário</span>
                              </div>
                            </div>
                            {!isCurrentPlan ? (
                              <button
                                onClick={() => openUpgradeModal(plan)}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  borderRadius: 'var(--radius)',
                                  fontWeight: '700',
                                  fontSize: '15px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  backgroundColor: planColor.main,
                                  color: 'white',
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <ArrowUpCircle size={18} />
                                {Number(plan.price) > Number(currentSubscription?.subscription_plans?.price || 0) ? 'Fazer Upgrade' : 'Mudar para este plano'}
                              </button>
                            ) : (
                              <button
                                disabled
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  borderRadius: 'var(--radius)',
                                  fontWeight: '700',
                                  fontSize: '15px',
                                  backgroundColor: '#e2e8f0',
                                  color: '#94a3b8',
                                  cursor: 'default'
                                }}
                              >
                                Plano Atual
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'relatorios' && (
                <div className="reports-container">
                  <div className="card-header" style={{ marginBottom: '20px' }}>
                    <h3>Relatório de Vendas</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: 'var(--text-dark)' }}>
                        <Filter size={16} />
                        Todos os Tempos
                      </button>
                      <button onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--success)', backgroundColor: '#eefdf4', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                        <FileSpreadsheet size={16} />
                        Exportar Excel
                      </button>
                      <button onClick={handleExportPDF} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--primary)', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                        <FileText size={16} />
                        Exportar PDF
                      </button>
                    </div>
                  </div>

                  <div className="stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Receita Acumulada</span>
                        <span className="stat-value">
                          {sales.reduce((acc, sale) => acc + Number(sale.total), 0).toFixed(2)} MZN
                        </span>
                      </div>
                      <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}><BarChart3 size={24} /></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Total de Vendas Registradas</span>
                        <span className="stat-value">{sales.length}</span>
                      </div>
                      <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#6c757d' }}><Package size={24} /></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Ticket Médio (Valor/Venda)</span>
                        <span className="stat-value">
                          {sales.length > 0 ? (sales.reduce((acc, sale) => acc + Number(sale.total), 0) / sales.length).toFixed(2) : '0.00'} MZN
                        </span>
                      </div>
                      <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}><CreditCard size={24} /></div>
                    </div>
                  </div>

                  <div className="content-card">
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-dark)' }}>Histórico Detalhado em Tempo Real</h3>
                    {sales.length === 0 ? (
                      <p style={{ color: 'var(--secondary)' }}>Nenhuma venda registrada até ao momento no sistema.</p>
                    ) : (
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th>Nº RECIBO (ID)</th>
                            <th>DATA E HORA</th>
                            <th>MÉTODO DE PAGAMENTO</th>
                            <th>VALOR FATURADO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map(sale => (
                            <tr key={sale.id}>
                              <td style={{ color: 'var(--secondary)' }}>#{String(sale.id).padStart(5, '0')}</td>
                              <td>{new Date(sale.created_at).toLocaleString('pt-MZ')}</td>
                              <td style={{ textTransform: 'capitalize' }}>
                                {sale.payment_method === 'mpesa' ? <span style={{ color: '#ef4444', fontWeight: 'bold' }}>M-Pesa</span> : <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Dinheiro</span>}
                              </td>
                              <td style={{ fontWeight: '700' }}>{Number(sale.total).toFixed(2)} MZN</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'configuracoes' && (
                <div className="settings-container">
                  <div className="card-header" style={{ marginBottom: '24px' }}>
                    <h3>Configurações da Loja</h3>
                    <p style={{ color: 'var(--secondary)', fontSize: '14px', marginTop: '4px' }}>
                      Atualize os dados e informações de contacto do seu negócio.
                    </p>
                  </div>

                  <form onSubmit={handleSaveSettings} style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
                    
                    <div className="content-card" style={{ padding: '24px' }}>
                      <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                        <Store size={18} />
                        Dados Principais
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>Nome da Loja</label>
                          <input 
                            type="text" 
                            required
                            value={storeSettings.storeName}
                            onChange={(e) => setStoreSettings({...storeSettings, storeName: e.target.value})}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Hash size={14} /> NUIT / NIF</span>
                          </label>
                          <input 
                            type="text" 
                            value={storeSettings.nuit}
                            onChange={(e) => setStoreSettings({...storeSettings, nuit: e.target.value})}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Endereço Completo</span>
                          </label>
                          <input 
                            type="text" 
                            value={storeSettings.address}
                            onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="content-card" style={{ padding: '24px' }}>
                      <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                        <Phone size={18} />
                        Contacto e Comunicação
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Telefone / WhatsApp</span>
                          </label>
                          <input 
                            type="text" 
                            value={storeSettings.phone}
                            onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> Email da Loja</span>
                          </label>
                          <input 
                            type="email" 
                            value={storeSettings.email}
                            onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button 
                        type="submit" 
                        disabled={isSavingSettings}
                        style={{ 
                          padding: '12px 24px', 
                          borderRadius: '8px', 
                          backgroundColor: 'var(--success)', 
                          color: 'white', 
                          fontWeight: '700', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          border: 'none',
                          cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                          opacity: isSavingSettings ? 0.8 : 1
                        }}
                      >
                        {isSavingSettings ? (
                          <>Salvando...</>
                        ) : (
                          <>
                            <Save size={18} />
                            Salvar Configurações
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Nova Marca / Item de Venda */}
        {showBrandModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', width: '450px', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--success)' }}>Registar Marca / Item de Venda</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Categoria (Onde aparece no ecrã de Vendas)</label>
                  <select 
                    value={newBrand.product_id}
                    onChange={(e) => setNewBrand({ ...newBrand, product_id: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Produto Específico (Nome Exato)</label>
                  <input 
                    type="text" 
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                    placeholder="Ex: Arroz Tio João 25kg"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Preço de Venda (MZN)</label>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      value={newBrand.price}
                      onChange={(e) => setNewBrand({ ...newBrand, price: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                      placeholder="0.00"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Stock Inicial</label>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      value={newBrand.stock}
                      onChange={(e) => setNewBrand({ ...newBrand, stock: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowBrandModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)' }}>Cancelar</button>
                <button 
                  onClick={handleAddBrand} 
                  disabled={isSaving}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--success)', color: 'white', fontWeight: 'bold' }}>
                  {isSaving ? 'Salvando...' : 'Registar no Sistema'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Reforçar Stock */}
        {showReinforceStockModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', width: '450px', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginBottom: '16px', color: '#f97316' }}>Reforçar Stock</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Selecione a Marca / Item</label>
                  <select 
                    value={reinforceStockData.brand_id}
                    onChange={handleBrandSelectionForReinforce}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.products?.name || 'Desconhecido'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Quantidade a Adicionar</label>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      value={reinforceStockData.added_stock}
                      onChange={(e) => setReinforceStockData({ ...reinforceStockData, added_stock: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Atualizar Preço de Venda?</label>
                    <input 
                      type="number"
                      step="any"
                      min="0"
                      value={reinforceStockData.new_price}
                      onChange={(e) => setReinforceStockData({ ...reinforceStockData, new_price: e.target.value })}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowReinforceStockModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)' }}>Cancelar</button>
                <button 
                  onClick={handleReinforceStock} 
                  disabled={isSaving}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#f97316', color: 'white', fontWeight: 'bold' }}>
                  {isSaving ? 'Processando...' : 'Confirmar Reforço'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Novo Produto */}
        {showProductModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Adicionar Novo Produto</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Nome do Produto (Categoria. Ex: Arroz, Sumos)</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                    placeholder="Nome..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Ícone Representativo</label>
                  <select 
                    value={newProduct.icon}
                    onChange={(e) => setNewProduct({ ...newProduct, icon: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                  >
                    <option value="Box">Caixa (Box)</option>
                    <option value="Package">Pacote (Package)</option>
                    <option value="ShoppingBag">Saco (ShoppingBag)</option>
                    <option value="Wine">Garrafa de Vidro (Wine)</option>
                    <option value="Milk">Garrafa/Pacote Leite (Milk)</option>
                    <option value="Coffee">Copo/Chávena (Coffee)</option>
                    <option value="Droplet">Líquidos (Droplet)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowProductModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)' }}>Cancelar</button>
                <button 
                  onClick={handleAddProduct} 
                  disabled={isSaving}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--success)', color: 'white', fontWeight: 'bold' }}>
                  {isSaving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Renovar Assinatura */}
        {showRenewModal && currentSubscription && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '32px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#eefdf4', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <RefreshCw size={28} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>Renovar Assinatura</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                  A sua assinatura será renovada por mais 1 mês.
                </p>
              </div>

              <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--secondary)', fontSize: '14px' }}>Plano</span>
                  <span style={{ fontWeight: '700' }}>{currentSubscription.subscription_plans?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--secondary)', fontSize: '14px' }}>Valor</span>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>{Number(currentSubscription.amount_paid).toFixed(2)} MZN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--secondary)', fontSize: '14px' }}>Próxima cobrança</span>
                  <span style={{ fontWeight: '700' }}>
                    {(() => {
                      const d = new Date(currentSubscription.next_billing_date);
                      d.setMonth(d.getMonth() + 1);
                      return d.toLocaleDateString('pt-MZ');
                    })()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowRenewModal(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)', fontWeight: '600', fontSize: '15px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRenewSubscription}
                  disabled={isProcessingSubscription}
                  style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius)', backgroundColor: 'var(--success)', color: 'white', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isProcessingSubscription ? 'Processando...' : (
                    <>
                      <RefreshCw size={16} />
                      Confirmar Renovação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Upgrade / Mudança de Plano */}
        {showUpgradeModal && selectedUpgradePlan && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '32px', borderRadius: '16px', width: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              {(() => {
                const planColor = getPlanColor(selectedUpgradePlan.name);
                const currentPrice = Number(currentSubscription?.subscription_plans?.price || 0);
                const newPrice = Number(selectedUpgradePlan.price);
                const isUpgrade = newPrice > currentPrice;
                return (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: planColor.gradient, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <ArrowUpCircle size={28} />
                      </div>
                      <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>
                        {isUpgrade ? 'Upgrade de Plano' : 'Mudar de Plano'}
                      </h3>
                      <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                        {isUpgrade
                          ? 'Você terá acesso a mais funcionalidades imediatamente.'
                          : 'O seu plano será alterado a partir de agora.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'stretch' }}>
                      <div style={{ flex: 1, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Plano Atual</div>
                        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{currentSubscription?.subscription_plans?.name || '—'}</div>
                        <div style={{ fontWeight: '800', fontSize: '24px', color: 'var(--secondary)' }}>{currentPrice.toFixed(0)} <span style={{ fontSize: '14px' }}>MZN</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px', color: planColor.main }}>→</div>
                      <div style={{ flex: 1, backgroundColor: planColor.bg, borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center', border: `2px solid ${planColor.main}` }}>
                        <div style={{ fontSize: '12px', color: planColor.main, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Novo Plano</div>
                        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{selectedUpgradePlan.name}</div>
                        <div style={{ fontWeight: '800', fontSize: '24px', color: planColor.main }}>{newPrice.toFixed(0)} <span style={{ fontSize: '14px' }}>MZN</span></div>
                      </div>
                    </div>

                    {isUpgrade && (
                      <div style={{ backgroundColor: '#eefdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '24px', textAlign: 'center' }}>
                        <span style={{ color: '#166534', fontWeight: '600', fontSize: '14px' }}>
                          Diferença: +{(newPrice - currentPrice).toFixed(0)} MZN/mês
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => { setShowUpgradeModal(false); setSelectedUpgradePlan(null); }}
                        style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)', fontWeight: '600', fontSize: '15px' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleUpgradePlan}
                        disabled={isProcessingSubscription}
                        style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius)', backgroundColor: planColor.main, color: 'white', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {isProcessingSubscription ? 'Processando...' : (
                          <>
                            <ArrowUpCircle size={16} />
                            {isUpgrade ? 'Confirmar Upgrade' : 'Confirmar Mudança'}
                          </>
                        )}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
