import { Usuario } from '../../../types/api';
import { list, QueryParams, update } from '../client';

export const perfilService = {
  listar: (params?: QueryParams) => list<Usuario>('/perfil', params),
  atualizar: (dados: Partial<Usuario>) => update<Usuario>('/perfil', dados),
  atualizarAvatar: (dados: { nome: string; avatar: File }) => {
    const formData = new FormData();
    formData.append('nome', dados.nome);
    formData.append('avatar_url', dados.avatar);
    return update<Usuario>('/perfil', formData);
  },
  async removerAvatar(nome: string) {
    // A API não documenta como limpar o avatar: tenta primeiro com texto vazio e depois com null.
    try {
      return await update<Usuario>('/perfil', { nome, avatar_url: '' });
    } catch (error: any) {
      if (error?.status !== 400) throw error;
      return update<Usuario>('/perfil', { nome, avatar_url: null });
    }
  },
  alterarSenha: (dados: { password_atual: string; password_nova: string }) =>
    update<void>('/perfil/password', dados),
};
