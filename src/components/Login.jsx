import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Mail, Lock, LogIn, UserPlus, X, CheckCircle, XCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Login.css';

function CheckIcon({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Toast State
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success', title = '') => {
    setToast({ message, type, title: title || (type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Informação') });
    setTimeout(() => setToast(null), 3000);
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { name: formData.name }
          }
        });
        if (error) throw error;
        showToast('Conta criada com sucesso! Já pode fazer login.');
        setIsLogin(true);
      }
    } catch (err) {
      showToast(err.message === 'Invalid login credentials' 
            ? 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.' 
            : err.message || 'Ocorreu um erro durante a autenticação.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      
      {/* Painel Esquerdo - Branding */}
      <div className="login-branding">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
        
        <div className="login-branding-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#178236', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={32} color="white" />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>KaziHub</h1>
          </div>
          <h2>
            A Gestão do Seu Negócio,<br/>Num Piscar de Olhos.
          </h2>
          <p>
            Transformamos qualquer loja num sistema digital poderoso: controle rápido de stock, vendas mais ágeis e lucros claros sem complicação.
          </p>
          
          <div className="login-features">
            <div className="login-feature-item">
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '50%' }}><CheckIcon size={16} color="#178236" /></div>
              Simples
            </div>
            <div className="login-feature-item">
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '50%' }}><CheckIcon size={16} color="#178236" /></div>
              Rápido
            </div>
            <div className="login-feature-item">
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '50%' }}><CheckIcon size={16} color="#178236" /></div>
              Poderoso
            </div>
          </div>
        </div>
      </div>

      {/* Painel Direito - Formulário */}
      <div className="login-form-panel">
        <div className="login-form-card">
          <h2>
            {isLogin ? 'Bem-vindo de volta' : 'Criar Conta de Gestor'}
          </h2>
          <p>
            {isLogin ? 'Faça login para aceder ao seu painel administrativo.' : 'Registe os seus dados pessoais. Os pormenores da loja serão adicionados mais tarde.'}
          </p>

          <div className="login-tabs">
            <button 
              onClick={() => setIsLogin(true)}
              className={`login-tab-btn ${isLogin ? 'active' : ''}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`login-tab-btn ${!isLogin ? 'active' : ''}`}
            >
              Registar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            
            {!isLogin && (
              <div className="login-field">
                <label>Nome Completo</label>
                <div className="login-input-wrapper">
                  <div className="icon"><User size={20} /></div>
                  <input 
                    type="text" 
                    required={!isLogin}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="O seu nome"
                  />
                </div>
              </div>
            )}

            <div className="login-field">
              <label>E-mail</label>
              <div className="login-input-wrapper">
                <div className="icon"><Mail size={20} /></div>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            <div className="login-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Palavra-passe</label>
                {isLogin && <a href="#" style={{ fontSize: '13px', color: '#178236', textDecoration: 'none', fontWeight: '600' }}>Esqueceu-se?</a>}
              </div>
              <div className="login-input-wrapper">
                <div className="icon"><Lock size={20} /></div>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
            >
              {isLoading ? (
                'Processando...'
              ) : isLogin ? (
                <><LogIn size={20} /> Entrar no KaziHub</>
              ) : (
                <><UserPlus size={20} /> Criar Conta de Gestor</>
              )}
            </button>
          </form>

        </div>
      </div>

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
