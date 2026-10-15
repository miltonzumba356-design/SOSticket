import { Cliente, ClienteRequest } from '../../../types/api';
import { create, fetchAPI, list, QueryParams, update } from '../client';

export const clientesService = {
  listar: (params?: QueryParams) => list<Cliente>('/clientes', params),
  obterPorId: (id: string) => fetchAPI<Cliente>(`/clientes/${id}`),
  criar: (dados: ClienteRequest) => create<Cliente>('/clientes', dados),
  atualizar: (id: string, dados: Partial<ClienteRequest>) => update<Cliente>(`/clientes/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<ClienteRequest>) => update<Cliente>(`/clientes/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/clientes/${id}`, { method: 'DELETE' }),
};
