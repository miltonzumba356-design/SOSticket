import { Tecnico } from '../../../types/api';
import { create, fetchAPI, list, QueryParams, update } from '../client';

export const tecnicosService = {
  listar: (params?: QueryParams) => list<Tecnico>('/tecnicos', params),
  obterPorId: (id: string) => fetchAPI<Tecnico>(`/tecnicos/${id}`),
  criar: (dados: Partial<Tecnico> & { password?: string }) => create<Tecnico>('/tecnicos', dados),
  atualizar: (id: string, dados: Partial<Tecnico>) => update<Tecnico>(`/tecnicos/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Tecnico>) => update<Tecnico>(`/tecnicos/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/tecnicos/${id}`, { method: 'DELETE' }),
};
