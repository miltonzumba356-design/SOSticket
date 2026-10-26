import { Tarefa, TarefaRequest } from '../../../types/api';
import { create, fetchAPI, list, QueryParams, update } from '../client';

export const tarefasService = {
  listar: (params?: QueryParams) => list<Tarefa>('/tarefas', params),
  obterPorId: (id: string) => fetchAPI<Tarefa>(`/tarefas/${id}`),
  criar: (dados: TarefaRequest) => create<Tarefa>('/tarefas', dados),
  atualizar: (id: string, dados: Partial<TarefaRequest>) => update<Tarefa>(`/tarefas/${id}`, dados),
  atualizacaoParcial: (id: string, dados: Partial<TarefaRequest>) => update<Tarefa>(`/tarefas/${id}`, dados, 'PATCH'),
  deletar: (id: string) => fetchAPI<void>(`/tarefas/${id}`, { method: 'DELETE' }),
  atribuir: (id: string, atribuido_a_id: string) =>
    create(`/tarefas/${id}/atribuir`, { atribuido_a_id }),
  iniciar: (id: string) => update<Tarefa>(`/tarefas/${id}`, { estado: 'em_progresso' }, 'PATCH'),
  concluir: (id: string) => create(`/tarefas/${id}/concluir`, {}),
  cancelar: (id: string) => create(`/tarefas/${id}/cancelar`, {}),
  listarComentarios: (id: string) => fetchAPI(`/tarefas/${id}/comentarios`),
  adicionarComentario: (id: string, texto: string) => create(`/tarefas/${id}/comentarios`, { texto }),
  carregarAnexo: (id: string, dados: File | { arquivo: File | File[]; descricao?: string }) => {
    const formData = new FormData();
    const arquivos = dados instanceof File ? [dados] : ([] as File[]).concat(dados.arquivo);
    // A documentação da API refere o campo ora como `arquivo`, ora como `ficheiro`; envia-se ambos.
    arquivos.forEach((arquivo) => {
      formData.append('arquivo', arquivo);
      formData.append('ficheiro', arquivo);
    });
    if (!(dados instanceof File) && dados.descricao) formData.append('descricao', dados.descricao);
    return create(`/tarefas/${id}/anexos`, formData);
  },
};
