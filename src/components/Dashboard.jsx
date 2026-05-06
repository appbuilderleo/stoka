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
  X,
  CheckCircle,
  XCircle,
  Info,
  Edit2,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import saveAs from 'file-saver';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
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
  const [billingCycle, setBillingCycle] = useState('mensal'); // 'mensal', 'trimestral', 'semestral', 'anual'

  // Advanced Reports State
  const [reportFilterDate, setReportFilterDate] = useState('30days'); // 'today', '7days', '30days', 'all'
  const [reportFilterPayment, setReportFilterPayment] = useState('all'); // 'all', 'mpesa', 'dinheiro'

  // Edit States
  const [editingBrand, setEditingBrand] = useState(null); // The brand object being edited
  const [editingProduct, setEditingProduct] = useState(null); // The product object being edited
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info', title }
  
  const showToast = (message, type = 'success', title = '') => {
    setToast({ message, type, title: title || (type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Informação') });
    setTimeout(() => setToast(null), 3000);
  };

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
    email: 'contacto@lojamatola.co.mz',
    stockLow: 20,
    stockIdeal: 50
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchBrands = async (storeId) => {
    const { data } = await supabase.from('brands').select('*, products(id, name, icon)').eq('store_id', storeId);
    if (data) setBrands(data);
  };

  const fetchProducts = async (storeId) => {
    const { data } = await supabase.from('products').select('*').eq('store_id', storeId);
    if (data) setProducts(data);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("Sessão inválida. Faça login novamente.", "error");
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
          email: storeSettings.email,
          stock_low_threshold: Number(storeSettings.stockLow),
          stock_stable_threshold: Number(storeSettings.stockIdeal)
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
          email: storeSettings.email,
          stock_low_threshold: Number(storeSettings.stockLow),
          stock_stable_threshold: Number(storeSettings.stockIdeal)
        }).eq('id', currentStoreId);
        
        if (storeError) throw storeError;
      }
      
      showToast('Configurações da loja salvas com sucesso!');
    } catch (err) {
      showToast(`Erro ao guardar: ${err.message}`, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) return;
    
    // Check max products limit based on plan
    if (currentSubscription) {
      const maxProducts = currentSubscription.subscription_plans?.max_products;
      if (maxProducts !== -1 && products.length >= maxProducts) {
        showToast(`O seu plano permite no máximo ${maxProducts} categorias. Faça upgrade!`, 'error');
        return;
      }
    } else {
      showToast("Sem assinatura ativa. Vá à aba de Assinaturas.", 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Verifica se a Categoria já existe NESTA LOJA (ignorando maiúsculas e minúsculas)
      const { data: exist } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', currentStoreId)
        .ilike('name', newProduct.name);

      if (exist && exist.length > 0) {
        showToast('Este Produto/Categoria já existe!', 'info');
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
      showToast('Erro ao salvar produto', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand.product_id || !newBrand.name || !newBrand.price || !newBrand.stock) {
      showToast("Preencha todos os campos!", 'info');
      return;
    }
    setIsSaving(true);
    try {
      // Procurar se esta Marca já existe dentro deste Produto NESTA LOJA
      const { data: existingItems, error: searchError } = await supabase
        .from('brands')
        .select('*')
        .eq('store_id', currentStoreId)
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
          .select('*, products(id, name, icon)');
          
        if (error) throw error;
        
        // Atualiza a tabela na UI
        setBrands(brands.map(b => b.id === existingItem.id ? data[0] : b));
        showToast(`Stock de '${existingItem.name}' atualizado para ${novoStock}!`);

      } else {
        // Não existe, cria um registo totalmente novo
        // Verifica o limite de marcas antes de adicionar nova
        if (currentSubscription) {
          const maxBrands = currentSubscription.subscription_plans?.max_brands;
          if (maxBrands !== -1 && brands.length >= maxBrands) {
             showToast(`O seu plano permite no máximo ${maxBrands} marcas. Faça upgrade!`, 'error');
             return;
          }
        } else {
          showToast("Sem assinatura ativa. Vá à aba de Assinaturas.", 'error');
          return;
        }

        const { data, error } = await supabase.from('brands').insert([{
          product_id: Number(newBrand.product_id),
          name: newBrand.name,
          price: Number(newBrand.price),
          stock: Number(newBrand.stock),
          store_id: currentStoreId
        }]).select('*, products(id, name, icon)');
        
        if (error) throw error;
        setBrands([...brands, data[0]]);
        showToast('Novo item registado com sucesso!');
      }

      setShowBrandModal(false);
      setNewBrand({ product_id: products[0]?.id || '', name: '', price: '', stock: '' });
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar marca', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const openBrandModal = () => {
    if (products.length === 0) {
      showToast("Crie um Produto Primeiro!", 'info');
      return;
    }
    setNewBrand({ ...newBrand, product_id: products[0].id });
    setShowBrandModal(true);
  };

  const openReinforceStockModal = () => {
    if (brands.length === 0) {
      showToast("Registe primeiro um item!", 'info');
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
      showToast("Selecione a marca e a quantidade!", 'info');
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
      showToast(`Stock de '${brandToUpdate.name}' reforçado!`);
      
      setShowReinforceStockModal(false);
      setReinforceStockData({ brand_id: '', added_stock: '', new_price: '' });
    } catch (err) {
      console.error(err);
      showToast('Erro ao reforçar stock', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getSubscriptionData = (basePrice, cycle) => {
    const cycles = {
      mensal: { months: 1, label: 'Mensal', discount: 0 },
      trimestral: { months: 3, label: 'Trimestral (-5%)', discount: 0.05 },
      semestral: { months: 6, label: 'Semestral (-10%)', discount: 0.10 },
      anual: { months: 12, label: 'Anual (-20%)', discount: 0.20 }
    };
    const c = cycles[cycle] || cycles.mensal;
    const totalAmount = basePrice * c.months * (1 - c.discount);
    return {
      totalAmount,
      months: c.months,
      label: c.label,
      discount: c.discount
    };
  };

  const getPlanRank = (planName) => {
    const ranks = { 'Básico': 1, 'Profissional': 2, 'Empresarial': 3 };
    return ranks[planName] || 0;
  };

  // --- Subscription Handlers ---
  const handleRenewSubscription = async () => {
    if (!currentSubscription) return;
    
    const subData = getSubscriptionData(currentSubscription.subscription_plans.price, billingCycle);
    
    setIsProcessingSubscription(true);
    try {
      // Call our backend endpoint that integrates with Paysuite checkout
      const response = await fetch('/api/payments/paysuite/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: subData.totalAmount,
          storeId: currentStoreId,
          planId: currentSubscription.plan_id
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com a Paysuite');
      }

      const payloadResp = await response.json();
      // Paysuite returns: { status: 'success', data: { checkout_url, ... } }
      const redirectUrl = payloadResp.data?.checkout_url || payloadResp.data?.redirect_url || payloadResp.data?.link || payloadResp.checkout_url || payloadResp.redirect_url;

      if (redirectUrl) {
          window.location.href = redirectUrl;
          return; // Para aqui pois o usuario foi redirecionado
      }

      showToast(`O checkout foi iniciado! Verifique o painel Paysuite.`, 'info');

      const nextDate = new Date(currentSubscription.next_billing_date);
      nextDate.setMonth(nextDate.getMonth() + subData.months);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          last_payment_date: new Date().toISOString().split('T')[0],
          next_billing_date: nextDate.toISOString().split('T')[0],
          amount_paid: subData.totalAmount
        })
        .eq('id', currentSubscription.id)
        .select('*, subscription_plans(*)');
      
      if (error) throw error;
      setCurrentSubscription(data[0]);
      setShowRenewModal(false);
      showToast('Assinatura renovada com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao renovar assinatura.', 'error');
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleUpgradePlan = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUpgradePlan) return;
    
    const subData = getSubscriptionData(selectedUpgradePlan.price, billingCycle);

    setIsProcessingSubscription(true);
    try {
      // Call our backend endpoint that integrates with Paysuite checkout
      const response = await fetch('/api/payments/paysuite/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: subData.totalAmount,
          storeId: currentStoreId,
          planId: selectedUpgradePlan.id
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com a Paysuite');
      }

      const payloadResp = await response.json();
      // Paysuite returns: { status: 'success', data: { checkout_url, ... } }
      const redirectUrl = payloadResp.data?.checkout_url || payloadResp.data?.redirect_url || payloadResp.data?.link || payloadResp.checkout_url || payloadResp.redirect_url;

      if (redirectUrl) {
          window.location.href = redirectUrl;
          return; // Para aqui pois o usuario foi redirecionado
      }

      showToast(`O checkout foi iniciado! Verifique o painel Paysuite.`, 'info');

      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + subData.months);

      if (currentSubscription) {
        const { data, error } = await supabase
          .from('subscriptions')
          .update({
            plan_id: selectedUpgradePlan.id,
            status: 'active',
            last_payment_date: new Date().toISOString().split('T')[0],
            next_billing_date: nextDate.toISOString().split('T')[0],
            amount_paid: subData.totalAmount
          })
          .eq('id', currentSubscription.id)
          .select('*, subscription_plans(*)');
  
        if (error) throw error;
        setCurrentSubscription(data[0]);
      } else {
        const { data, error } = await supabase
          .from('subscriptions')
          .insert([{
            store_name: storeSettings.storeName || 'Loja',
            store_id: currentStoreId,
            plan_id: selectedUpgradePlan.id,
            status: 'active',
            last_payment_date: new Date().toISOString().split('T')[0],
            next_billing_date: nextDate.toISOString().split('T')[0],
            amount_paid: subData.totalAmount
          }])
          .select('*, subscription_plans(*)');

        if (error) throw error;
        setCurrentSubscription(data[0]);
      }
      
      setShowUpgradeModal(false);
      setSelectedUpgradePlan(null);
      showToast(`Plano ${selectedUpgradePlan.name} activo!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar assinatura.', 'error');
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
      showToast("Não há dados para exportar.", 'info');
      return;
    }

    const exportData = sales.map(sale => ({
      'ID Venda': `#${String(sale.id).padStart(5, '0')}`,
      'Data e Hora': new Date(sale.created_at).toLocaleString('pt-MZ'),
      'Método de Pagamento': sale.payment_method,
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
      showToast("Não há dados para exportar.", 'info');
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
        sale.payment_method,
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
                  email: store.email || '',
                  stockLow: store.stock_low_threshold || 20,
                  stockIdeal: store.stock_stable_threshold || 50
               });
             }
          }
        }

        const storeId = profile?.store_id;

        const [productsRes, brandsRes, salesRes, plansRes, subsRes] = await Promise.all([
          storeId ? supabase.from('products').select('*').eq('store_id', storeId) : supabase.from('products').select('*').is('store_id', null),
          storeId ? supabase.from('brands').select('*, products(id, name, icon)').eq('store_id', storeId) : supabase.from('brands').select('*, products(id, name, icon)').is('store_id', null),
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

    // Re-fetch data when window gains focus (e.g. returning from POS tab)
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este item?')) return;
    try {
      const { error } = await supabase.from('brands').delete().eq('id', brandId);
      if (error) throw error;
      showToast('Item eliminado com sucesso!', 'success');
      fetchBrands(currentStoreId);
    } catch (err) {
      console.error(err);
      showToast('Erro ao eliminar item.', 'error');
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand.name || !editingBrand.price) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name: editingBrand.name,
          price: Number(editingBrand.price),
          stock: Number(editingBrand.stock)
        })
        .eq('id', editingBrand.id);

      if (error) throw error;
      showToast('Item atualizado com sucesso!', 'success');
      setShowEditBrandModal(false);
      fetchBrands(currentStoreId);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar item.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct.name) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          icon: editingProduct.icon
        })
        .eq('id', editingProduct.id);

      if (error) throw error;
      showToast('Categoria atualizada com sucesso!', 'success');
      setShowEditProductModal(false);
      fetchProducts(currentStoreId);
      fetchBrands(currentStoreId);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar categoria.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Ao eliminar esta categoria, todos os itens (marcas) associados também serão eliminados. Continuar?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      showToast('Categoria eliminada!', 'success');
      fetchProducts(currentStoreId);
      fetchBrands(currentStoreId);
    } catch (err) {
      console.error(err);
      showToast('Erro ao eliminar categoria.', 'error');
    }
  };

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
          {userProfile?.role === 'superadmin' && (
            <button className="btn-primary" style={{ width: '100%', marginBottom: '16px', justifyContent: 'center', backgroundColor: '#f59e0b', color: 'white' }} onClick={() => navigate('/superadmin')}>
              <Shield size={18} />
              Admin Global
            </button>
          )}
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
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3>Gestão de Marcas e Produtos</h3>
                        <button 
                          onClick={() => {
                            window.location.reload(); 
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          title="Recarregar dados"
                        >
                          <RefreshCw size={18} />
                        </button>
                     </div>
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
                           <th style={{ textAlign: 'right' }}>AÇÕES</th>
                         </tr>
                       </thead>
                       <tbody>
                         {brands.map(brand => (
                           <tr key={brand.id}>
                             <td>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <strong>{brand.name}</strong>
                                 <button 
                                   onClick={() => { setEditingBrand(brand); setShowEditBrandModal(true); }}
                                   style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', opacity: 0.5 }}
                                   title="Editar Marca/Item"
                                 >
                                   <Edit2 size={14} />
                                 </button>
                               </div>
                             </td>
                             <td>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 {brand.products?.name || 'Desconhecido'}
                                 <button 
                                   onClick={() => { setEditingProduct(brand.products); setShowEditProductModal(true); }}
                                   style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', opacity: 0.5 }}
                                   title="Editar Categoria"
                                 >
                                   <Edit2 size={14} />
                                 </button>
                               </div>
                             </td>
                             <td>{Number(brand.price).toFixed(2)} MZN</td>
                             <td>{brand.stock} un</td>
                             <td>
                                <span style={{ 
                                  color: Number(brand.stock) <= Number(storeSettings.stockLow) ? 'var(--danger)' : 
                                         Number(brand.stock) <= Number(storeSettings.stockIdeal) ? '#eab308' : 
                                         'var(--success)' 
                                }}>
                                  {Number(brand.stock) <= Number(storeSettings.stockLow) ? 'Crítico' : 
                                   Number(brand.stock) <= Number(storeSettings.stockIdeal) ? 'Abaixo do ideal' : 
                                   'Estável'}
                                </span>
                             </td>
                             <td>
                               <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                 <button 
                                   className="btn-icon" 
                                   style={{ color: 'var(--danger)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                                   onClick={() => handleDeleteBrand(brand.id)}
                                 >
                                   <Trash2 size={18} />
                                 </button>
                               </div>
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
                    <div className="card-header" style={{ marginBottom: '24px' }}>
                      <div style={{ flex: 1 }}>
                        <h3>Planos Disponíveis</h3>
                        <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Selecione o plano ideal para o seu negócio.</p>
                      </div>
                      
                      {/* Sub-period select */}
                      <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        {['mensal', 'trimestral', 'semestral', 'anual'].map(cycle => (
                          <button
                            key={cycle}
                            onClick={() => setBillingCycle(cycle)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: billingCycle === cycle ? 'white' : 'transparent',
                              color: billingCycle === cycle ? 'var(--primary)' : 'var(--secondary)',
                              fontWeight: '700',
                              fontSize: '13px',
                              boxShadow: billingCycle === cycle ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                              cursor: 'pointer',
                              textTransform: 'capitalize'
                            }}
                          >
                            {cycle}
                          </button>
                        ))}
                      </div>

                      {currentSubscription && (
                        <button
                          onClick={() => setShowRenewModal(true)}
                          style={{ marginLeft: '16px', backgroundColor: 'var(--success)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
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
                              {(() => {
                                const subData = getSubscriptionData(plan.price, billingCycle);
                                return (
                                  <>
                                    <span style={{ fontSize: '36px', fontWeight: '800', color: planColor.main }}>{subData.totalAmount.toFixed(0)}</span>
                                    <span style={{ fontSize: '16px', color: 'var(--secondary)' }}> MZN / {subData.label.toLowerCase()}</span>
                                    {billingCycle !== 'mensal' && (
                                      <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', marginTop: '4px' }}>
                                        Equivalente a {(subData.totalAmount / subData.months).toFixed(0)} MZN / mês
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
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
                                onClick={() => {
                                  if (getPlanRank(plan.name) < getPlanRank(currentSubscription?.subscription_plans?.name)) {
                                    showToast("Downgrades não são permitidos enquanto o plano estiver ativo.", 'info');
                                    return;
                                  }
                                  openUpgradeModal(plan);
                                }}
                                disabled={getPlanRank(plan.name) < getPlanRank(currentSubscription?.subscription_plans?.name)}
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
                                  backgroundColor: getPlanRank(plan.name) < getPlanRank(currentSubscription?.subscription_plans?.name) ? '#e2e8f0' : planColor.main,
                                  color: getPlanRank(plan.name) < getPlanRank(currentSubscription?.subscription_plans?.name) ? '#94a3b8' : 'white',
                                  transition: 'opacity 0.2s',
                                  cursor: getPlanRank(plan.name) < getPlanRank(currentSubscription?.subscription_plans?.name) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <ArrowUpCircle size={18} />
                                {getPlanRank(plan.name) > getPlanRank(currentSubscription?.subscription_plans?.name) ? 'Fazer Upgrade' : 'Mudar para este plano'}
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
                  {currentSubscription?.subscription_plans?.has_reports ? (
                    <>
                      <div className="card-header" style={{ marginBottom: '20px' }}>
                        <div>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Crown size={20} color="#f59e0b" /> Relatórios Avançados</h3>
                          <p style={{ color: 'var(--secondary)', fontSize: '14px', marginTop: '4px' }}>Analise o seu desempenho com gráficos e filtros detalhados.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <select 
                            value={reportFilterPayment}
                            onChange={(e) => setReportFilterPayment(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'var(--bg-surface)' }}
                          >
                            <option value="all">Todos Pagamentos</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="E-Mola">E-Mola</option>
                            <option value="M-Kesh">M-Kesh</option>
                          </select>
                          <select 
                            value={reportFilterDate}
                            onChange={(e) => setReportFilterDate(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'var(--bg-surface)' }}
                          >
                            <option value="today">Hoje</option>
                            <option value="7days">Últimos 7 Dias</option>
                            <option value="30days">Últimos 30 Dias</option>
                            <option value="all">Todos os Tempos</option>
                          </select>
                          <button onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--success)', backgroundColor: '#eefdf4', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                            <FileSpreadsheet size={16} />
                            Excel
                          </button>
                          <button onClick={handleExportPDF} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--primary)', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                            <FileText size={16} />
                            PDF
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const now = new Date();
                        let filteredSales = sales;
                        
                        if (reportFilterDate === 'today') {
                          filteredSales = filteredSales.filter(s => new Date(s.created_at).toDateString() === now.toDateString());
                        } else if (reportFilterDate === '7days') {
                          const past7 = new Date(); past7.setDate(now.getDate() - 7);
                          filteredSales = filteredSales.filter(s => new Date(s.created_at) >= past7);
                        } else if (reportFilterDate === '30days') {
                          const past30 = new Date(); past30.setDate(now.getDate() - 30);
                          filteredSales = filteredSales.filter(s => new Date(s.created_at) >= past30);
                        }

                        if (reportFilterPayment !== 'all') {
                          filteredSales = filteredSales.filter(s => s.payment_method?.toLowerCase() === reportFilterPayment.toLowerCase());
                        }

                        const totalRev = filteredSales.reduce((acc, s) => acc + Number(s.total), 0);
                        const ticketMedio = filteredSales.length > 0 ? (totalRev / filteredSales.length).toFixed(2) : '0.00';
                        
                        // Prepare chart data (Group by Date)
                        const chartDataMap = {};
                        filteredSales.forEach(s => {
                            const d = new Date(s.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
                            if (!chartDataMap[d]) chartDataMap[d] = { date: d, total: 0 };
                            chartDataMap[d].total += Number(s.total);
                         });
                        const chartData = Object.values(chartDataMap).reverse();

                        return (
                          <>
                            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                              <div className="stat-card">
                                <div className="stat-info">
                                  <span className="stat-label">Receita no Período</span>
                                  <span className="stat-value">{totalRev.toFixed(2)} MZN</span>
                                </div>
                                <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}><BarChart3 size={24} /></div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-info">
                                  <span className="stat-label">Vendas Realizadas</span>
                                  <span className="stat-value">{filteredSales.length}</span>
                                </div>
                                <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#6c757d' }}><Package size={24} /></div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-info">
                                  <span className="stat-label">Ticket Médio</span>
                                  <span className="stat-value">{ticketMedio} MZN</span>
                                </div>
                                <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}><CreditCard size={24} /></div>
                              </div>
                            </div>

                            {chartData.length > 0 ? (
                              <div className="content-card" style={{ marginBottom: '24px', padding: '24px' }}>
                                <h3 style={{ marginBottom: '20px', color: 'var(--text-dark)' }}>Evolução de Faturação</h3>
                                <div style={{ height: '300px', width: '100%' }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#178236" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#178236" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} tickFormatter={(val) => `${val}`} />
                                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                                      <RechartsTooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => [`${value.toFixed(2)} MZN`, 'Faturado']}
                                      />
                                      <Area type="monotone" dataKey="total" stroke="#178236" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ) : (
                              <div className="content-card" style={{ marginBottom: '24px', padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
                                Não há dados para exibir no gráfico neste período.
                              </div>
                            )}

                            <div className="content-card">
                              <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-dark)' }}>Histórico Detalhado em Tempo Real</h3>
                              {filteredSales.length === 0 ? (
                                <p style={{ color: 'var(--secondary)' }}>Nenhuma venda registrada no período selecionado.</p>
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
                                    {filteredSales.map(sale => (
                                      <tr key={sale.id}>
                                        <td style={{ color: 'var(--secondary)' }}>#{String(sale.id).padStart(5, '0')}</td>
                                        <td>{new Date(sale.created_at).toLocaleString('pt-MZ')}</td>
                                        <td style={{ fontWeight: 'bold' }}>
                                          {(() => {
                                            switch(sale.payment_method) {
                                              case 'M-Pesa': return <span style={{ color: '#ef4444' }}>M-Pesa</span>;
                                              case 'E-Mola': return <span style={{ color: '#f97316' }}>E-Mola</span>;
                                              case 'M-Kesh': return <span style={{ color: '#eab308' }}>M-Kesh</span>;
                                              default: return <span style={{ color: 'var(--success)' }}>Dinheiro</span>;
                                            }
                                          })()}
                                        </td>
                                        <td style={{ fontWeight: '700' }}>{Number(sale.total).toFixed(2)} MZN</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="card-header" style={{ marginBottom: '20px' }}>
                        <h3>Relatório de Vendas (Básico)</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--success)', backgroundColor: '#eefdf4', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                            <FileSpreadsheet size={16} /> Exportar Excel
                          </button>
                        </div>
                      </div>
                      
                      {/* Básico UI... */}
                      <div className="stats-grid" style={{ marginBottom: '24px' }}>
                        <div className="stat-card">
                          <div className="stat-info">
                            <span className="stat-label">Receita Acumulada</span>
                            <span className="stat-value">{sales.reduce((acc, sale) => acc + Number(sale.total), 0).toFixed(2)} MZN</span>
                          </div>
                          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}><BarChart3 size={24} /></div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-info">
                            <span className="stat-label">Vendas</span>
                            <span className="stat-value">{sales.length}</span>
                          </div>
                          <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#6c757d' }}><Package size={24} /></div>
                        </div>
                      </div>

                      <div className="content-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ filter: 'blur(4px)', opacity: 0.6, pointerEvents: 'none' }}>
                          <h3 style={{ marginBottom: '20px' }}>Evolução de Faturação</h3>
                          <div style={{ height: '200px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '20px' }}></div>
                          <table className="products-table">
                            <thead><tr><th>ID</th><th>DATA</th><th>MÉTODO</th><th>VALOR</th></tr></thead>
                            <tbody><tr><td>#0001</td><td>Hoje</td><td>M-Pesa</td><td>500 MZN</td></tr></tbody>
                          </table>
                        </div>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                          <Crown size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
                          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: 'var(--primary)' }}>Relatórios Avançados Bloqueados</h3>
                          <p style={{ color: 'var(--secondary)', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
                            Faça upgrade para o plano Profissional ou Empresarial para ter acesso a gráficos de vendas detalhados e filtros de datas/pagamentos.
                          </p>
                          <button onClick={() => setActiveTab('assinaturas')} className="btn-primary" style={{ backgroundColor: '#f59e0b', padding: '12px 24px', fontSize: '15px' }}>
                            Fazer Upgrade Agora
                          </button>
                        </div>
                      </div>
                    </>
                  )}
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
                        <RefreshCw size={18} />
                        Parâmetros de Stock
                      </h4>
                      <p style={{ color: 'var(--secondary)', fontSize: '13px', marginBottom: '20px' }}>
                        Defina os limites que determinam o estado visual do seu inventário.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>
                            Abaixo do Ideal (Crítico)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="number" 
                              value={storeSettings.stockLow}
                              onChange={(e) => setStoreSettings({...storeSettings, stockLow: e.target.value})}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>un</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>Aparecerá a Vermelho</span>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)', fontWeight: '600' }}>
                            Ideal (Atenção)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="number" 
                              value={storeSettings.stockIdeal}
                              onChange={(e) => setStoreSettings({...storeSettings, stockIdeal: e.target.value})}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>un</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#ca8a04', marginTop: '4px', display: 'block' }}>Aparecerá a Amarelo</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--success)', fontWeight: '500' }}>
                        Acima de {storeSettings.stockIdeal} un: <span style={{ fontWeight: 'bold' }}>Estável (Verde)</span>
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
                    <option value="Pocket">Saqueta (Pocket)</option>
                    <option value="GlassWater">Óleo/Água (GlassWater)</option>
                    <option value="CupSoda">Refrigerante (CupSoda)</option>
                    <option value="Wine">Garrafa de Vidro (Wine)</option>
                    <option value="Milk">Garrafa/Pacote Leite (Milk)</option>
                    <option value="Coffee">Caneca/Café (Coffee)</option>
                    <option value="Bean">Grãos (Bean)</option>
                    <option value="Wheat">Pó/Farinha (Wheat)</option>
                    <option value="Beef">Carne (Beef)</option>
                    <option value="Drumstick">Frango (Drumstick)</option>
                    <option value="Fish">Peixe (Fish)</option>
                    <option value="Sparkles">Pó/Diverso (Sparkles)</option>
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
                const subData = getSubscriptionData(selectedUpgradePlan.price, billingCycle);
                const currentPrice = Number(currentSubscription?.subscription_plans?.price || 0);
                const newPrice = subData.totalAmount;
                const isUpgrade = getPlanRank(selectedUpgradePlan.name) > getPlanRank(currentSubscription?.subscription_plans?.name);
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
                        <div style={{ fontWeight: '800', fontSize: '24px', color: 'var(--secondary)' }}>{currentSubscription?.amount_paid || currentPrice} <span style={{ fontSize: '14px' }}>MZN</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px', color: planColor.main }}>→</div>
                      <div style={{ flex: 1, backgroundColor: planColor.bg, borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center', border: `2px solid ${planColor.main}` }}>
                        <div style={{ fontSize: '12px', color: planColor.main, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Novo Plano ({subData.label})</div>
                        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{selectedUpgradePlan.name}</div>
                        <div style={{ fontWeight: '800', fontSize: '24px', color: planColor.main }}>{newPrice.toFixed(0)} <span style={{ fontSize: '14px' }}>MZN</span></div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#eefdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '24px', textAlign: 'center' }}>
                      <span style={{ color: '#166534', fontWeight: '600', fontSize: '14px' }}>
                        Cobrança única de {newPrice.toFixed(0)} MZN para {subData.months} mês(es)
                      </span>
                    </div>

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

        {/* Edit Brand Modal */}
      {showEditBrandModal && editingBrand && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">Editar Marca/Item</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Nome da Marca</label>
                <input 
                  type="text" 
                  value={editingBrand.name} 
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Preço (MZN)</label>
                  <input 
                    type="number" 
                    value={editingBrand.price} 
                    onChange={(e) => setEditingBrand({ ...editingBrand, price: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Stock Atual</label>
                  <input 
                    type="number" 
                    value={editingBrand.stock} 
                    onChange={(e) => setEditingBrand({ ...editingBrand, stock: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditBrandModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)' }}>Cancelar</button>
              <button 
                onClick={handleUpdateBrand}
                disabled={isSaving}
                style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white' }}>
                {isSaving ? 'Salvando...' : 'Atualizar Dados'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Category Modal */}
      {showEditProductModal && editingProduct && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-title">Editar Categoria de Produto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Nome da Categoria</label>
                <input 
                  type="text" 
                  value={editingProduct.name} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--secondary)' }}>Ícone Representativo</label>
                <select 
                  value={editingProduct.icon}
                  onChange={(e) => setEditingProduct({ ...editingProduct, icon: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                >
                  <option value="Box">Caixa (Box)</option>
                  <option value="Package">Pacote (Package)</option>
                  <option value="ShoppingBag">Saco (ShoppingBag)</option>
                  <option value="Pocket">Saqueta (Pocket)</option>
                  <option value="GlassWater">Óleo/Água (GlassWater)</option>
                  <option value="CupSoda">Refrigerante (CupSoda)</option>
                  <option value="Wine">Garrafa de Vidro (Wine)</option>
                  <option value="Milk">Garrafa/Pacote Leite (Milk)</option>
                  <option value="Coffee">Caneca/Café (Coffee)</option>
                  <option value="Bean">Grãos (Bean)</option>
                  <option value="Wheat">Pó/Farinha (Wheat)</option>
                  <option value="Beef">Carne (Beef)</option>
                  <option value="Drumstick">Frango (Drumstick)</option>
                  <option value="Fish">Peixe (Fish)</option>
                  <option value="Sparkles">Pó/Diverso (Sparkles)</option>
                </select>
              </div>
              
              <button 
                onClick={() => handleDeleteProduct(editingProduct.id)}
                style={{ padding: '8px', border: '1px solid var(--danger)', color: 'var(--danger)', backgroundColor: 'transparent', borderRadius: '8px', marginTop: '10px', fontSize: '13px' }}
              >
                Eliminar Categoria Permanentemente
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditProductModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--secondary)' }}>Cancelar</button>
              <button 
                onClick={handleUpdateProduct}
                disabled={isSaving}
                style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--success)', color: 'white' }}>
                {isSaving ? 'Salvando...' : 'Guardar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      </main>
    </div>
  );
}
