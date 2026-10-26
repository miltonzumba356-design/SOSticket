import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Ticket,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  DollarSign,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Printer
} from 'lucide-react';
import { intervencoesService, relatoriosService, contratosService } from '../services/api';
import { Intervencao, Contrato } from '../types/api';
import { formatarHoras } from '../utils/formatters';
import { criarPdfRelatorio, PdfMetric, PdfTable } from '../utils/pdfRelatorio';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

function getEmpresaId(empresa: unknown) {
  if (!empresa || typeof empresa === 'string') return undefined;
  return (empresa as { id?: string }).id;
}


// Componente de card estatístico
function StatCard({
  titulo,
  valor,
  icon: Icon,
  cor,
  subtitulo,
  tendencia,
  carregando,
  actions
}: {
  titulo: string;
  valor: string | number;
  icon: any;
  cor: string;
  subtitulo?: string;
  tendencia?: { valor: string, tipo: 'up' | 'down' };
  carregando?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${cor} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${cor.replace('bg-', 'text-')}`} />
        </div>
        <div className="flex items-center gap-2">
          {tendencia && (
            <div className={`flex items-center gap-1 text-xs font-medium ${tendencia.tipo === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
              {tendencia.tipo === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {tendencia.valor}
            </div>
          )}
          {actions}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{titulo}</p>
        {carregando ? (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{valor}</p>
        )}
        {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
      </div>
    </div>
  );
}

function ActionMenu({
  id,
  activeId,
  setActiveId,
  items,
}: {
  id: string;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  items: Array<{ label: string; onClick: () => void; danger?: boolean }>;
}) {
  const aberto = activeId === id;

  return (
    <div className="relative">
      <button
        onClick={(event) => {
          event.stopPropagation();
          setActiveId(aberto ? null : id);
        }}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {aberto && (
        <div className="absolute right-0 top-9 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[80] overflow-hidden">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(event) => {
                event.stopPropagation();
                setActiveId(null);
                item.onClick();
              }}
              className={`w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-gray-50 ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Dados mock para os gráficos
const dadosStatusBase = [
  { chave: 'aberto', name: 'Abertas', total: 0, fill: '#2563eb' },
  { chave: 'em_andamento', name: 'Em andamento', total: 0, fill: '#f59e0b' },
  { chave: 'resolvido', name: 'Resolvidas', total: 0, fill: '#10b981' },
  { chave: 'fechado', name: 'Fechadas', total: 0, fill: '#64748b' },
  { chave: 'concluido', name: 'Concluídas', total: 0, fill: '#7c3aed' },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function mesLabel(data: Date) {
  return data.toLocaleDateString('pt-PT', { month: 'short' });
}

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response) ? response : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

function intervencoesPorStatus(intervencoes: Intervencao[]) {
  const status = dadosStatusBase.map((item) => ({ ...item }));

  intervencoes.forEach((intervencao) => {
    const item = status.find((statusItem) => statusItem.chave === intervencao.status);
    if (item) item.total += 1;
  });

  return status.map(({ name, total, fill }) => ({ name, total, fill }));
}

function serieMensalContratos(contratos: Contrato[]) {
  const hoje = new Date();
  const meses = Array.from({ length: 6 }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - index), 1);
    return {
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
      month: mesLabel(data),
      receita: 0,
    };
  });

  contratos.forEach((contrato) => {
    const data = contrato.data_inicio ? new Date(contrato.data_inicio) : null;
    if (!data || Number.isNaN(data.getTime())) return;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const item = meses.find((mes) => mes.chave === chave);
    if (item) item.receita += Number(contrato.valor_total || 0);
  });

  return meses.map(({ month, receita }) => ({ month, receita }));
}

function serieMensalIntervencoes(intervencoes: Intervencao[], dadosDashboard: any) {
  const apiSeries = (dadosDashboard?.grafico_intervencoes_mes || []).map((item: any) => ({
    date: item.mes ? new Date(item.mes).toLocaleDateString('pt-PT', { month: 'short' }) : 'Sem data',
    total: Number(item.total || 0),
  }));
  if (apiSeries.length) return apiSeries;

  const hoje = new Date();
  const meses = Array.from({ length: 6 }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - index), 1);
    return {
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
      date: mesLabel(data),
      total: 0,
    };
  });

  intervencoes.forEach((intervencao) => {
    const data = intervencao.data_abertura ? new Date(intervencao.data_abertura) : null;
    if (!data || Number.isNaN(data.getTime())) return;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const item = meses.find((mes) => mes.chave === chave);
    if (item) item.total += 1;
  });

  return meses.map(({ date, total }) => ({ date, total }));
}

export function Dashboard({ onNavigate }: { onNavigate?: (pagina: string) => void }) {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';
  const isTecnico = usuario?.perfil === 'tecnico';
  const isCliente = usuario?.perfil === 'cliente';
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [contratosExpira, setContratosExpira] = useState<Contrato[]>([]);
  const [contratosDashboard, setContratosDashboard] = useState<Contrato[]>([]);
  const [dadosDashboard, setDadosDashboard] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const carregarDados = async () => {
    setCarregando(true);
    setErro('');

    try {
      // Carregar dados em paralelo, mas tratar erros individualmente
      const [respIntervencoes, respDashboard, respContratos] = await Promise.all([
        intervencoesService.listar({
          limit: 100,
          ...(isTecnico ? { tecnico_id: usuario?.id } : {}),
          ...(isCliente ? { cliente_id: usuario?.id } : {})
        }).catch(err => {
          console.error('Erro ao carregar intervenções:', err);
          return [];
        }),
        (isAdmin
          ? relatoriosService.dashboardAdmin()
          : isTecnico
            ? relatoriosService.dashboardTecnico()
            : isCliente
              ? relatoriosService.dashboardCliente()
              : Promise.resolve(null)).catch(err => {
          console.error('Erro ao carregar dados do dashboard:', err);
          return null;
        }),
        (isAdmin || isCliente
          ? contratosService.listar({
            limit: 100,
            ...(isCliente ? { empresa_id: getEmpresaId(usuario?.empresa) } : {})
          })
          : Promise.resolve(null)).catch(err => {
          console.error('Erro ao carregar contratos:', err);
          return null;
        })
      ]);

      // Extração simplificada de dados
      const intervencoesData = normalizarLista<Intervencao>(respIntervencoes);
      setIntervencoes(intervencoesData);
      
      const dashData = respDashboard?.data || respDashboard || {};
      setDadosDashboard(dashData);

      if (respContratos) {
        const contractsData = normalizarLista<Contrato>(respContratos);
        setContratosDashboard(contractsData);
        const expira = contractsData.filter((c: any) => {
          if (c.status && !['activo', 'ativo'].includes(c.status)) return false;
          if (!c.data_fim) return false;
          const dataFim = new Date(c.data_fim);
          const hoje = new Date();
          const diasParaExpirar = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          return diasParaExpirar <= 30 && diasParaExpirar > 0;
        });
        setContratosExpira(expira);
      }
    } catch (err: any) {
      console.error('Erro detalhado ao carregar dashboard:', err);
      setErro(err.message || 'Erro ao carregar dados do dashboard. Por favor, verifique sua conexão ou tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuario?.perfil]);

  const tituloDashboard = isAdmin ? 'Dashboard Administrativo' : isTecnico ? 'Dashboard do Técnico' : 'Painel do Cliente';
  const subtituloDashboard = isAdmin 
    ? 'Visão geral do sistema e métricas de desempenho.' 
    : isTecnico 
      ? 'Acompanhe as suas intervenções e produtividade.' 
      : 'Estado dos seus contratos e pedidos de suporte.';
  const dadosIntervencoesStatus = intervencoesPorStatus(intervencoes);
  const dadosHorasTecnico = (dadosDashboard?.grafico_horas_tecnico || []).map((item: any) => ({
    name: item.tecnico__nome || 'Sem técnico',
    value: Number(item.total || 0),
  }));
  const receitaMensal = Array.isArray(dadosDashboard?.receita_historico) && dadosDashboard.receita_historico.length
    ? dadosDashboard.receita_historico
    : serieMensalContratos(contratosDashboard);
  const evolucaoIntervencoes = serieMensalIntervencoes(intervencoes, isAdmin ? dadosDashboard : null);
  const ultimasIntervencoes = intervencoes.slice(0, 5);

  const periodoAtual = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const menu = (id: string, items: Array<{ label: string; onClick: () => void; danger?: boolean }>) => (
    <ActionMenu id={id} activeId={menuAberto} setActiveId={setMenuAberto} items={items} />
  );
  const atualizarItem = { label: 'Atualizar dados', onClick: carregarDados };
  // O PDF do dashboard segue o mesmo modelo do relatório geral: cabeçalho, cartões de métricas e tabelas.
  const criarPdfDashboard = () => {
    const metricas: PdfMetric[] = isAdmin
      ? [
          { label: 'Clientes', value: dadosDashboard?.total_clientes ?? dadosDashboard?.clientes_total ?? dadosDashboard?.clientes ?? 0, sub: 'Total registado' },
          { label: 'Contratos ativos', value: dadosDashboard?.total_contratos_ativos ?? dadosDashboard?.contratos_ativos ?? dadosDashboard?.contratos ?? 0, sub: 'Status ativo' },
          { label: 'Intervenções abertas', value: dadosDashboard?.intervencoes_abertas ?? dadosDashboard?.tickets_abertos ?? dadosDashboard?.total_intervencoes ?? 0, sub: 'Em aberto' },
          { label: 'Receita total', value: `${Number(dadosDashboard?.receita_total ?? dadosDashboard?.total_receita ?? 0).toLocaleString()} Kz`, sub: 'Todos os contratos' },
        ]
      : isCliente
        ? [
            { label: 'Contratos ativos', value: dadosDashboard?.contratos_ativos ?? 0, sub: 'Status ativo' },
            { label: 'Horas disponíveis', value: formatarHoras(dadosDashboard?.total_horas_disponiveis), sub: 'Nos contratos' },
            { label: 'Tickets abertos', value: dadosDashboard?.intervencoes_abertas ?? 0, sub: 'Em aberto' },
            { label: 'Concluídas (mês)', value: dadosDashboard?.intervencoes_concluidas ?? 0, sub: periodoAtual },
          ]
        : [
            { label: 'Meus tickets', value: dadosDashboard?.intervencoes_atribuidas ?? 0, sub: 'Atribuídos' },
            { label: 'Em andamento', value: dadosDashboard?.intervencoes_em_andamento ?? 0, sub: 'Neste momento' },
            { label: 'Concluído (mês)', value: dadosDashboard?.intervencoes_concluidas_mes ?? 0, sub: periodoAtual },
            { label: 'Horas trabalhadas', value: formatarHoras(dadosDashboard?.total_horas_mes), sub: periodoAtual },
          ];

    const tabelas: PdfTable[] = [
      { titulo: 'Intervenções por status', colunas: ['Status', 'Total'], linhas: dadosIntervencoesStatus.map((item) => [item.name, item.total]) },
      { titulo: 'Evolução de intervenções', colunas: ['Mês', 'Total'], linhas: evolucaoIntervencoes.map((item: any) => [item.date, item.total]) },
      ...(isAdmin
        ? [
            { titulo: 'Horas por técnico', colunas: ['Técnico', 'Horas'], linhas: dadosHorasTecnico.map((item: any) => [item.name, item.value]) },
            { titulo: 'Receita mensal', colunas: ['Mês', 'Receita'], linhas: receitaMensal.map((item: any) => [item.month, `${Number(item.receita || 0).toLocaleString()} Kz`]) },
          ]
        : []),
      {
        titulo: isAdmin ? 'Últimas intervenções' : 'Meus tickets recentes',
        colunas: ['Número', 'Título', 'Cliente', 'Status'],
        linhas: ultimasIntervencoes.map((ticket) => [ticket.numero || '-', ticket.titulo, ticket.cliente_nome || '-', ticket.status.replace('_', ' ')]),
      },
      ...(isAdmin
        ? [
            {
              titulo: 'Contratos a expirar (30 dias)',
              colunas: ['Contrato', 'Cliente', 'Data fim'],
              linhas: contratosExpira.map((contrato) => [`#${contrato.id.substring(0, 8)}`, contrato.cliente_nome || '-', new Date(contrato.data_fim).toLocaleDateString('pt-PT')]),
            },
          ]
        : []),
    ];

    return criarPdfRelatorio({
      titulo: tituloDashboard,
      usuario,
      filtros: [`Período: ${periodoAtual}`],
      metricas,
      tabelas,
    });
  };

  const imprimirDashboard = () => {
    const pdf = criarPdfDashboard();
    pdf.autoPrint();
    const janela = window.open(pdf.output('bloburl') as unknown as string, '_blank');
    if (!janela) window.alert('O browser bloqueou a janela de impressão. Permita pop-ups para este site.');
  };

  const baixarDashboardPdf = () => {
    criarPdfDashboard().save(`dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div ref={dashboardRef} className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {tituloDashboard}
          </h2>
          <p className="text-gray-500 mt-1">{subtituloDashboard}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={imprimirDashboard}
                className="p-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                title="Imprimir dashboard"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={baixarDashboardPdf}
                className="p-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                title="Baixar dashboard em PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            </>
          )}
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-gray-600 shadow-sm">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{periodoAtual}</span>
          </div>
          <button
            onClick={carregarDados}
            className="p-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors shadow-md shadow-indigo-100"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{erro}</span>
        </div>
      )}

      {/* 1. Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatCard
              titulo="Total de Clientes"
              valor={dadosDashboard?.total_clientes ?? dadosDashboard?.clientes_total ?? dadosDashboard?.clientes ?? 0}
              icon={Users}
              cor="bg-blue-600"
              tendencia={{ valor: '0%', tipo: 'up' }}
              carregando={carregando}
              actions={menu('card-clientes', [atualizarItem, { label: 'Ver clientes', onClick: () => onNavigate?.('clientes') }])}
            />
            <StatCard
              titulo="Contratos Ativos"
              valor={dadosDashboard?.total_contratos_ativos ?? dadosDashboard?.contratos_ativos ?? dadosDashboard?.contratos ?? 0}
              icon={FileText}
              cor="bg-emerald-600"
              tendencia={{ valor: '0%', tipo: 'up' }}
              carregando={carregando}
              actions={menu('card-contratos', [atualizarItem, { label: 'Ver contratos', onClick: () => onNavigate?.('contratos') }])}
            />
            <StatCard
              titulo="Intervenções Abertas"
              valor={dadosDashboard?.intervencoes_abertas ?? dadosDashboard?.tickets_abertos ?? dadosDashboard?.total_intervencoes ?? 0}
              icon={Ticket}
              cor="bg-amber-600"
              tendencia={{ valor: '0', tipo: 'up' }}
              carregando={carregando}
              actions={menu('card-intervencoes', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            />
            <StatCard
              titulo="Receita Total"
              valor={dadosDashboard?.receita_total !== undefined ? `${dadosDashboard.receita_total.toLocaleString()} Kz` : dadosDashboard?.total_receita !== undefined ? `${dadosDashboard.total_receita.toLocaleString()} Kz` : "0 Kz"}
              icon={DollarSign}
              cor="bg-indigo-600"
              tendencia={{ valor: '0%', tipo: 'up' }}
              carregando={carregando}
              actions={menu('card-receita', [atualizarItem, { label: 'Ver relatórios', onClick: () => onNavigate?.('relatorios') }, { label: 'Ver contratos', onClick: () => onNavigate?.('contratos') }])}
            />
          </>
        ) : isCliente ? (
          <>
            <StatCard
              titulo="Contratos Ativos"
              valor={dadosDashboard?.contratos_ativos ?? 0}
              icon={FileText}
              cor="bg-violet-600"
              carregando={carregando}
              actions={menu('card-cliente-contratos', [atualizarItem, { label: 'Ver contratos', onClick: () => onNavigate?.('contratos') }])}
            />
            <StatCard
              titulo="Horas Disponíveis"
              valor={formatarHoras(dadosDashboard?.total_horas_disponiveis)}
              icon={Clock}
              cor="bg-indigo-600"
              carregando={carregando}
              actions={menu('card-cliente-horas', [atualizarItem, { label: 'Ver contratos', onClick: () => onNavigate?.('contratos') }, { label: 'Ver intervencoes', onClick: () => onNavigate?.('intervencoes') }])}
            />
            <StatCard
              titulo="Tickets Abertos"
              valor={dadosDashboard?.intervencoes_abertas ?? 0}
              icon={Ticket}
              cor="bg-amber-600"
              carregando={carregando}
              actions={menu('card-cliente-tickets', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            />
            <StatCard
              titulo="Concluídas (Mês)"
              valor={dadosDashboard?.intervencoes_concluidas ?? 0}
              icon={TrendingUp}
              cor="bg-emerald-600"
              carregando={carregando}
              actions={menu('card-cliente-concluidas', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            />
          </>
        ) : (
          <>
            <StatCard
              titulo="Meus Tickets"
              valor={dadosDashboard?.intervencoes_atribuidas ?? 0}
              icon={Ticket}
              cor="bg-blue-600"
              carregando={carregando}
              actions={menu('card-tecnico-tickets', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            />
            <StatCard
              titulo="Em Andamento"
              valor={dadosDashboard?.intervencoes_em_andamento ?? 0}
              icon={Clock}
              cor="bg-amber-600"
              carregando={carregando}
              actions={menu('card-tecnico-andamento', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            />
            <StatCard
              titulo="Concluído (Mês)"
              valor={dadosDashboard?.intervencoes_concluidas_mes ?? 0}
              icon={CheckCircle}
              cor="bg-emerald-600"
              carregando={carregando}
              actions={menu('card-tecnico-concluido', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            />
            <StatCard
              titulo="Horas Trabalhadas"
              valor={formatarHoras(dadosDashboard?.total_horas_mes)}
              icon={TrendingUp}
              cor="bg-theme-primary"
              carregando={carregando}
              actions={menu('card-tecnico-horas', [atualizarItem, { label: 'Registo de horas', onClick: () => onNavigate?.('horas') }])}
            />
          </>
        )}
      </div>

      {/* 2. Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Intervenções por Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900">Intervenções por Status</h3>
            {menu('grafico-status', isCliente
              ? [atualizarItem, { label: 'Ver minhas intervencoes', onClick: () => onNavigate?.('intervencoes') }]
              : [atualizarItem, { label: 'Ver intervencoes', onClick: () => onNavigate?.('intervencoes') }, { label: 'Ver relatorios', onClick: () => onNavigate?.('relatorios') }]
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosIntervencoesStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {dadosIntervencoesStatus.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Horas por Técnico</h3>
              {menu('grafico-horas-tecnico', [atualizarItem, { label: 'Ver técnicos', onClick: () => onNavigate?.('tecnicos') }, { label: 'Ver relatórios', onClick: () => onNavigate?.('relatorios') }])}
            </div>
            <div className="h-72">
              {!carregando && dadosHorasTecnico.length === 0 && (
                <p className="text-center text-sm text-gray-400 pt-28">Sem horas registadas por técnicos.</p>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosHorasTecnico}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {dadosHorasTecnico.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Receita Mensal</h3>
              <div className="flex items-center gap-2">
                {menu('grafico-receita', [atualizarItem, { label: 'Ver contratos', onClick: () => onNavigate?.('contratos') }, { label: 'Ver relatórios', onClick: () => onNavigate?.('relatorios') }])}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={receitaMensal.length ? receitaMensal : [{ month: 'Sem dados', receita: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#4f46e5"
                    strokeWidth={4}
                    dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfico de Evolução de Intervenções */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900">Evolução de Intervenções</h3>
            {menu('grafico-evolucao', isCliente
              ? [atualizarItem, { label: 'Ver minhas intervencoes', onClick: () => onNavigate?.('intervencoes') }]
              : [atualizarItem, { label: 'Ver intervencoes', onClick: () => onNavigate?.('intervencoes') }, { label: 'Ver relatorios', onClick: () => onNavigate?.('relatorios') }]
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoIntervencoes.length ? evolucaoIntervencoes : [{ date: 'Sem dados', total: 0 }]}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Tabelas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Últimas Intervenções */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-lg font-bold text-gray-900">{isAdmin ? 'Últimas Intervenções' : 'Meus Tickets Recentes'}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate?.('intervencoes')}
                className="text-theme-primary text-sm font-semibold hover:opacity-80"
              >
                Ver todas
              </button>
              {menu('tabela-intervencoes', [atualizarItem, { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') }])}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carregando ? (
                  <tr><td colSpan={4} className="text-center py-8"><Loader2 className="animate-spin inline-block text-gray-300" /></td></tr>
                ) : ultimasIntervencoes.length > 0 ? ultimasIntervencoes.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{ticket.titulo}</span>
                        <span className="text-xs text-gray-400">{ticket.numero}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.cliente_nome}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ticket.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                          ticket.status === 'em_andamento' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {menu(`ticket-${ticket.id}`, [
                        { label: 'Ver intervenções', onClick: () => onNavigate?.('intervencoes') },
                        atualizarItem,
                      ])}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">Sem intervenções recentes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-lg font-bold text-gray-900">Contratos a Expirar</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate?.('contratos')}
                  className="text-theme-primary text-sm font-semibold hover:opacity-80"
                >
                  Ver todos
                </button>
                {menu('tabela-contratos-expirar', [atualizarItem, { label: 'Ver contratos', onClick: () => onNavigate?.('contratos') }])}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Contrato</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Data Fim</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contratosExpira.length > 0 ? contratosExpira.map(contrato => (
                    <tr key={contrato.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">#{contrato.id.substring(0, 8)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{contrato.cliente_nome}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600">{new Date(contrato.data_fim).toLocaleDateString('pt-PT')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">CRÍTICO</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">Sem contratos a expirar nos próximos 30 dias.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

