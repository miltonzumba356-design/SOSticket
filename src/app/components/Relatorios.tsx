import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  clientesService,
  contratosService,
  empresasService,
  intervencoesService,
  relatoriosService,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Cliente, Contrato, Empresa, Intervencao } from '../types/api';
import { formatarHoras } from '../utils/formatters';
import { criarPdfRelatorio, PdfMetric, PdfTable } from '../utils/pdfRelatorio';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#475569'];

type TipoRelatorio = 'dashboard' | 'intervencoes' | 'horas' | 'financeiro' | 'empresas' | 'contratos';

function numero(valor: unknown) {
  const normalizado = Number(valor || 0);
  return Number.isFinite(normalizado) ? normalizado : 0;
}

function lista<T>(response: any): T[] {
  const dados = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(dados) ? dados : [];
}

function texto(valor: unknown, fallback = '-') {
  return typeof valor === 'string' && valor.trim() ? valor : fallback;
}

function idDe(valor: unknown) {
  return typeof valor === 'object' && valor !== null ? (valor as { id?: string }).id : undefined;
}

function nomeEmpresa(empresa?: string | Empresa | null) {
  if (!empresa) return 'Sem empresa';
  if (typeof empresa === 'string') return empresa;
  return empresa.nome || empresa.email || empresa.id || 'Sem empresa';
}

function nomeCliente(cliente?: string | Cliente | null, fallback?: string) {
  if (!cliente) return fallback || 'Sem cliente';
  if (typeof cliente === 'string') return cliente;
  return cliente.nome || cliente.email || fallback || 'Sem cliente';
}

function mesKey(data?: string | null) {
  if (!data) return '';
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function mesLabel(chave: string) {
  const [ano, mes] = chave.split('-').map(Number);
  if (!ano || !mes) return chave || 'Sem mês';
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
}

function dataIntervencao(item: Intervencao) {
  return item.data_abertura || item.data_fim_intervencao || item.data_conclusao || item.data_criacao;
}

function statusFinal(status?: string) {
  return ['resolvido', 'fechado', 'concluido'].includes(status || '');
}

function normalizarHorasTecnico(listaHoras: any[] = []) {
  return listaHoras
    .map((item) => ({
      name: item.tecnico__nome || item.tecnico_nome || item.nome || item.name || 'Sem técnico',
      total: numero(item.total ?? item.horas ?? item.horas_trabalhadas ?? item.total_horas),
    }))
    .filter((item) => item.total > 0);
}

function normalizarTopClientes(listaClientes: any[] = []) {
  return listaClientes.map((item) => ({
    name: item.name || item.cliente__nome || item.intervencao__cliente__nome || item.cliente_nome || 'Sem cliente',
    total: numero(item.total ?? item.intervencoes ?? item.quantidade),
  }));
}

const TITULOS_RELATORIO: Record<TipoRelatorio, string> = {
  dashboard: 'Relatorio geral',
  intervencoes: 'Relatorio de intervencoes',
  horas: 'Relatorio de horas',
  financeiro: 'Relatorio financeiro',
  empresas: 'Relatorio mensal por empresa',
  contratos: 'Relatorio de contratos e empresas',
};

function limitarLinhas<T>(linhas: T[], limite = 40) {
  return linhas.slice(0, limite);
}

export function Relatorios() {
  const { usuario } = useAuth();
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('dashboard');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState<any>({});
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().toISOString().slice(0, 7));
  const [empresaSelecionada, setEmpresaSelecionada] = useState('todas');

  const carregarDadosBase = async () => {
    const [respEmpresas, respClientes, respContratos, respIntervencoes] = await Promise.all([
      empresasService.listar({ limit: 500 }),
      clientesService.listar({ limit: 500 }),
      contratosService.listar({ limit: 500 }),
      intervencoesService.listar({ limit: 1000 }),
    ]);

    setEmpresas(lista<Empresa>(respEmpresas));
    setClientes(lista<Cliente>(respClientes));
    setContratos(lista<Contrato>(respContratos));
    setIntervencoes(lista<Intervencao>(respIntervencoes));
  };

  const carregarRelatorioHoras = async () => {
    const response = usuario?.perfil === 'tecnico'
      ? await relatoriosService.dashboardTecnico()
      : await relatoriosService.dashboardAdmin();
    const base = response?.data || response || {};
    const porTecnico = normalizarHorasTecnico(base.grafico_horas_tecnico || base.por_tecnico || []);
    const totalHoras = porTecnico.reduce((total, item) => total + item.total, 0);
    const totalIntervencoesFechadas = numero(base.intervencoes_concluidas) + numero(base.intervencoes_fechadas);

    return {
      ...base,
      total_horas: base.total_horas_mes ?? base.total_horas ?? totalHoras,
      media_horas_intervencao: base.media_horas_dia ?? base.media_horas_intervencao ?? totalHoras / (totalIntervencoesFechadas || porTecnico.length || 1),
      por_tecnico: porTecnico,
      top_clientes: normalizarTopClientes(base.top_clientes || []),
    };
  };

  const carregarDados = async () => {
    setCarregando(true);
    setErro('');

    try {
      if (['empresas', 'contratos'].includes(tipoRelatorio)) {
        await carregarDadosBase();
        setDados({});
        return;
      }

      const response = tipoRelatorio === 'dashboard'
        ? await relatoriosService.dashboardAdmin()
        : tipoRelatorio === 'intervencoes'
          ? await relatoriosService.intervencoes()
          : tipoRelatorio === 'horas'
            ? await carregarRelatorioHoras()
            : await relatoriosService.financeiro();

      setDados(response?.data || response || {});
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      setErro(error?.message || 'Não foi possível carregar este relatório.');
      setDados({});
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [tipoRelatorio]);

  const mapas = useMemo(() => {
    const empresaPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));
    const clientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente]));
    const contratoPorId = new Map(contratos.map((contrato) => [contrato.id, contrato]));

    return { empresaPorId, clientePorId, contratoPorId };
  }, [empresas, clientes, contratos]);

  const empresaDaIntervencao = (intervencao: Intervencao) => {
    const contrato = intervencao.contrato_id ? mapas.contratoPorId.get(intervencao.contrato_id) : undefined;
    const cliente = intervencao.cliente_id ? mapas.clientePorId.get(intervencao.cliente_id) : undefined;
    const empresaId = contrato?.empresa_id || idDe(contrato?.empresa) || idDe(cliente?.empresa) || idDe(intervencao.cliente);
    const empresa = empresaId ? mapas.empresaPorId.get(empresaId) : undefined;

    return {
      id: empresa?.id || empresaId || nomeEmpresa(contrato?.empresa || cliente?.empresa),
      nome: empresa?.nome || nomeEmpresa(contrato?.empresa || cliente?.empresa),
      contrato,
      cliente,
    };
  };

  const relatorioEmpresas = useMemo(() => {
    return empresas.map((empresa) => {
      const clientesEmpresa = clientes.filter((cliente) => idDe(cliente.empresa) === empresa.id || cliente.empresa === empresa.id || nomeEmpresa(cliente.empresa) === empresa.nome);
      const contratosEmpresa = contratos.filter((contrato) => contrato.empresa_id === empresa.id || idDe(contrato.empresa) === empresa.id || nomeEmpresa(contrato.empresa) === empresa.nome);
      const intervencoesEmpresa = intervencoes.filter((intervencao) => {
        const info = empresaDaIntervencao(intervencao);
        return info.id === empresa.id || info.nome === empresa.nome;
      });
      const intervencoesMes = intervencoesEmpresa.filter((item) => mesKey(dataIntervencao(item)) === mesSelecionado);

      return {
        id: empresa.id,
        nome: empresa.nome || 'Sem nome',
        clientes: clientesEmpresa.length,
        contratos: contratosEmpresa.length,
        contratosAtivos: contratosEmpresa.filter((contrato) => ['activo', 'ativo'].includes(contrato.status || '')).length,
        intervencoes: intervencoesMes.length,
        abertas: intervencoesMes.filter((item) => ['aberto', 'em_andamento'].includes(item.status || '')).length,
        concluidas: intervencoesMes.filter((item) => statusFinal(item.status)).length,
        horas: intervencoesMes.reduce((total, item) => total + numero(item.horas_trabalhadas), 0),
        receita: contratosEmpresa.reduce((total, contrato) => total + numero(contrato.valor_total), 0),
      };
    }).filter((item) => empresaSelecionada === 'todas' || item.id === empresaSelecionada);
  }, [empresas, clientes, contratos, intervencoes, mesSelecionado, empresaSelecionada, mapas]);

  const relatorioContratos = useMemo(() => {
    return contratos.map((contrato) => {
      const empresaId = contrato.empresa_id || idDe(contrato.empresa);
      const empresa = empresaId ? mapas.empresaPorId.get(empresaId) : undefined;
      const intervencoesContrato = intervencoes.filter((item) => item.contrato_id === contrato.id);
      const intervencoesMes = intervencoesContrato.filter((item) => !mesSelecionado || mesKey(dataIntervencao(item)) === mesSelecionado);

      return {
        id: contrato.id,
        contrato: contrato.numero || contrato.tipo_contrato || contrato.id,
        empresaId,
        empresa: empresa?.nome || nomeEmpresa(contrato.empresa),
        tipo: contrato.tipo_contrato || contrato.tipo_de_pagamento || '-',
        status: contrato.status || '-',
        intervencoes: intervencoesMes.length,
        abertas: intervencoesMes.filter((item) => ['aberto', 'em_andamento'].includes(item.status || '')).length,
        concluidas: intervencoesMes.filter((item) => statusFinal(item.status)).length,
        horas: intervencoesMes.reduce((total, item) => total + numero(item.horas_trabalhadas), 0),
        valor: numero(contrato.valor_total),
      };
    }).filter((item) => empresaSelecionada === 'todas' || item.empresaId === empresaSelecionada);
  }, [contratos, intervencoes, mapas, mesSelecionado, empresaSelecionada]);

  const mensalChart = relatorioEmpresas.map((item) => ({ name: item.nome, total: item.intervencoes }));
  const contratosChart = relatorioContratos.map((item) => ({ name: item.contrato, total: item.intervencoes }));
  const statusData = (dados?.por_status || []).map((item: any) => ({ name: item.status || 'Sem status', value: numero(item.total) }));
  const prioridadeData = (dados?.por_prioridade || []).map((item: any) => ({ name: item.prioridade || 'Sem prioridade', value: numero(item.total) }));
  const horasTecnico = normalizarHorasTecnico(dados?.por_tecnico || dados?.grafico_horas_tecnico || []);
  const clientesAtivos = normalizarTopClientes(dados?.top_clientes || dados?.por_cliente || []);
  const intervencoesMes = (dados?.grafico_intervencoes_mes || []).map((item: any) => ({
    name: item.mes ? new Date(item.mes).toLocaleDateString('pt-PT', { month: 'short' }) : 'Sem data',
    total: numero(item.total),
  }));
  const financeiroContrato = (dados?.por_contrato || []).map((item: any) => ({ name: item.tipo_contrato || 'Sem tipo', valor: numero(item.total) }));
  const financeiroPorCliente = (dados?.por_cliente || []).map((item: any) => ({ name: item.cliente__nome || 'Sem cliente', valor: numero(item.total) }));

  const gerarPdf = () => {
    const filtros = [
      ['empresas', 'contratos'].includes(tipoRelatorio) ? `Periodo: ${mesLabel(mesSelecionado)}` : '',
      ['empresas', 'contratos'].includes(tipoRelatorio) ? `Empresa: ${empresaSelecionada === 'todas' ? 'Todas as empresas' : empresas.find((empresa) => empresa.id === empresaSelecionada)?.nome || empresaSelecionada}` : '',
    ].filter(Boolean);

    const metricasPorTipo: Record<TipoRelatorio, PdfMetric[]> = {
      dashboard: [
        { label: 'Clientes', value: dados?.total_clientes || 0, sub: `${dados?.total_empresas || 0} empresas` },
        { label: 'Contratos ativos', value: dados?.total_contratos_ativos || 0, sub: 'Status ativo' },
        { label: 'Intervencoes', value: dados?.total_intervencoes || 0, sub: `${dados?.intervencoes_abertas || 0} abertas` },
        { label: 'Receita total', value: `${numero(dados?.receita_total).toLocaleString()} Kz`, sub: `${dados?.tecnicos_ativos || 0} tecnicos ativos` },
      ],
      intervencoes: [
        { label: 'Total', value: dados?.total_intervencoes || 0, sub: 'Intervencoes filtradas' },
        { label: 'Tempo medio', value: dados?.tempo_medio_resolucao || '0 dias', sub: 'Resolucao' },
        { label: 'Prioridades', value: prioridadeData.length, sub: 'Categorias usadas' },
      ],
      horas: [
        { label: 'Total de horas', value: formatarHoras(dados?.total_horas), sub: 'Registos lancados' },
        { label: 'Media por intervencao', value: formatarHoras(dados?.media_horas_intervencao), sub: 'Tempo medio' },
        { label: 'Tecnicos', value: horasTecnico.length, sub: 'Com horas registadas' },
      ],
      financeiro: [
        { label: 'Receita total', value: `${numero(dados?.receita_total).toLocaleString()} Kz`, sub: 'Todos contratos' },
        { label: 'Receita do mes', value: `${numero(dados?.receita_mes).toLocaleString()} Kz`, sub: 'Mes atual' },
        { label: 'Previsao', value: `${numero(dados?.previsao_receita).toLocaleString()} Kz`, sub: 'Receita prevista' },
      ],
      empresas: [
        { label: 'Empresas', value: relatorioEmpresas.length, sub: mesLabel(mesSelecionado) },
        { label: 'Clientes', value: relatorioEmpresas.reduce((total, item) => total + item.clientes, 0), sub: 'Ligados as empresas' },
        { label: 'Intervencoes', value: relatorioEmpresas.reduce((total, item) => total + item.intervencoes, 0), sub: 'No mes selecionado' },
        { label: 'Horas', value: formatarHoras(relatorioEmpresas.reduce((total, item) => total + item.horas, 0)), sub: 'No mes selecionado' },
      ],
      contratos: [
        { label: 'Contratos', value: relatorioContratos.length, sub: empresaSelecionada === 'todas' ? 'Todas as empresas' : 'Empresa filtrada' },
        { label: 'Intervencoes', value: relatorioContratos.reduce((total, item) => total + item.intervencoes, 0), sub: mesLabel(mesSelecionado) },
        { label: 'Horas', value: formatarHoras(relatorioContratos.reduce((total, item) => total + item.horas, 0)), sub: 'Por contratos' },
        { label: 'Valor', value: `${relatorioContratos.reduce((total, item) => total + item.valor, 0).toLocaleString()} Kz`, sub: 'Contratos filtrados' },
      ],
    };

    const tabelasPorTipo: Record<TipoRelatorio, PdfTable[]> = {
      dashboard: [
        { titulo: 'Intervencoes por mes', colunas: ['Mes', 'Total'], linhas: intervencoesMes.map((item) => [item.name, item.total]) },
        { titulo: 'Horas por tecnico', colunas: ['Tecnico', 'Horas'], linhas: horasTecnico.map((item) => [item.name, item.total]) },
      ],
      intervencoes: [
        { titulo: 'Distribuicao por status', colunas: ['Status', 'Total'], linhas: statusData.map((item) => [item.name, item.value]) },
        { titulo: 'Distribuicao por prioridade', colunas: ['Prioridade', 'Total'], linhas: prioridadeData.map((item) => [item.name, item.value]) },
        {
          titulo: 'Historico de intervencoes',
          colunas: ['Numero', 'Titulo', 'Cliente', 'Status', 'Prioridade'],
          linhas: limitarLinhas(dados?.intervencoes || []).map((item: any) => [texto(item.numero), texto(item.titulo), texto(item.cliente_nome), texto(item.status), texto(item.prioridade)]),
        },
      ],
      horas: [
        { titulo: 'Horas por tecnico', colunas: ['Tecnico', 'Horas'], linhas: horasTecnico.map((item) => [item.name, item.total]) },
        { titulo: 'Top clientes', colunas: ['Cliente', 'Total'], linhas: clientesAtivos.map((item) => [item.name, item.total]) },
      ],
      financeiro: [
        { titulo: 'Receita por cliente', colunas: ['Cliente', 'Valor'], linhas: financeiroPorCliente.map((item) => [item.name, `${item.valor.toLocaleString()} Kz`]) },
        { titulo: 'Receita por tipo de contrato', colunas: ['Tipo', 'Valor'], linhas: financeiroContrato.map((item) => [item.name, `${item.valor.toLocaleString()} Kz`]) },
        {
          titulo: 'Contratos a vencer',
          colunas: ['Cliente', 'Empresa', 'Data fim'],
          linhas: limitarLinhas(dados?.contratos_vencendo || []).map((item: any) => [texto(item.cliente_nome), texto(item.empresa_nome || item.empresa), item.data_fim ? new Date(item.data_fim).toLocaleDateString('pt-PT') : '-']),
        },
      ],
      empresas: [
        {
          titulo: 'Relatorio mensal por empresa',
          colunas: ['Empresa', 'Clientes', 'Contratos ativos', 'Intervencoes', 'Abertas', 'Concluidas', 'Horas', 'Receita'],
          linhas: relatorioEmpresas.map((item) => [item.nome, item.clientes, item.contratosAtivos, item.intervencoes, item.abertas, item.concluidas, formatarHoras(item.horas), `${numero(item.receita).toLocaleString()} Kz`]),
        },
      ],
      contratos: [
        {
          titulo: 'Intervencoes por contrato e empresa',
          colunas: ['Contrato', 'Empresa', 'Tipo', 'Status', 'Intervencoes', 'Abertas', 'Concluidas', 'Horas', 'Valor'],
          linhas: relatorioContratos.map((item) => [item.contrato, item.empresa, item.tipo, item.status, item.intervencoes, item.abertas, item.concluidas, formatarHoras(item.horas), `${numero(item.valor).toLocaleString()} Kz`]),
        },
      ],
    };

    const pdf = criarPdfRelatorio({
      titulo: TITULOS_RELATORIO[tipoRelatorio],
      usuario,
      filtros,
      metricas: metricasPorTipo[tipoRelatorio],
      tabelas: tabelasPorTipo[tipoRelatorio],
    });

    return pdf;
  };

  const nomeFicheiroPdf = () => `relatorio-${tipoRelatorio}-${new Date().toISOString().slice(0, 10)}.pdf`;

  const baixarPdf = () => {
    gerarPdf().save(nomeFicheiroPdf());
  };

  const imprimirRelatorio = () => {
    const pdf = gerarPdf();
    pdf.autoPrint();
    const url = URL.createObjectURL(pdf.output('blob'));
    const janela = window.open(url, '_blank');
    if (!janela) window.alert('O browser bloqueou a janela de impressão. Permita pop-ups para este site.');
  };


  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Centro de Relatórios</h2>
          <p className="text-sm text-gray-500">Relatórios gerados pelo front com dados recebidos da API.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {['empresas', 'contratos'].includes(tipoRelatorio) && (
            <>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(event) => setMesSelecionado(event.target.value)}
                className="h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
              />
              <select
                value={empresaSelecionada}
                onChange={(event) => setEmpresaSelecionada(event.target.value)}
                className="h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
              >
                <option value="todas">Todas as empresas</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.email || empresa.id}</option>
                ))}
              </select>
            </>
          )}
          <button onClick={imprimirRelatorio} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm">
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button onClick={baixarPdf} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm">
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button onClick={carregarDados} className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all font-medium text-sm">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 overflow-x-auto pb-px">
        <TabButton active={tipoRelatorio === 'dashboard'} onClick={() => setTipoRelatorio('dashboard')} label="Geral" icon={BarChart3} />
        <TabButton active={tipoRelatorio === 'intervencoes'} onClick={() => setTipoRelatorio('intervencoes')} label="Intervenções" icon={FileText} />
        <TabButton active={tipoRelatorio === 'horas'} onClick={() => setTipoRelatorio('horas')} label="Horas" icon={Clock} />
        <TabButton active={tipoRelatorio === 'financeiro'} onClick={() => setTipoRelatorio('financeiro')} label="Financeiro" icon={DollarSign} />
        <TabButton active={tipoRelatorio === 'empresas'} onClick={() => setTipoRelatorio('empresas')} label="Mensal por empresa" icon={Building2} />
        <TabButton active={tipoRelatorio === 'contratos'} onClick={() => setTipoRelatorio('contratos')} label="Contratos e empresas" icon={FileText} />
      </div>

      {erro && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-700">{erro}</div>}

      {carregando ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {tipoRelatorio === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Users} label="Clientes" value={dados?.total_clientes || 0} sub={`${dados?.total_empresas || 0} empresas`} color="indigo" />
                <StatCard icon={FileText} label="Contratos Ativos" value={dados?.total_contratos_ativos || 0} sub="Status ativo" color="emerald" />
                <StatCard icon={BarChart3} label="Intervenções" value={dados?.total_intervencoes || 0} sub={`${dados?.intervencoes_abertas || 0} abertas`} color="amber" />
                <StatCard icon={DollarSign} label="Receita Total" value={`${numero(dados?.receita_total).toLocaleString()} Kz`} sub={`${dados?.tecnicos_ativos || 0} técnicos ativos`} color="indigo" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Intervenções por mês"><BarChart data={intervencoesMes.length ? intervencoesMes : [{ name: 'Sem dados', total: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
                <ChartCard title="Horas por técnico"><BarChart data={horasTecnico.length ? horasTecnico : [{ name: 'Sem dados', total: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
              </div>
            </>
          )}

          {tipoRelatorio === 'intervencoes' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={FileText} label="Total" value={dados?.total_intervencoes || 0} sub="Intervenções filtradas" color="indigo" />
                <StatCard icon={Clock} label="Tempo Médio" value={dados?.tempo_medio_resolucao || '0 dias'} sub="Resolução" color="emerald" />
                <StatCard icon={BarChart3} label="Prioridades" value={prioridadeData.length} sub="Categorias usadas" color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Por status"><PieChart><Pie data={statusData.length ? statusData : [{ name: 'Sem dados', value: 1 }]} dataKey="value" innerRadius={60} outerRadius={85} label>{(statusData.length ? statusData : [{}]).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ChartCard>
                <ChartCard title="Por prioridade"><PieChart><Pie data={prioridadeData.length ? prioridadeData : [{ name: 'Sem dados', value: 1 }]} dataKey="value" innerRadius={60} outerRadius={85} label>{(prioridadeData.length ? prioridadeData : [{}]).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ChartCard>
              </div>
              <TabelaIntervencoes dados={dados?.intervencoes || []} />
            </>
          )}

          {tipoRelatorio === 'horas' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={Clock} label="Total de Horas" value={formatarHoras(dados?.total_horas)} sub="Registos lançados" color="indigo" />
                <StatCard icon={BarChart3} label="Média por Intervenção" value={formatarHoras(dados?.media_horas_intervencao)} sub="Tempo médio" color="emerald" />
                <StatCard icon={Users} label="Técnicos" value={horasTecnico.length} sub="Com horas registadas" color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Horas por técnico"><BarChart data={horasTecnico.length ? horasTecnico : [{ name: 'Sem dados', total: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
                <ChartCard title="Top clientes"><BarChart data={clientesAtivos.length ? clientesAtivos : [{ name: 'Sem dados', total: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
              </div>
            </>
          )}

          {tipoRelatorio === 'financeiro' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={DollarSign} label="Receita Total" value={`${numero(dados?.receita_total).toLocaleString()} Kz`} sub="Todos contratos" color="indigo" />
                <StatCard icon={DollarSign} label="Receita do Mês" value={`${numero(dados?.receita_mes).toLocaleString()} Kz`} sub="Mês atual" color="emerald" />
                <StatCard icon={FileText} label="Previsão" value={`${numero(dados?.previsao_receita).toLocaleString()} Kz`} sub="Receita prevista" color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Receita por cliente"><BarChart data={financeiroPorCliente.length ? financeiroPorCliente : [{ name: 'Sem dados', valor: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="valor" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
                <ChartCard title="Receita por tipo de contrato"><BarChart data={financeiroContrato.length ? financeiroContrato : [{ name: 'Sem dados', valor: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="valor" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
              </div>
              <TabelaContratosVencendo dados={dados?.contratos_vencendo || []} />
            </>
          )}

          {tipoRelatorio === 'empresas' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={Building2} label="Empresas" value={relatorioEmpresas.length} sub={mesLabel(mesSelecionado)} color="indigo" />
                <StatCard icon={Users} label="Clientes" value={relatorioEmpresas.reduce((total, item) => total + item.clientes, 0)} sub="Ligados às empresas" color="emerald" />
                <StatCard icon={FileText} label="Intervenções" value={relatorioEmpresas.reduce((total, item) => total + item.intervencoes, 0)} sub="No mês selecionado" color="amber" />
                <StatCard icon={Clock} label="Horas" value={formatarHoras(relatorioEmpresas.reduce((total, item) => total + item.horas, 0))} sub="No mês selecionado" color="indigo" />
              </div>
              <ChartCard title="Intervenções mensais por empresa"><BarChart data={mensalChart.length ? mensalChart : [{ name: 'Sem dados', total: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
              <TabelaEmpresas dados={relatorioEmpresas} />
            </>
          )}

          {tipoRelatorio === 'contratos' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={FileText} label="Contratos" value={relatorioContratos.length} sub={empresaSelecionada === 'todas' ? 'Todas as empresas' : 'Empresa filtrada'} color="indigo" />
                <StatCard icon={BarChart3} label="Intervenções" value={relatorioContratos.reduce((total, item) => total + item.intervencoes, 0)} sub={mesLabel(mesSelecionado)} color="emerald" />
                <StatCard icon={Clock} label="Horas" value={formatarHoras(relatorioContratos.reduce((total, item) => total + item.horas, 0))} sub="Por contratos" color="amber" />
                <StatCard icon={DollarSign} label="Valor" value={`${relatorioContratos.reduce((total, item) => total + item.valor, 0).toLocaleString()} Kz`} sub="Contratos filtrados" color="indigo" />
              </div>
              <ChartCard title="Intervenções por contrato"><BarChart data={contratosChart.length ? contratosChart : [{ name: 'Sem dados', total: 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
              <TabelaContratosRelatorio dados={relatorioContratos} />
            </>
          )}
        </div>
      )}

    </div>
  );
}

function TabButton({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: any }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
        active ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50/50'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-blue-600 text-blue-600',
    emerald: 'bg-emerald-600 text-emerald-600',
    amber: 'bg-amber-600 text-amber-600',
  };
  const colors = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className={`inline-flex p-3 rounded-xl bg-opacity-10 ${colors.split(' ')[0]}`}>
        <Icon className={`w-6 h-6 ${colors.split(' ')[1]}`} />
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TabelaIntervencoes({ dados }: { dados: any[] }) {
  return (
    <Tabela titulo="Histórico de Intervenções" colunas={['Número', 'Título', 'Cliente', 'Status', 'Prioridade']}>
      {dados.length ? dados.map((item) => (
        <tr key={item.id || item.numero} className="text-sm hover:bg-gray-50/50">
          <td className="px-6 py-4 font-bold">{texto(item.numero)}</td>
          <td className="px-6 py-4">{texto(item.titulo)}</td>
          <td className="px-6 py-4">{texto(item.cliente_nome)}</td>
          <td className="px-6 py-4">{texto(item.status)}</td>
          <td className="px-6 py-4">{texto(item.prioridade)}</td>
        </tr>
      )) : <LinhaVazia colSpan={5} />}
    </Tabela>
  );
}

function TabelaEmpresas({ dados }: { dados: any[] }) {
  return (
    <Tabela titulo="Relatório mensal por empresa" colunas={['Empresa', 'Clientes', 'Contratos ativos', 'Intervenções', 'Abertas', 'Concluídas', 'Horas', 'Receita']}>
      {dados.length ? dados.map((item) => (
        <tr key={item.id} className="text-sm hover:bg-gray-50/50">
          <td className="px-6 py-4 font-bold">{item.nome}</td>
          <td className="px-6 py-4">{item.clientes}</td>
          <td className="px-6 py-4">{item.contratosAtivos}</td>
          <td className="px-6 py-4">{item.intervencoes}</td>
          <td className="px-6 py-4">{item.abertas}</td>
          <td className="px-6 py-4">{item.concluidas}</td>
          <td className="px-6 py-4">{formatarHoras(item.horas)}</td>
          <td className="px-6 py-4">{numero(item.receita).toLocaleString()} Kz</td>
        </tr>
      )) : <LinhaVazia colSpan={8} />}
    </Tabela>
  );
}

function TabelaContratosRelatorio({ dados }: { dados: any[] }) {
  return (
    <Tabela titulo="Intervenções por contrato e empresa" colunas={['Contrato', 'Empresa', 'Tipo', 'Status', 'Intervenções', 'Abertas', 'Concluídas', 'Horas', 'Valor']}>
      {dados.length ? dados.map((item) => (
        <tr key={item.id} className="text-sm hover:bg-gray-50/50">
          <td className="px-6 py-4 font-bold">{item.contrato}</td>
          <td className="px-6 py-4">{item.empresa}</td>
          <td className="px-6 py-4">{item.tipo}</td>
          <td className="px-6 py-4">{item.status}</td>
          <td className="px-6 py-4">{item.intervencoes}</td>
          <td className="px-6 py-4">{item.abertas}</td>
          <td className="px-6 py-4">{item.concluidas}</td>
          <td className="px-6 py-4">{formatarHoras(item.horas)}</td>
          <td className="px-6 py-4">{numero(item.valor).toLocaleString()} Kz</td>
        </tr>
      )) : <LinhaVazia colSpan={9} />}
    </Tabela>
  );
}

function TabelaContratosVencendo({ dados }: { dados: any[] }) {
  return (
    <Tabela titulo="Contratos a vencer" colunas={['Cliente', 'Empresa', 'Data Fim']}>
      {dados.length ? dados.map((item) => (
        <tr key={item.id || item.data_fim} className="text-sm hover:bg-gray-50/50">
          <td className="px-6 py-4 font-bold">{texto(item.cliente_nome)}</td>
          <td className="px-6 py-4">{texto(item.empresa_nome || item.empresa)}</td>
          <td className="px-6 py-4">{item.data_fim ? new Date(item.data_fim).toLocaleDateString('pt-PT') : '-'}</td>
        </tr>
      )) : <LinhaVazia colSpan={3} texto="Sem contratos a vencer." />}
    </Tabela>
  );
}

function Tabela({ titulo, colunas, children }: { titulo: string; colunas: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <h3 className="text-lg font-bold text-gray-900">{titulo}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr className="text-xs font-bold text-gray-400 uppercase">
              {colunas.map((coluna) => <th key={coluna} className="px-6 py-4 whitespace-nowrap">{coluna}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaVazia({ colSpan, texto = 'Sem dados.' }: { colSpan: number; texto?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-400">{texto}</td>
    </tr>
  );
}
