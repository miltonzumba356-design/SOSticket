import { Usuario } from '../../../types/api';
import { list, QueryParams, update } from '../client';

export const perfilService = {
  listar: (params?: QueryParams) => list<Usuario>('/perfil', params),
  atualizar: (dados: Partial<Usuario>) => update<Usuario>('/perfil', dados),
  alterarSenha: (dados: { password_atual: string; password_nova: string }) =>
    update<void>('/perfil/password', dados),
};
