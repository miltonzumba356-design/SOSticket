import { Empresa } from '../../../types/api';
import { create, fetchAPI, list, QueryParams, update } from '../client';

export const empresasService = {
  listar: (params?: QueryParams) => list<Empresa>('/empresas', params),
  obterPorId: (id: string) => fetchAPI<Empresa>(`/empresas/${id}`),
  criar: (dados: Partial<Empresa>) => create<Empresa>('/empresas', dados),
  atualizar: (id: string, dados: Partial<Empresa>) => update<Empresa>(`/empresas/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Empresa>) => update<Empresa>(`/empresas/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/empresas/${id}`, { method: 'DELETE' }),
};
