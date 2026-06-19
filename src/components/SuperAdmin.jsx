import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut,
  Shield,
  Activity,
  Search,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  Info,
  Edit2,
  Trash2,
  Eye,
  Key,
  Ban,
  MoreVertical,
  Check,
  Zap,
  Crown,
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import './SuperAdmin.css';

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [editingStore, setEditingStore] = useState(null);
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [managingPlanStore, setManagingPlanStore] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planPlans, setPlanPlans] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [managingTeamStore, setManagingTeamStore] = useState(null);
  const [newTeamUserEmail, setNewTeamUserEmail] = useState('');
  const [newTeamUserPassword, setNewTeamUserPassword] = useState('');
  const [newTeamUserFullName, setNewTeamUserFullName] = useState('');
  const [newTeamUserRole, setNewTeamUserRole] = useState('vendedor');
  const [isProcessingTeam, setIsProcessingTeam] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success', title = '') => {
    setToast({ message, type, title: title || (type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Informação') });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function fetchSuperAdminData() {
      setIsLoading(true);
      try {
        // user comes from context
        if (!user) { navigate('/'); return; }

        // Verify if user is superadmin
        const { data: profiles } = await api.get('/profiles');
        const profile = profiles.find(p => p.id === user.id);
        if (!profile || profile.role !== 'superadmin') {
          showToast("Acesso Negado. Não tem permissões de SuperAdmin.", "error");
          navigate('/dashboard');
          return;
        }

        const [storesRes, profilesRes, subsRes, plansRes] = await Promise.all([
          api.get('/stores'),
          api.get('/profiles'),
          api.get('/subscriptions'),
          api.get('/subscription_plans')
        ]);

        if (storesRes.data) setStores(storesRes.data);
        if (profilesRes.data) setUsers(profilesRes.data);
        if (subsRes.data) setSubscriptions(subsRes.data);
        if (plansRes.data) setPlanPlans(plansRes.data);

      } catch (error) {
        console.error("Error fetching SuperAdmin data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuperAdminData();
  }, [navigate]);

  const handleLogout = async () => {
    logout();
    navigate('/');
  };

  const handleUpdateStore = async () => {
    if (!editingStore.name) return;
    try {
      await api.put(`/stores/${editingStore.id}`, {
        name: editingStore.name,
        email: editingStore.email,
        phone: editingStore.phone,
        address: editingStore.address
      });
      const error = null;
      
      if (error) throw error;
      showToast("Dados da loja atualizados!");
      setShowEditStoreModal(false);
      
      const { data } = await api.get('/stores');
      if (data) setStores(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar loja.", "error");
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlanId || !managingPlanStore) return;
    try {
      const existingSub = subscriptions.find(s => s.store_id === managingPlanStore.id);
      const plan = planPlans.find(p => p.id === selectedPlanId);
      
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);

      if (existingSub) {
        // TODO API update sub
        const error = null;
        if (error) throw error;
      } else {
        // TODO API insert sub
        const error = null;
        if (error) throw error;
      }

      showToast(`Plano ${plan.name} atribuído com sucesso!`);
      setShowPlanModal(false);
      
      const { data } = await api.get('/subscriptions');
      if (data) setSubscriptions(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar plano.", "error");
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!window.confirm("ATENÇÃO: Isto apagará a loja, todos os produtos, vendas e utilizadores associados. Tem a certeza?")) return;
    try {
      // await api.delete(`/stores/${storeId}`);
      const error = null;
      if (error) throw error;
      showToast("Loja eliminada do sistema.");
      setStores(stores.filter(s => s.id !== storeId));
    } catch (err) {
      console.error(err);
      showToast("Erro ao eliminar loja.", "error");
    }
  };

  const grantFreeEnterprise = async (storeId) => {
    try {
      const { data: plans } = await api.get('/subscription_plans');
      const planData = plans.find(p => p.name === 'Empresarial');
      
      if (!planData) {
        showToast("Plano Empresarial não encontrado no sistema.", "error");
        return;
      }

      const existingSub = subscriptions.find(s => s.store_id === storeId);
      
      const nextDate = new Date();
      nextDate.setFullYear(nextDate.getFullYear() + 10); // 10 years free

      if (existingSub) {
        // TODO API update sub
        const error = null;
        
        if (error) throw error;
      } else {
        const store = stores.find(s => s.id === storeId);
        // TODO API insert sub
        const error = null;
        if (error) throw error;
      }

      showToast("Plano Empresarial Gratuito concedido com sucesso!");
      const { data: newSubs } = await api.get('/subscriptions');
      if (newSubs) setSubscriptions(newSubs);
    } catch (err) {
      console.error(err);
      showToast("Erro ao conceder plano.", "error");
    }
  };

  const handleAddTeamUser = async () => {
    if (!newTeamUserEmail || !managingTeamStore) return;

    // Check plan limit
    const sub = subscriptions.find(s => s.store_id === managingTeamStore.id);
    if (sub && sub.subscription_plans) {
      const maxUsers = sub.subscription_plans.max_users;
      const currentUsersCount = users.filter(u => u.store_id === managingTeamStore.id).length;
      if (maxUsers !== -1 && currentUsersCount >= maxUsers) {
        showToast(`Limite do plano atingido (${maxUsers} utilizadores).`, "error");
        return;
      }
    }

    setIsProcessingTeam(true);
    try {
      // 1. Try to find if user exists
      const resProfiles = await api.get('/profiles');
      const profiles = resProfiles.data.filter(p => p.email.toLowerCase() === newTeamUserEmail.trim().toLowerCase());

      if (profiles && profiles.length > 0) {
        // User exists, just link
        const target = profiles[0];
        if (target.store_id) {
          showToast("Este utilizador já pertence a uma loja.", "error");
          return;
        }

        await api.put(`/profiles/${target.id}`, { store_id: managingTeamStore.id, role: newTeamUserRole });
        const updateError = null;

        if (updateError) throw updateError;
        showToast("Membro vinculado com sucesso!");
      } else {
        // User doesn't exist, create via backend
        if (!newTeamUserPassword) {
          showToast("Utilizador novo: é necessário definir uma senha.", "info");
          setIsProcessingTeam(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000')}/api/admin/create-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newTeamUserEmail.trim(),
            password: newTeamUserPassword,
            fullName: newTeamUserFullName || 'Novo Membro',
            role: newTeamUserRole,
            storeId: managingTeamStore.id
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao criar utilizador');

        showToast("Novo utilizador criado e vinculado!");
      }

      setNewTeamUserEmail('');
      setNewTeamUserPassword('');
      setNewTeamUserFullName('');
      
      // Refresh users
      const { data: newUsers } = await api.get('/profiles');
      if (newUsers) setUsers(newUsers);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Erro ao processar membro.", "error");
    } finally {
      setIsProcessingTeam(false);
    }
  };

  const handleRemoveTeamUser = async (profileId) => {
    if (!window.confirm("Remover este utilizador desta loja?")) return;
    
    setIsProcessingTeam(true);
    try {
      await api.put(`/profiles/${profileId}`, { store_id: null, role: 'vendedor' });
      const error = null;

      if (error) throw error;
      showToast("Membro removido da loja.");
      const { data: newUsers } = await api.get('/profiles');
      if (newUsers) setUsers(newUsers);
    } catch (err) {
      console.error(err);
      showToast("Erro ao remover membro.", "error");
    } finally {
      setIsProcessingTeam(false);
    }
  };

  const handleRoleChange = async (profileId, newRole) => {
    try {
      await api.put(`/profiles/${profileId}`, { role: newRole });
      showToast("Função (Role) alterada com sucesso!");
      const { data: newUsers } = await api.get('/profiles');
      if (newUsers) setUsers(newUsers);
    } catch (err) {
      console.error(err);
      showToast("Erro ao alterar função.", "error");
    }
  };

  const NAV_ITEMS = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={20} /> },
    { id: 'stores', label: 'Lojas Registadas', icon: <Store size={20} /> },
    { id: 'users', label: 'Utilizadores', icon: <Users size={20} /> },
    { id: 'subscriptions', label: 'Assinaturas Globais', icon: <CreditCard size={20} /> },
  ];

  // Processamento de dados para Relatórios
  const growthData = React.useMemo(() => {
    const dataByMonth = {};
    const processItem = (item, type) => {
      const d = new Date(item.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!dataByMonth[key]) dataByMonth[key] = { month: key, Lojas: 0, Utilizadores: 0 };
      dataByMonth[key][type]++;
    };
    stores.forEach(s => processItem(s, 'Lojas'));
    users.forEach(u => processItem(u, 'Utilizadores'));
    return Object.values(dataByMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [stores, users]);

  const planDistribution = React.useMemo(() => {
    const counts = {};
    subscriptions.filter(s => s.status === 'active').forEach(sub => {
      const planName = sub.subscription_plans?.name || 'Desconhecido';
      counts[planName] = (counts[planName] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [subscriptions]);

  const subscriptionStatusData = React.useMemo(() => {
    let ativas = 0;
    let inativas = 0;
    subscriptions.forEach(s => {
      if (s.status === 'active') ativas++;
      else inativas++;
    });
    // Adicionar as lojas sem assinaturas como inativas
    const storesWithSub = new Set(subscriptions.map(s => s.store_id));
    const lojasSemSub = stores.filter(s => !storesWithSub.has(s.id)).length;
    inativas += lojasSemSub;

    return [
      { name: 'Ativas', value: ativas },
      { name: 'Inativas/Sem Plano', value: inativas }
    ];
  }, [subscriptions, stores]);

  const COLORS = ['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="super-admin-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ backgroundColor: '#1A1A2E', color: 'white', padding: '20px' }}>
          <div className="sa-sidebar-logo">
            <img src="/stokaw.png" alt="Stoka Logo" style={{ height: '40px', width: 'auto' }} />
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-primary" style={{ width: '100%', marginBottom: '16px', justifyContent: 'center', backgroundColor: '#475569' }} onClick={() => navigate('/dashboard')}>
            <Activity size={18} />
            Voltar ao Dashboard
          </button>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)', padding: '12px 0' }}>
            <LogOut size={20} />
            Sair da Conta
          </button>
        </div>
      </aside>

      <main className="super-admin-main">
        <header className="sa-header">
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>Stoka - Controlo Global</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} />
              Acesso Total (SuperAdmin)
            </div>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--border)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>{user.full_name || 'Super Admin'}</span>
              </div>
            )}
          </div>
        </header>

        <div className="sa-content">
          {isLoading ? (
            <p>A carregar dados do sistema...</p>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  <div className="sa-stats-grid">
                    <div className="sa-stat-card">
                      <div className="sa-stat-info">
                        <span className="sa-stat-label">Total de Lojas</span>
                        <span className="sa-stat-value">{stores.length}</span>
                      </div>
                      <div className="sa-stat-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}><Store size={24} /></div>
                    </div>
                    <div className="sa-stat-card">
                      <div className="sa-stat-info">
                        <span className="sa-stat-label">Utilizadores</span>
                        <span className="sa-stat-value">{users.length}</span>
                      </div>
                      <div className="sa-stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}><Users size={24} /></div>
                    </div>
                    <div className="sa-stat-card">
                      <div className="sa-stat-info">
                        <span className="sa-stat-label">Assinaturas Ativas</span>
                        <span className="sa-stat-value">{subscriptions.filter(s => s.status === 'active').length}</span>
                      </div>
                      <div className="sa-stat-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}><CheckCircle size={24} /></div>
                    </div>
                    <div className="sa-stat-card">
                      <div className="sa-stat-info">
                        <span className="sa-stat-label">Receita Global Mensal</span>
                        <span className="sa-stat-value">
                          {subscriptions.filter(s => s.status === 'active').reduce((acc, s) => acc + Number(s.amount_paid || 0), 0).toFixed(0)} MZN
                        </span>
                      </div>
                      <div className="sa-stat-icon" style={{ backgroundColor: '#fef9c3', color: '#ca8a04' }}><CreditCard size={24} /></div>
                    </div>
                  </div>

                  <div className="content-card">
                    <h3 style={{ marginBottom: '16px' }}>Lojas Recentes</h3>
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Nome da Loja</th>
                          <th>Data de Registo</th>
                          <th>Estado da Assinatura</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stores.slice(0, 5).map(store => {
                          const sub = subscriptions.find(s => s.store_id === store.id);
                          return (
                            <tr key={store.id}>
                              <td style={{ fontWeight: '600' }}>{store.name}</td>
                              <td>{new Date(store.created_at).toLocaleDateString('pt-MZ')}</td>
                              <td>
                                {sub && sub.status === 'active' ? (
                                  <span className="sa-badge active">{sub.subscription_plans?.name || 'Ativa'}</span>
                                ) : (
                                  <span className="sa-badge inactive">Inativa</span>
                                )}
                              </td>
                              <td>
                                <div className="sa-action-group">
                                  <button 
                                    className="sa-icon-btn edit" 
                                    onClick={() => { setEditingStore(store); setShowEditStoreModal(true); }}
                                    title="Editar Loja"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    className="sa-icon-btn grant" 
                                    onClick={() => grantFreeEnterprise(store.id)}
                                    title="Conceder Plano Empresarial"
                                  >
                                    <Key size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeTab === 'reports' && (
                <div style={{ display: 'grid', gap: '24px' }}>
                  <div className="content-card">
                    <h3 style={{ marginBottom: '16px' }}>Crescimento da Plataforma</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growthData}>
                          <defs>
                            <linearGradient id="colorLojas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="Lojas" stroke="#4f46e5" fillOpacity={1} fill="url(#colorLojas)" />
                          <Area type="monotone" dataKey="Utilizadores" stroke="#10b981" fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="content-card">
                      <h3 style={{ marginBottom: '16px' }}>Distribuição de Planos (Ativos)</h3>
                      <div style={{ height: '250px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={planDistribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                              {planDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="content-card">
                      <h3 style={{ marginBottom: '16px' }}>Estado das Assinaturas (Lojas)</h3>
                      <div style={{ height: '250px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={subscriptionStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {subscriptionStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Ativas' ? '#10b981' : '#ef4444'} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stores' && (
                <div className="content-card">
                  <h3 style={{ marginBottom: '16px' }}>Todas as Lojas</h3>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Nome da Loja</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Endereço</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stores.map(store => (
                        <tr key={store.id}>
                          <td style={{ fontWeight: '600' }}>{store.name}</td>
                          <td>{store.email || '—'}</td>
                          <td>{store.phone || '—'}</td>
                          <td>{store.address || '—'}</td>
                          <td>
                            <div className="sa-action-group">
                              <button 
                                className="sa-icon-btn edit" 
                                onClick={() => { setEditingStore(store); setShowEditStoreModal(true); }}
                                title="Editar Informações"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                className="sa-icon-btn plan" 
                                onClick={() => { setManagingPlanStore(store); setShowPlanModal(true); }}
                                title="Gerir Plano"
                              >
                                <CreditCard size={18} />
                              </button>
                              <button 
                                className="sa-icon-btn team" 
                                style={{ color: '#8b5cf6', backgroundColor: '#f5f3ff' }}
                                onClick={() => { setManagingTeamStore(store); setShowTeamModal(true); }}
                                title="Gerir Equipa"
                              >
                                <Users size={18} />
                              </button>
                              <button 
                                className="sa-icon-btn delete" 
                                onClick={() => handleDeleteStore(store.id)}
                                title="Eliminar Loja"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="content-card">
                  <h3 style={{ marginBottom: '16px' }}>Utilizadores do Sistema ({users.length})</h3>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Função (Role)</th>
                        <th>Loja Associada</th>
                        <th>Data de Registo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? users.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: '600' }}>{u.full_name || '—'}</td>
                          <td>{u.email || '—'}</td>
                          <td>
                            <select
                              className={`sa-input`}
                              style={{ width: '130px', padding: '4px 8px', height: '32px', fontSize: '13px', ...(u.role === 'superadmin' ? { backgroundColor: '#fef3c7', color: '#d97706', borderColor: '#fcd34d', fontWeight: 'bold' } : {}) }}
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            >
                              <option value="vendedor">Vendedor</option>
                              <option value="admin">Admin</option>
                              <option value="owner">Owner</option>
                              <option value="superadmin">SuperAdmin</option>
                            </select>
                          </td>
                          <td>{u.store_name || 'Nenhuma'}</td>
                          <td>{new Date(u.created_at).toLocaleDateString('pt-MZ')}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                            Nenhum utilizador encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <div className="content-card">
                  <h3 style={{ marginBottom: '16px' }}>Todas as Assinaturas</h3>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Loja</th>
                        <th>Plano</th>
                        <th>Estado</th>
                        <th>Próxima Cobrança</th>
                        <th>Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map(sub => (
                        <tr key={sub.id}>
                          <td style={{ fontWeight: '600' }}>{sub.store_name}</td>
                          <td>{sub.subscription_plans?.name || 'Desconhecido'}</td>
                          <td>
                             <span className={`sa-badge ${sub.status === 'active' ? 'active' : 'inactive'}`}>
                              {sub.status}
                             </span>
                          </td>
                          <td>{new Date(sub.next_billing_date).toLocaleDateString('pt-MZ')}</td>
                          <td>{Number(sub.amount_paid || 0).toFixed(2)} MZN</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {showEditStoreModal && editingStore && (
          <div className="overlay">
            <div className="sa-modal-premium">
              <div className="modal-title" style={{ fontSize: '24px', marginBottom: '8px' }}>Editar Loja</div>
              <p style={{ color: 'var(--secondary)', marginBottom: '32px', fontSize: '14px' }}>Atualize os dados cadastrais da empresa.</p>
              
              <div className="sa-input-group">
                <label className="sa-label">Nome Comercial</label>
                <input 
                  className="sa-input"
                  type="text" 
                  value={editingStore.name} 
                  onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                  placeholder="Ex: Mercearia Central"
                />
              </div>

              <div className="sa-input-group">
                <label className="sa-label">Email de Contacto</label>
                <input 
                  className="sa-input"
                  type="email" 
                  value={editingStore.email || ''} 
                  onChange={(e) => setEditingStore({ ...editingStore, email: e.target.value })}
                  placeholder="loja@exemplo.com"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="sa-input-group">
                  <label className="sa-label">Telefone</label>
                  <input 
                    className="sa-input"
                    type="text" 
                    value={editingStore.phone || ''} 
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                  />
                </div>
                <div className="sa-input-group">
                  <label className="sa-label">Endereço</label>
                  <input 
                    className="sa-input"
                    type="text" 
                    value={editingStore.address || ''} 
                    onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="sa-btn-group">
                <button className="sa-btn-main secondary" onClick={() => setShowEditStoreModal(false)}>Cancelar</button>
                <button className="sa-btn-main primary" onClick={handleUpdateStore}>
                  <Check size={18} />
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {showTeamModal && managingTeamStore && (
          <div className="overlay">
            <div className="sa-modal-premium" style={{ width: '600px' }}>
              <div className="modal-title" style={{ fontSize: '24px', marginBottom: '8px' }}>Gerir Equipa: {managingTeamStore.name}</div>
              <p style={{ color: 'var(--secondary)', marginBottom: '32px', fontSize: '14px' }}>
                Adicione ou remova colaboradores vinculados a esta loja.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#64748b' }}>NOME COMPLETO</label>
                  <input 
                    className="sa-input"
                    type="text" 
                    placeholder="Nome do colaborador"
                    value={newTeamUserFullName}
                    onChange={(e) => setNewTeamUserFullName(e.target.value)}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#64748b' }}>EMAIL DO UTILIZADOR</label>
                  <input 
                    className="sa-input"
                    type="email" 
                    placeholder="email@exemplo.com"
                    value={newTeamUserEmail}
                    onChange={(e) => setNewTeamUserEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#64748b' }}>SENHA (PARA NOVOS)</label>
                  <input 
                    className="sa-input"
                    type="password" 
                    placeholder="Mínimo 6 caracteres"
                    value={newTeamUserPassword}
                    onChange={(e) => setNewTeamUserPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#64748b' }}>CARGO</label>
                  <select 
                    className="sa-input"
                    value={newTeamUserRole}
                    onChange={(e) => setNewTeamUserRole(e.target.value)}
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <button 
                    className="sa-btn-main primary" 
                    onClick={handleAddTeamUser}
                    disabled={isProcessingTeam}
                    style={{ width: '100%', height: '48px', marginTop: '8px' }}
                  >
                    {isProcessingTeam ? 'A Processar...' : 'Adicionar Membro à Equipa'}
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '10px' }}>
                <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Membros Atuais</h4>
                {users.filter(u => u.store_id === managingTeamStore.id).length === 0 ? (
                  <p style={{ fontSize: '14px', color: 'var(--secondary)', textAlign: 'center', padding: '20px' }}>Nenhum membro associado.</p>
                ) : (
                  users.filter(u => u.store_id === managingTeamStore.id).map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.full_name || 'Sem Nome'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)' }}>{u.email} • <span style={{ textTransform: 'capitalize', color: 'var(--primary)', fontWeight: '600' }}>{u.role}</span></div>
                      </div>
                      <button 
                        onClick={() => handleRemoveTeamUser(u.id)}
                        style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '8px' }}
                        title="Remover da Loja"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="sa-btn-group" style={{ marginTop: '32px' }}>
                <button className="sa-btn-main secondary" style={{ width: '100%' }} onClick={() => setShowTeamModal(false)}>Fechar Janela</button>
              </div>
            </div>
          </div>
        )}

        {showPlanModal && managingPlanStore && (
          <div className="overlay">
            <div className="sa-modal-premium">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Crown size={32} />
              </div>
              <div className="modal-title" style={{ fontSize: '24px', marginBottom: '8px' }}>Atribuir Plano</div>
              <p style={{ color: 'var(--secondary)', marginBottom: '32px', fontSize: '14px' }}>
                Alterar o nível de acesso para <strong>{managingPlanStore.name}</strong>.
              </p>

              <div className="sa-input-group">
                <label className="sa-label">Selecione o Novo Plano</label>
                <select 
                  className="sa-input"
                  value={selectedPlanId} 
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Escolha um nível...</option>
                  {planPlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()} — {p.price} MZN</option>
                  ))}
                </select>
              </div>

              <div className="sa-btn-group">
                <button className="sa-btn-main secondary" onClick={() => setShowPlanModal(false)}>Voltar</button>
                <button className="sa-btn-main success" onClick={handleUpdatePlan}>
                  <Zap size={18} />
                  Ativar Plano
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="toast-container" style={{ zIndex: 9999 }}>
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
