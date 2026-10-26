import { Intervencao } from '../../../types/api';
import { create, fetchAPI, list, QueryParams, update } from '../client';

export const intervencoesService = {
  listar: (params?: QueryParams) => list<Intervencao>('/intervencoes', params),
  obterPorId: (id: string) => fetchAPI<Intervencao>(`/intervencoes/${id}`),
  criar: (dados: {
    titulo: string;
    descricao: string;
    cliente_id?: string;
    contrato_id?: string;
    prioridade: string;
    tipo_pagamento?: string;
    tipo_intervencao?: string;
    actuacao_tipo?: string;
    anexos?: File[];
  }) => {
    const formData = new FormData();
    formData.append('titulo', dados.titulo);
    formData.append('descricao', dados.descricao);
    if (dados.cliente_id) formData.append('cliente_id', dados.cliente_id);
    if (dados.contrato_id) formData.append('contrato_id', dados.contrato_id);
    formData.append('prioridade', dados.prioridade);
    dados.anexos?.forEach((file) => {
      formData.append('anexos', file);
    });
    return create<Intervencao>('/intervencoes', formData);
  },
  atualizar: (id: string, dados: Partial<Intervencao>) => update<Intervencao>(`/intervencoes/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<Intervencao>) => update<Intervencao>(`/intervencoes/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/intervencoes/${id}`, { method: 'DELETE' }),
  adicionarComentario: (id: string, dados: { texto: string; visivel_cliente?: boolean }) =>
    create(`/intervencoes/${id}/comentarios`, dados),
  carregarAnexo: (id: string, dados: File | { ficheiro?: File; arquivo?: File; descricao?: string }) => {
    const formData = new FormData();
    const ficheiro = dados instanceof File ? dados : dados.ficheiro || dados.arquivo;

    if (ficheiro) formData.append('ficheiro', ficheiro);
    if (!(dados instanceof File) && dados.descricao) formData.append('descricao', dados.descricao);

    return create(`/intervencoes/${id}/anexos`, formData);
  },
  atribuirTecnico: (id: string, tecnico_id: string) =>
    create(`/intervencoes/${id}/atribuir`, { tecnico_id }),
};
