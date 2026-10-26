import { Contrato } from '../../../types/api';
import { create, fetchAPI, fetchFile, list, QueryParams, update } from '../client';

function normalizeContrato(contrato: any): Contrato {
  if (!contrato || typeof contrato !== 'object') return contrato;

  return {
    ...contrato,
    cliente_id: contrato.cliente_id || contrato.empresa_id,
    cliente_nome: contrato.cliente_nome || contrato.empresa || contrato.empresa_detalhe?.nome,
    cliente: contrato.cliente || contrato.empresa_detalhe || contrato.empresa,
    tipo: contrato.tipo || contrato.tipo_de_pagamento,
  };
}

function normalizeContratoResponse<T>(response: T): T {
  const data: any = response;

  if (Array.isArray(data)) {
    return data.map(normalizeContrato) as T;
  }

  if (data && typeof data === 'object') {
    if (Array.isArray(data.results)) {
      return { ...data, results: data.results.map(normalizeContrato) } as T;
    }

    if (Array.isArray(data.data)) {
      return { ...data, data: data.data.map(normalizeContrato) } as T;
    }

    if (Array.isArray(data.data?.results)) {
      return {
        ...data,
        data: {
          ...data.data,
          results: data.data.results.map(normalizeContrato),
        },
      } as T;
    }

    return normalizeContrato(data) as T;
  }

  return response;
}

function contratoPayload(dados: Partial<Contrato> & { cliente_id?: string; empresa_id?: string }, usarPadroes = false) {
  const {
    cliente,
    cliente_id,
    cliente_nome,
    empresa,
    empresa_detalhe,
    empresa_id,
    expiracao,
    horas_disponiveis,
    horas_utilizadas,
    intervencoes,
    numero,
    tipo,
    valor_hora,
    ...rest
  } = dados as any;

  const payload: any = {
    ...rest,
    empresa_id: empresa_id || cliente_id,
  };

  const tipoPagamento = dados.tipo_de_pagamento || tipo;
  if (tipoPagamento || usarPadroes) payload.tipo_de_pagamento = tipoPagamento || 'horas';
  if (dados.tipo_contrato || usarPadroes) payload.tipo_contrato = dados.tipo_contrato || 'suporte';
  if (!payload.descricao_contrato && usarPadroes) {
    payload.descricao_contrato = payload.observacoes || 'Contrato de suporte técnico.';
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
}

export const contratosService = {
  async listar(params?: QueryParams) {
    const response = await list<Contrato>('/contratos', params);
    return normalizeContratoResponse(response);
  },
  async obterPorId(id: string) {
    const response = await fetchAPI<Contrato>(`/contratos/${id}`);
    return normalizeContrato(response);
  },
  async criar(dados: Partial<Contrato> & { cliente_id?: string; empresa_id?: string }) {
    const response = await create<Contrato>('/contratos', contratoPayload(dados, true));
    return normalizeContrato(response);
  },
  async atualizar(id: string, dados: Partial<Contrato>) {
    const response = await update<Contrato>(`/contratos/${id}`, contratoPayload(dados));
    return normalizeContrato(response);
  },
  async atualizacaoParcial(id: string, dados: Partial<Contrato>) {
    const response = await update<Contrato>(`/contratos/${id}`, contratoPayload(dados), 'PATCH');
    return normalizeContrato(response);
  },
  baixarPdf: (id: string) => fetchFile(`/contratos/${id}/pdf`),
  deletar: (id: string) => fetchAPI<void>(`/contratos/${id}`, { method: 'DELETE' }),
};
