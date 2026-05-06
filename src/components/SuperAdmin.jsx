import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  Check
} from 'lucide-react';
import './SuperAdmin.css';

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        // Verify if user is superadmin
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!profile || profile.role !== 'superadmin') {
          showToast("Acesso Negado. Não tem permissões de SuperAdmin.", "error");
          navigate('/dashboard');
          return;
        }

        const [storesRes, profilesRes, subsRes, plansRes] = await Promise.all([
          supabase.from('stores').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*, stores(name)').order('created_at', { ascending: false }),
          supabase.from('subscriptions').select('*, subscription_plans(*)').order('created_at', { ascending: false }),
          supabase.from('subscription_plans').select('*')
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
    await supabase.auth.signOut();
    navigate('/');
    const handleUpdateStore = async () => {
    if (!editingStore.name) return;
    try {
      const { error } = await supabase.from('stores').update({
        name: editingStore.name,
        email: editingStore.email,
        phone: editingStore.phone,
        address: editingStore.address
      }).eq('id', editingStore.id);
      
      if (error) throw error;
      showToast("Dados da loja atualizados!");
      setShowEditStoreModal(false);
      
      const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
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
        const { error } = await supabase.from('subscriptions').update({
          plan_id: selectedPlanId,
          status: 'active',
          next_billing_date: nextDate.toISOString().split('T')[0]
        }).eq('id', existingSub.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscriptions').insert([{
          store_id: managingPlanStore.id,
          store_name: managingPlanStore.name,
          plan_id: selectedPlanId,
          status: 'active',
          payment_method: 'admin_action',
          amount_paid: 0,
          next_billing_date: nextDate.toISOString().split('T')[0]
        }]);
        if (error) throw error;
      }

      showToast(`Plano ${plan.name} atribuído com sucesso!`);
      setShowPlanModal(false);
      
      const { data } = await supabase.from('subscriptions').select('*, subscription_plans(*)').order('created_at', { ascending: false });
      if (data) setSubscriptions(data);
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar plano.", "error");
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!window.confirm("ATENÇÃO: Isto apagará a loja, todos os produtos, vendas e utilizadores associados. Tem a certeza?")) return;
    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
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
      // Find the Enterprise plan
      const { data: planData } = await supabase.from('subscription_plans').select('*').eq('name', 'Empresarial').single();
      
      if (!planData) {
        showToast("Plano Empresarial não encontrado no sistema.", "error");
        return;
      }

      // Check if store already has a sub
      const existingSub = subscriptions.find(s => s.store_id === storeId);
      
      const nextDate = new Date();
      nextDate.setFullYear(nextDate.getFullYear() + 10); // 10 years free

      if (existingSub) {
        const { error } = await supabase.from('subscriptions').update({
          plan_id: planData.id,
          status: 'active',
          amount_paid: 0, // Free
          next_billing_date: nextDate.toISOString().split('T')[0]
        }).eq('id', existingSub.id);
        
        if (error) throw error;
      } else {
        const store = stores.find(s => s.id === storeId);
        const { error } = await supabase.from('subscriptions').insert([{
          store_id: storeId,
          store_name: store?.name || 'Loja',
          plan_id: planData.id,
          status: 'active',
          payment_method: 'admin_grant',
          amount_paid: 0,
          next_billing_date: nextDate.toISOString().split('T')[0]
        }]);
        if (error) throw error;
      }

      showToast("Plano Empresarial Gratuito concedido com sucesso!");
      
      // Refresh data
      const { data: newSubs } = await supabase.from('subscriptions').select('*, subscription_plans(*)').order('created_at', { ascending: false });
      if (newSubs) setSubscriptions(newSubs);

    } catch (err) {
      console.error(err);
      showToast("Erro ao conceder plano.", "error");
    }
  };
  };

  const NAV_ITEMS = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> },
    { id: 'stores', label: 'Lojas Registadas', icon: <Store size={20} /> },
    { id: 'users', label: 'Utilizadores', icon: <Users size={20} /> },
    { id: 'subscriptions', label: 'Assinaturas Globais', icon: <CreditCard size={20} /> },
  ];

  return (
    <div className="super-admin-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ backgroundColor: '#1A1A2E', color: 'white' }}>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} color="#f59e0b" />
            SuperAdmin
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
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>KaziHub - Controlo Global</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} />
              Acesso Total (SuperAdmin)
            </div>
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
                  <h3 style={{ marginBottom: '16px' }}>Utilizadores do Sistema</h3>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Função (Role)</th>
                        <th>Loja Associada</th>
                        <th>Data de Registo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: '600' }}>{user.full_name || '—'}</td>
                          <td>
                            <span className={`sa-badge ${user.role === 'superadmin' ? 'active' : ''}`} style={user.role === 'superadmin' ? { backgroundColor: '#fef3c7', color: '#d97706' } : {}}>
                              {user.role}
                            </span>
                          </td>
                          <td>{user.stores?.name || 'Nenhuma'}</td>
                          <td>{new Date(user.created_at).toLocaleDateString('pt-MZ')}</td>
                        </tr>
                      ))}
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
 
        {/* Modal Editar Loja */}
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

        {/* Modal Gerir Plano */}
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

        {/* Global Toast Notification */}

        {/* Global Toast Notification */}
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
