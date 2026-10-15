import { list, QueryParams, update } from '../client';

export const configuracoesService = {
  listar: (params?: QueryParams) => list('/configuracoes', params),
  atualizar: (dados: unknown) => update('/configuracoes', dados),
};
