import { InicioSessao, RespostaPaginada, Usuario } from '../../../types/api';
import { create, fetchAPI, getToken, persistAuthTokens, usuarioFromToken } from '../client';

export const authService = {
  async login(email: string, password: string): Promise<InicioSessao> {
    const response = await fetchAPI<InicioSessao>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    persistAuthTokens(response);
    return response;
  },

  async logout(): Promise<void> {
    try {
      await fetchAPI<void>('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async refresh(): Promise<InicioSessao> {
    const refresh = localStorage.getItem('refresh_token');
    const response = await fetchAPI<InicioSessao>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    });
    persistAuthTokens(response);
    return response;
  },

  async register(dados: Partial<Usuario> & { password?: string; empresa?: string }): Promise<Usuario> {
    return create<Usuario>('/auth/register', dados);
  },

  async recuperar(email: string): Promise<{ email: string }> {
    return create<{ email: string }>('/recuperar', { email });
  },

  async resetPassword(new_password: string): Promise<void> {
    return create<void>('/reset-password', { new_password });
  },

  async alterarSenha(password_atual: string, password_nova: string): Promise<void> {
    return create<void>('/auth/reset-password', { password_atual, password_nova });
  },

  async getProfile(preferredEmail?: string): Promise<Usuario> {
    let response: RespostaPaginada<Usuario> | Usuario;
    const tokenUser = usuarioFromToken(getToken());
    const email = preferredEmail || tokenUser?.email || localStorage.getItem('auth_user_email') || undefined;

    try {
      response = await fetchAPI<RespostaPaginada<Usuario> | Usuario>('/perfil');
    } catch (error: any) {
      if (error?.status !== 404) throw error;
      response = await fetchAPI<RespostaPaginada<Usuario> | Usuario>('/auth/register');
    }

    if (Array.isArray((response as RespostaPaginada<Usuario>).results)) {
      const results = (response as RespostaPaginada<Usuario>).results || [];
      const matchedByEmail = email ? results.find((user) => user.email?.toLowerCase() === email.toLowerCase()) : undefined;
      const matchedByTokenId = tokenUser?.id ? results.find((user) => user.id === tokenUser.id) : undefined;
      const matchedByRole = tokenUser?.perfil ? results.find((user) => user.perfil === tokenUser.perfil) : undefined;
      const selected = matchedByEmail || matchedByTokenId || matchedByRole || results[0] || tokenUser;

      if (!selected) throw new Error('Perfil do utilizador não encontrado.');
      return selected as Usuario;
    }
    return { ...tokenUser, ...(response as Usuario) } as Usuario;
  },
};
