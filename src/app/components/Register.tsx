import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CampoPassword } from './CampoPassword';
import { AlertCircle, User, Mail, Lock, Phone, Building2, CreditCard, ChevronRight, Check, Server, Monitor, Cpu } from 'lucide-react';

export function Register({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [perfil, setPerfil] = useState<'tecnico' | 'cliente'>('cliente');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefone: '',
    empresa: '',
    nif: '',
    ip_servidor: ''
  });
  const [listaPostos, setListaPostos] = useState([{ id: '', nome: '' }]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    
    if (formData.password !== formData.confirmPassword) {
      setErro('As senhas não coincidem.');
      return;
    }

    setCarregando(true);

    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        password: formData.password,
        telefone: formData.telefone,
        perfil: perfil,
        ip_servidor: formData.ip_servidor,
        postos: perfil === 'cliente' ? listaPostos.reduce((acc, p, i) => ({
          ...acc,
          [`posto ${i + 1}`]: { Id: p.id, Nome: p.nome }
        }), {}) : {},
        status: 'activo',
        ...(perfil === 'cliente' ? { empresa: formData.empresa, nif: formData.nif } : {})
      };

      await register(payload);
      setSucesso(true);
      setTimeout(() => {
        onBackToLogin();
      }, 3000);
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      setErro(error?.message || 'Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Cadastro Realizado!</h2>
          <p className="text-gray-500 font-medium">Sua conta foi criada com sucesso. Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col md:flex-row">
        {/* Lado Esquerdo - Info */}
        <div className="md:w-1/3 bg-indigo-600 p-8 text-white flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-black mb-2">SOSTicket</h1>
            <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest">Crie sua conta</p>
          </div>
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${perfil === 'cliente' ? 'bg-white text-indigo-600 border-white' : 'bg-indigo-500/30 border-transparent hover:bg-indigo-500/50'}`} onClick={() => setPerfil('cliente')}>
              <p className="text-xs font-bold uppercase mb-1">Perfil</p>
              <p className="text-sm font-black">CLIENTE</p>
            </div>
            <div className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${perfil === 'tecnico' ? 'bg-white text-indigo-600 border-white' : 'bg-indigo-500/30 border-transparent hover:bg-indigo-500/50'}`} onClick={() => setPerfil('tecnico')}>
              <p className="text-xs font-bold uppercase mb-1">Perfil</p>
              <p className="text-sm font-black">TÉCNICO</p>
            </div>
          </div>
          <button onClick={onBackToLogin} className="text-xs font-bold hover:underline">Já tem conta? Entrar</button>
        </div>

        {/* Lado Direito - Formulário */}
        <div className="flex-1 p-8 md:p-10">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Cadastro</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <InputGroup id="nome" label="Nome Completo" icon={User} value={formData.nome} onChange={handleChange} placeholder="Seu nome" />
              <InputGroup id="email" label="Email Profissional" icon={Mail} value={formData.email} onChange={handleChange} placeholder="seu@email.com" type="email" />
              <InputGroup id="telefone" label="Telefone" icon={Phone} value={formData.telefone} onChange={handleChange} placeholder="923 000 000" />
              
              {perfil === 'cliente' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup id="empresa" label="Empresa" icon={Building2} value={formData.empresa} onChange={handleChange} placeholder="Nome da empresa" />
                    <InputGroup id="nif" label="NIF" icon={CreditCard} value={formData.nif} onChange={handleChange} placeholder="Número NIF" />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Configuração de Postos</label>
                      <button 
                        type="button" 
                        onClick={() => setListaPostos([...listaPostos, { id: '', nome: '' }])}
                        className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest"
                      >
                        + Adicionar Posto
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      {listaPostos.map((posto, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl relative group">
                          <InputGroup 
                            id={`p-id-${index}`} 
                            label={`ID Posto ${index + 1}`} 
                            icon={Cpu} 
                            value={posto.id} 
                            onChange={(e: any) => {
                              const nova = [...listaPostos];
                              nova[index].id = e.target.value;
                              setListaPostos(nova);
                            }} 
                            placeholder="ID" 
                          />
                          <InputGroup 
                            id={`p-nome-${index}`} 
                            label={`Nome Posto ${index + 1}`} 
                            icon={Monitor} 
                            value={posto.nome} 
                            onChange={(e: any) => {
                              const nova = [...listaPostos];
                              nova[index].nome = e.target.value;
                              setListaPostos(nova);
                            }} 
                            placeholder="Nome" 
                          />
                          {listaPostos.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => setListaPostos(listaPostos.filter((_, i) => i !== index))}
                              className="absolute -right-2 -top-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup id="password" label="Senha" icon={Lock} value={formData.password} onChange={handleChange} placeholder="••••••••" type="password" />
                <InputGroup id="confirmPassword" label="Confirmar" icon={Lock} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" type="password" />
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">{erro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {carregando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Criar Conta</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ id, label, icon: Icon, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        {type === 'password' ? (
          <CampoPassword
            id={id}
            value={value}
            onChange={onChange}
            required
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 focus:ring-0 transition-all text-sm font-medium text-gray-700 placeholder-gray-300"
            placeholder={placeholder}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            required
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 focus:ring-0 transition-all text-sm font-medium text-gray-700 placeholder-gray-300"
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}
