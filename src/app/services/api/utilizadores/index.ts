import { Usuario } from '../../../types/api';
import { ApiError, create, fetchAPI, update } from '../client';
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
        const atual = porId.get(String(item.id));
        // A função já conhecida nunca é substituída: as listas de técnicos e clientes só
        // servem de valor por defeito quando a função não vem indicada.
        porId.set(String(item.id), { ...atual, ...item, perfil: atual?.perfil || item.perfil || perfilPadrao });
      });
    };

    adicionar(extrairLista(gerais));
    adicionar(extrairLista(tecnicos), 'tecnico');
    adicionar(extrairLista(clientes), 'cliente');

    return Array.from(porId.values()).filter((utilizador) => !utilizador.is_deleted);
  },

  /**
   * O servidor em produção rejeita `POST /auth/register/` (só aceita GET), apesar de a documentação o
   * listar. Técnicos e clientes são por isso criados nas suas rotas próprias, que aceitam POST;
   * só os administradores dependem de `/auth/register/`.
   */
  async criar(dados: NovoUtilizador): Promise<Usuario> {
    if (dados.perfil === 'tecnico') {
      return tecnicosService.criar({
        nome: dados.nome,
        email: dados.email,
        password: dados.password,
        telefone: dados.telefone,
        especialidades: dados.especialidades,
        data_contratacao: dados.data_contratacao,
        status: dados.status,
      } as any) as Promise<Usuario>;
    }

    if (dados.perfil === 'cliente') {
      return clientesService.criar({
        nome: dados.nome,
        email: dados.email,
        password: dados.password,
        telefone: dados.telefone,
        empresa: dados.empresa,
        status: dados.status,
      }) as Promise<Usuario>;
    }

    try {
      return await create<Usuario>('/auth/register', dados);
    } catch (error: any) {
      if (error?.status === 405) {
        throw new ApiError(
          405,
          'O servidor não permite criar administradores: a rota POST /api/v1/auth/register/ só aceita GET. É preciso ativá-la no backend.',
          error.data
        );
      }
      throw error;
    }
  },

  // A documentação da API ainda não tem este pedido: o servidor responde 404/405 até ser criado.
  alterarFuncao: (id: string, perfil: FuncaoUtilizador) =>
    update<Usuario>(`/auth/${id}/register`, { perfil }, 'PATCH'),

  eliminar: (id: string) => fetchAPI<void>(`/auth/${id}/register`, { method: 'DELETE' }),
};
