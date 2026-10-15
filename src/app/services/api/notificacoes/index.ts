import { Notificacao } from '../../../types/api';
import { fetchAPI, list, QueryParams, update } from '../client';

export const notificacoesService = {
  listar: (params?: QueryParams) => list<Notificacao>('/notificacoes', params),
  obterPorId: (id: string) => fetchAPI<Notificacao>(`/notificacoes/${id}`),
  async marcarLida(id: string) {
    return update<Notificacao>(`/notificacoes/${id}`, {}, 'PUT');
  },
  marcarTodasLidas: () =>
    update<Notificacao>('/notificacoes/marcar-todas-lidas', {
      tipo: 'sistema',
      titulo: 'Marcar notificações como lidas',
      mensagem: 'Marcar todas as notificações como lidas',
      lida: true,
    }, 'PUT'),
};
