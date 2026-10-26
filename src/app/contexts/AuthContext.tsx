import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService } from '../services/api';

// Tipos de usuÃ¡rio conforme a API
type TipoPerfil = 'admin' | 'tecnico' | 'cliente';

// Interface do usuÃ¡rio autenticado
interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: TipoPerfil;
  telefone?: string;
  avatar_url?: string;
}

// Interface do contexto de autenticaÃ§Ã£o
interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  carregando: boolean;
  register: (dados: any) => Promise<void>;
  atualizarUsuario: (dados: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function normalizarUsuario(dadosUsuario: any, emailFallback?: string): Usuario {
  return {
    id: dadosUsuario?.id || emailFallback || 'temp-id',
    nome: dadosUsuario?.nome || dadosUsuario?.first_name || dadosUsuario?.username || emailFallback?.split('@')[0] || 'Utilizador',
    email: dadosUsuario?.email || emailFallback || '',
    perfil: dadosUsuario?.perfil || dadosUsuario?.role || 'cliente',
    telefone: dadosUsuario?.telefone,
    avatar_url: dadosUsuario?.avatar_url,
  };
}

function tokenExpirado(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function limparSessaoLocal() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_user_email');
}

// Provider do contexto de autenticaÃ§Ã£o
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Verifica se hÃ¡ token salvo ao carregar a aplicaÃ§Ã£o
  useEffect(() => {
    const carregarUsuario = async () => {
      const tokenSalvo = localStorage.getItem('auth_token');
      const usuarioSalvo = localStorage.getItem('auth_user');

      if (tokenSalvo) {
        if (tokenExpirado(tokenSalvo) || !usuarioSalvo) {
          limparSessaoLocal();
          setToken(null);
          setUsuario(null);
          setCarregando(false);
          return;
        }

        setToken(tokenSalvo);

        try {
          setUsuario(JSON.parse(usuarioSalvo));
        } catch {
          limparSessaoLocal();
          setToken(null);
          setUsuario(null);
          setCarregando(false);
          return;
        }

        try {
          // Busca perfil do usuÃ¡rio usando o token
          const perfil = await authService.getProfile(localStorage.getItem('auth_user_email') || undefined);

          if (perfil) {
            const usuarioNormalizado = normalizarUsuario(perfil);
            setUsuario(usuarioNormalizado);
            localStorage.setItem('auth_user', JSON.stringify(usuarioNormalizado));
            localStorage.setItem('auth_user_email', usuarioNormalizado.email);
          }
        } catch {
          // Sessão expirada/inválida antes do login: limpa sem poluir o console.
          limparSessaoLocal();
          setToken(null);
          setUsuario(null);
        }
      }

      setCarregando(false);
    };

    carregarUsuario();
  }, []);

  // FunÃ§Ã£o de login - chama API /api/v1/auth/login
  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      
      // Extrai o token da resposta
      const tokenRecebido = response.access_token || response.access || response.token || (response.data?.access_token);
      setToken(tokenRecebido);

      // Tenta extrair o usuÃ¡rio da resposta
      let dadosUsuario = response.usuario || response.user || response.profile || response.data?.usuario;

      // Se nÃ£o houver dados do usuÃ¡rio na resposta do login, busca o perfil explicitamente
      if (!dadosUsuario) {
        try {
          dadosUsuario = await authService.getProfile(email);
        } catch (perfilError) {
          console.error('Login bem sucedido mas falha ao obter perfil:', perfilError);
        }
      }

      if (dadosUsuario) {
        const usuarioNormalizado = normalizarUsuario(dadosUsuario, email);
        setUsuario(usuarioNormalizado);
        localStorage.setItem('auth_user', JSON.stringify(usuarioNormalizado));
        localStorage.setItem('auth_user_email', usuarioNormalizado.email);
      } else {
        // Fallback caso realmente nÃ£o consiga nada, mas tenha token
        // Isso evita ficar preso na tela de login se o token for vÃ¡lido
        const usuarioFallback = {
          id: 'temp-id',
          nome: email.split('@')[0],
          email: email,
          perfil: 'cliente',
        } as Usuario;
        setUsuario(usuarioFallback);
        localStorage.setItem('auth_user', JSON.stringify(usuarioFallback));
        localStorage.setItem('auth_user_email', email);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  // FunÃ§Ã£o de logout - chama API /api/v1/auth/logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setUsuario(null);
      setToken(null);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_user_email');
    }
  };

  // Atualiza o utilizador em memória e no armazenamento local (ex.: nova foto de perfil)
  const atualizarUsuario = (dados: Partial<Usuario>) => {
    setUsuario((atual) => {
      if (!atual) return atual;
      const atualizado = { ...atual, ...dados };
      localStorage.setItem('auth_user', JSON.stringify(atualizado));
      return atualizado;
    });
  };

  // FunÃ§Ã£o de cadastro - chama API /api/v1/auth/register
  const register = async (dados: any) => {
    try {
      await authService.register(dados);
      // Opcional: fazer login automÃ¡tico apÃ³s cadastro
      // await login(dados.email, dados.password);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      token,
      login,
      logout,
      register,
      atualizarUsuario,
      isAuthenticated: !!usuario,
      carregando,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto de autenticaÃ§Ã£o
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
