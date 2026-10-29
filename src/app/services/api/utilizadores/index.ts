import { Usuario } from '../../../types/api';
import { create, fetchAPI, update } from '../client';
import { clientesService } from '../clientes';
import { tecnicosService } from '../tecnicos';

export type FuncaoUtilizador = 'admin' | 'tecnico' | 'cliente';

export interface NovoUtilizador {
  nome: string;
  email: string;
  password: string;
  perfil: FuncaoUtilizador;
  telefone?: string;
  status?: 'activo' | 'inactivo';
  // Técnico
  especialidades?: string[];
  data_contratacao?: string | null;
  // Cliente
  empresa?: string;
}

function extrairLista(resposta: any): any[] {
  if (Array.isArray(resposta)) return resposta;
  const interna = resposta?.results || resposta?.data?.results || resposta?.data;
  if (Array.isArray(interna)) return interna;
  return resposta && typeof resposta === 'object' && resposta.id ? [resposta] : [];
}

export const utilizadoresService = {
  /** Junta administradores, técnicos e clientes numa só lista, sem repetidos. */
  async listar(): Promise<Usuario[]> {
    const [gerais, tecnicos, clientes] = await Promise.all([
      fetchAPI<any>('/auth/register').catch(() => []),
      tecnicosService.listar({ limit: 500 }).catch(() => []),
      clientesService.listar({ limit: 500 }).catch(() => []),
    ]);

    const porId = new Map<string, Usuario>();
    const adicionar = (itens: any[], perfilPadrao?: FuncaoUtilizador) => {
      itens.forEach((item) => {
        if (!item?.id) return;
        porId.set(String(item.id), { ...porId.get(String(item.id)), ...item, perfil: item.perfil || perfilPadrao });
      });
    };

    adicionar(extrairLista(gerais));
    adicionar(extrairLista(tecnicos), 'tecnico');
    adicionar(extrairLista(clientes), 'cliente');

    return Array.from(porId.values()).filter((utilizador) => !utilizador.is_deleted);
  },

  criar: (dados: NovoUtilizador) => create<Usuario>('/auth/register', dados),

  // A documentação da API ainda não tem este pedido: o servidor responde 404/405 até ser criado.
  alterarFuncao: (id: string, perfil: FuncaoUtilizador) =>
    update<Usuario>(`/auth/${id}/register`, { perfil }, 'PATCH'),

  eliminar: (id: string) => fetchAPI<void>(`/auth/${id}/register`, { method: 'DELETE' }),
};
