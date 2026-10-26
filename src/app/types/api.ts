export type TipoPerfil = 'admin' | 'tecnico' | 'cliente';
export type StatusUtilizador = 'activo' | 'inactivo';
export type StatusContrato = 'activo' | 'ativo' | 'expirado' | 'cancelado';
export type TipoPagamento = 'horas' | 'mensal' | 'anual';
export type TipoContrato =
  | 'assistencia tecnica'
  | 'suporte'
  | 'instalação'
  | 'manutencao preventiva'
  | 'manutencao corretiva'
  | 'servico avulso'
  | 'outros'
  | 'anual';
export type StatusIntervencao = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado' | 'concluido';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';
export type TipoAtendimento = 'presencial' | 'remoto';

export interface RespostaPaginada<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
  data?: any;
  pagination?: {
    total_pages?: number;
    current_page?: number;
    total_items?: number;
  };
  total_pages?: number;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: TipoPerfil;
  telefone?: string;
  empresa?: string | Empresa;
  ID_POSTOS?: string;
  postos?: Record<string, unknown>;
  nif?: string;
  ip_servidor?: string;
  endereco?: string;
  avatar_url?: string;
  preferencias?: Record<string, unknown>;
  especialidades?: unknown;
  data_contratacao?: string | null;
  status?: StatusUtilizador;
  is_deleted?: boolean;
  data_criacao?: string;
}

export interface InicioSessao {
  access?: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  token?: string;
  usuario?: Usuario;
  user?: Usuario;
  profile?: Usuario;
  data?: any;
}

export interface Cliente extends Usuario {
  perfil: 'cliente';
  empresa?: string | Empresa;
  ID_POSTOS?: string;
  nif?: string;
  endereco?: string;
  ip_servidor?: string;
  postos?: Record<string, { Id?: string; Nome?: string; id?: string; nome?: string }>;
  status?: StatusUtilizador;
  contratos_ativos?: number | string;
  intervencoes_abertas?: number | string;
}

export interface ClienteRequest {
  nome: string;
  email: string;
  password?: string;
  perfil?: TipoPerfil;
  empresa?: string;
  ID_POSTOS?: string;
  telefone?: string;
  nif?: string;
  ip_servidor?: string;
  endereco?: string;
  postos?: Record<string, unknown>;
  status?: StatusUtilizador;
}

export interface Tecnico extends Usuario {
  perfil: 'tecnico';
  especialidades?: string[];
  status?: StatusUtilizador;
  intervencoes_ativas?: number | string;
  total_horas_mes?: number | string;
  data_contratacao?: string | null;
  historico_intervencoes?: Record<string, unknown>[];
}

export interface Contrato {
  id: string;
  numero?: string;
  empresa_id?: string;
  empresa?: string | Empresa;
  empresa_detalhe?: Empresa;
  cliente_id?: string;
  cliente_nome?: string;
  cliente?: string | Cliente;
  tipo?: TipoPagamento;
  tipo_contrato?: TipoContrato;
  tipo_de_pagamento?: TipoPagamento;
  descricao_contrato?: string;
  horas_contratadas?: number | string;
  horas_utilizadas?: number | string;
  horas_disponiveis?: number | string;
  valor_total?: number | string;
  valor_hora?: number | string;
  data_inicio: string;
  data_fim: string;
  status?: StatusContrato;
  observacoes?: string;
  intervencoes?: Array<Record<string, unknown>>;
}

export interface Empresa {
  id: string;
  nome?: string;
  Email_empresa?: string;
  email?: string;
  telefone?: string;
  nif?: string;
  endereco?: string;
  descricao?: string;
  postos?: Record<string, unknown>;
  status?: StatusUtilizador;
  data_criacao?: string;
  data_actualizacao?: string;
  [key: string]: unknown;
}

export interface Intervencao {
  id: string;
  numero?: string;
  titulo: string;
  descricao: string;
  actuacao_tipo?: TipoAtendimento;
  tipo_pagamento?: TipoPagamento;
  tipo_intervencao?: TipoContrato;
  cliente_id?: string;
  cliente_nome?: string;
  tecnico_id?: string | null;
  tecnico_nome?: string | null;
  contrato_id?: string | null;
  status?: StatusIntervencao;
  estado?: StatusContrato;
  sla?: string;
  prioridade?: Prioridade;
  horas_trabalhadas?: number | string;
  data_inicio_intervencao?: string | null;
  data_fim_intervencao?: string | null;
  data_abertura?: string;
  data_conclusao?: string | null;
  anexos?: any[];
  total_anexos?: number | string;
  total_comentarios?: number | string;
  cliente?: string | Cliente;
  tecnico?: string | Tecnico;
  contrato?: string | Contrato;
  historico_status?: any[];
  comentario?: any[];
  comentarios?: any[];
}

export type EstadoTarefa = 'pendente' | 'em_progresso' | 'concluida' | 'cancelada' | 'expirado';

export interface PrazoTarefa {
  total_horas: number;
  restantes_horas: number;
  expirado: boolean;
}

export interface Tarefa {
  id: string;
  numero?: string;
  titulo: string;
  descricao: string;
  estado?: EstadoTarefa;
  prioridade?: Prioridade;
  atribuido_a?: { id: string; nome?: string; email?: string } | null;
  criado_por?: { id: string; nome?: string; email?: string } | null;
  intervencao?: Record<string, unknown> | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  prazo?: PrazoTarefa | null;
  data_conclusao?: string | null;
  data_criacao?: string;
}

export interface TarefaRequest {
  titulo?: string;
  descricao?: string;
  estado?: EstadoTarefa;
  prioridade?: Prioridade;
  atribuido_a_id?: string | null;
  intervencao_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  data_conclusao?: string | null;
}

export interface HoraTrabalho {
  id: string;
  intervencao?: string;
  intervencao_id?: string;
  intervencao_numero?: string;
  intervencao_titulo?: string;
  tecnico?: string;
  tecnico_id?: string;
  tecnico_nome?: string;
  cliente_nome?: string;
  horas: number | string;
  data_trabalho: string;
  descricao: string;
  tipo: TipoAtendimento;
}

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida?: boolean;
  is_deleted?: boolean;
  data_criacao?: string;
}

export interface PausaCronometro {
  inicio: string;
  fim?: string | null;
  duracao: number;
}

export interface SessaoCronometro {
  id: string;
  intervencao_id: string;
  intervencao_numero?: string;
  intervencao_titulo?: string;
  cliente_nome?: string;
  tipo: TipoAtendimento;
  status: 'ativo' | 'pausado';
  hora_inicio: string;
  tempo_acumulado: number;
  pausas?: PausaCronometro[];
}

export interface CronometroState extends SessaoCronometro {
  tempoAtual?: number;
}
