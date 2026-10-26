import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  Ticket,
  CheckSquare,
  CheckCircle2,
  Play,
  CalendarDays,
  Plus,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { intervencoesService, tarefasService } from '../services/api';
import { Intervencao, Tarefa } from '../types/api';
import { NovaTarefaModal } from './NovaTarefaModal';
import { TarefaDetalheModal } from './TarefaDetalheModal';
import { MenuAcoesTarefa } from './MenuAcoesTarefa';
import { TarefaMenuDropdown } from './TarefaMenuDropdown';

type TipoEvento = 'intervencao' | 'tarefa';

interface EventoCalendario {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  numero?: string;
  data: string;
  horaInicio?: string;
  horaFim?: string;
  local?: string;
  status?: string;
  prioridade?: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
}

function dayKey(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function formatHora(value?: string | null) {
  const data = toDate(value);
  if (!data) return undefined;
  return data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function statusStyle(status?: string) {
  switch (status) {
    case 'concluido':
    case 'concluida':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    case 'em_andamento':
    case 'em_progresso':
      return 'bg-amber-100 text-amber-900 border border-amber-300';
    case 'cancelada':
    case 'cancelado':
      return 'bg-red-100 text-red-800 border border-red-300';
    case 'verificado':
      return 'bg-teal-100 text-teal-900 border border-teal-300';
    case 'expirado':
      return 'bg-orange-100 text-orange-900 border border-orange-300';
    default:
      return 'bg-blue-100 text-blue-800 border border-blue-300';
  }
}

export function Calendario() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';
  const isTecnico = usuario?.perfil === 'tecnico';
  const isCliente = usuario?.perfil === 'cliente';

  const [dataAtual, setDataAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(dayKey(new Date()));
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);
  const [menuTarefa, setMenuTarefa] = useState<Tarefa | null>(null);
  const [tarefaEmExecucao, setTarefaEmExecucao] = useState<string | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    setErro('');

    try {
      const [respIntervencoes, respTarefas] = await Promise.all([
        intervencoesService
          .listar({
            limit: 200,
            ...(isTecnico ? { tecnico_id: usuario?.id } : {}),
            ...(isCliente ? { cliente_id: usuario?.id } : {}),
          })
          .catch((error) => {
            console.error('Erro ao carregar intervenções:', error);
            return [];
          }),
        tarefasService.listar({ limit: 200 }).catch((error) => {
          console.error('Erro ao carregar tarefas:', error);
          return null;
        }),
      ]);

      setIntervencoes(normalizarLista<Intervencao>(respIntervencoes));
      setTarefas(normalizarLista<Tarefa>(respTarefas));
    } catch (error: any) {
      console.error('Erro ao carregar calendário:', error);
      setErro(error?.message || 'Erro ao carregar o calendário.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuario?.id, usuario?.perfil]);

  const eventos = useMemo<EventoCalendario[]>(() => {
    const lista: EventoCalendario[] = [];

    intervencoes.forEach((intervencao) => {
      const inicio = intervencao.data_inicio_intervencao || intervencao.data_abertura;
      const data = toDate(inicio);
      if (!data) return;

      lista.push({
        id: intervencao.id,
        tipo: 'intervencao',
        titulo: intervencao.titulo,
        numero: intervencao.numero,
        data: data.toISOString(),
        horaInicio: formatHora(inicio),
        horaFim: formatHora(intervencao.data_fim_intervencao),
        local: intervencao.cliente_nome,
        status: intervencao.status,
        prioridade: intervencao.prioridade,
      });
    });

    tarefas.forEach((tarefa) => {
      const inicio = tarefa.data_inicio || tarefa.data_fim;
      const data = toDate(inicio);
      if (!data) return;

      lista.push({
        id: tarefa.id,
        tipo: 'tarefa',
        titulo: tarefa.titulo,
        numero: tarefa.numero,
        data: data.toISOString(),
        horaInicio: formatHora(tarefa.data_inicio),
        horaFim: formatHora(tarefa.data_fim),
        local: tarefa.atribuido_a?.nome,
        status: tarefa.estado,
        prioridade: tarefa.prioridade,
      });
    });

    return lista;
  }, [intervencoes, tarefas]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();

    eventos.forEach((evento) => {
      const data = toDate(evento.data);
      if (!data) return;
      const chave = dayKey(data);
      const lista = mapa.get(chave) || [];
      lista.push(evento);
      mapa.set(chave, lista);
    });

    mapa.forEach((lista) => {
      lista.sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
    });

    return mapa;
  }, [eventos]);

  const diasNoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
  const primeiroDiaSemana = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).getDay();
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDiaSemana }, (_, i) => i);

  const hojeKey = dayKey(new Date());
  const eventosSelecionados = eventosPorDia.get(diaSelecionado) || [];

  const eventosProximos7Dias = eventos.filter((evento) => {
    const data = toDate(evento.data);
    if (!data) return false;
    const hoje = new Date();
    const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
    const diff = (new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime() - base) / 86400000;
    return diff >= 0 && diff < 7;
  }).length;

  const intervencoesDoMes = eventos.filter((evento) => {
    const data = toDate(evento.data);
    return evento.tipo === 'intervencao' && data && data.getFullYear() === dataAtual.getFullYear() && data.getMonth() === dataAtual.getMonth();
  }).length;

  const tarefasPendentes = tarefas.filter((tarefa) =>
    ['pendente', 'em_progresso'].includes(tarefa.estado || '')
  ).length;

  const mudarMes = (delta: number) => {
    setDataAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  };

  const selecionarDia = (chave: string, ano: number, mes: number, dia: number) => {
    setDiaSelecionado(chave);
    if (ano !== dataAtual.getFullYear() || mes !== dataAtual.getMonth()) {
      setDataAtual(new Date(ano, mes, 1));
    }
  };

  const handleTarefaCriada = (tarefa: Tarefa) => {
    if (tarefa.data_inicio) {
      const data = toDate(tarefa.data_inicio);
      if (data) {
        setDataAtual(new Date(data.getFullYear(), data.getMonth(), 1));
        setDiaSelecionado(dayKey(data));
      }
    }
    carregarDados();
  };

  const abrirTarefa = async (evento: EventoCalendario) => {
    if (evento.tipo !== 'tarefa') return;
    const tarefaEncontrada = tarefas.find((t) => t.id === evento.id);
    if (tarefaEncontrada) {
      setTarefaSelecionada(tarefaEncontrada);
      return;
    }

    try {
      const tarefaCompleta = await tarefasService.obterPorId(evento.id);
      if (tarefaCompleta) {
        setTarefaSelecionada(tarefaCompleta);
        return;
      }
    } catch (error) {
      console.error('Erro ao obter detalhes da tarefa:', error);
    }

    setTarefaSelecionada({
      id: evento.id,
      titulo: evento.titulo,
      descricao: '',
      numero: evento.numero,
      estado: evento.status as any,
      prioridade: evento.prioridade as any,
      data_inicio: evento.data,
      data_fim: evento.horaFim ? evento.data : evento.data,
    } as Tarefa);
  };

  // O técnico só vê as tarefas que lhe foram atribuídas; um admin também pode executar as suas.
  const podeExecutar = (tarefa?: Tarefa | null) =>
    !!tarefa && (isTecnico || (!!usuario?.id && String(tarefa.atribuido_a?.id) === String(usuario.id)));

  const executarTarefa = async (id: string, acao: 'iniciar' | 'concluir') => {
    setErro('');
    setTarefaEmExecucao(id);
    try {
      if (acao === 'iniciar') {
        await tarefasService.iniciar(id);
      } else {
        await tarefasService.concluir(id);
      }
      await carregarDados();
    } catch (error: any) {
      console.error(`Erro ao ${acao} tarefa:`, error);
      setErro(error?.message || `Não foi possível ${acao} a tarefa.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setTarefaEmExecucao(null);
    }
  };

  const dataSelecionadaLabel = useMemo(() => {
    const [ano, mes, dia] = diaSelecionado.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' });
  }, [diaSelecionado]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendário de Trabalho</h2>
          <p className="text-sm text-gray-700">Intervenções e tarefas agendadas.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setMostrarModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100 text-sm font-bold"
            >
              <Plus className="w-5 h-5" />
              <span>Nova tarefa</span>
            </button>
          )}
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-300 shadow-sm">
          <button
            onClick={() => mudarMes(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-gray-900 transition-all"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-900 min-w-[130px] text-center">
            {MESES[dataAtual.getMonth()]} {dataAtual.getFullYear()}
          </span>
          <button
            onClick={() => mudarMes(1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-gray-900 transition-all"
            aria-label="Mês seguinte"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          </div>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{erro}</span>
        </div>
      )}

      <div className="relative bg-white rounded-3xl border border-gray-300 shadow-xl overflow-hidden">
        {carregando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}
        <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-300">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
            <div key={dia} className="px-2 py-4 text-xs font-black text-gray-700 text-center uppercase tracking-widest">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {espacosVazios.map((i) => (
            <div key={`empty-${i}`} className="min-h-[140px] p-2 border-b border-r border-gray-200 bg-gray-100/70"></div>
          ))}
          {dias.map((dia) => {
            const dataCelula = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia);
            const chave = dayKey(dataCelula);
            const eventosDia = eventosPorDia.get(chave) || [];
            const isHoje = chave === hojeKey;
            const isSelecionado = chave === diaSelecionado;

            return (
              <div
                key={dia}
                onClick={() => selecionarDia(chave, dataAtual.getFullYear(), dataAtual.getMonth(), dia)}
                className={`min-h-[140px] p-2 border-b border-r border-gray-200 transition-all cursor-pointer ${
                  isSelecionado ? 'bg-indigo-100 ring-2 ring-inset ring-indigo-500' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-sm font-bold ${
                      isHoje
                        ? 'w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center'
                        : 'text-gray-800'
                    }`}
                  >
                    {dia}
                  </span>
                  {eventosDia.length > 0 && (
                    <span className="text-[11px] font-black text-white bg-indigo-600 rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{eventosDia.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {eventosDia.slice(0, 2).map((evento) => (
                    <div
                      key={`${evento.tipo}-${evento.id}`}
                      className={`p-1.5 rounded-lg border ${
                        evento.tipo === 'tarefa'
                          ? 'bg-amber-100 border-amber-400'
                          : 'bg-indigo-100 border-indigo-400'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-bold truncate ${
                          evento.tipo === 'tarefa' ? 'text-amber-950' : 'text-indigo-950'
                        }`}
                      >
                        {evento.titulo}
                      </p>
                      {evento.horaInicio && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock
                            className={`w-2 h-2 ${
                              evento.tipo === 'tarefa' ? 'text-amber-700' : 'text-indigo-700'
                            }`}
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              evento.tipo === 'tarefa' ? 'text-amber-800' : 'text-indigo-800'
                            }`}
                          >
                            {evento.horaInicio}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {eventosDia.length > 2 && (
                    <p className="text-[10px] font-bold text-gray-600 pl-1">+{eventosDia.length - 2} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-300 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 capitalize">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              {dataSelecionadaLabel}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {eventosSelecionados.length} evento{eventosSelecionados.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="space-y-4">
            {eventosSelecionados.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-600">
                Sem eventos neste dia.
              </div>
            ) : (
              eventosSelecionados.map((evento) => {
                const data = toDate(evento.data);
                const tarefaEvento = tarefas.find((t) => t.id === evento.id) || null;
                return (
                  <div
                    key={`${evento.tipo}-${evento.id}`}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl hover:bg-gray-50 transition-all border border-gray-300 hover:border-gray-400 shadow-sm"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex flex-col items-center justify-center shadow-sm border border-gray-300">
                      <span className="text-[9px] font-black text-gray-600 uppercase">
                        {data ? MESES[data.getMonth()].slice(0, 3) : '--'}
                      </span>
                      <span className="text-lg font-black text-gray-900 leading-none">
                        {data ? String(data.getDate()).padStart(2, '0') : '--'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {evento.tipo === 'tarefa' ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        ) : (
                          <Ticket className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                        )}
                        <h4 className="font-bold text-gray-900 text-sm truncate">{evento.titulo}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {evento.numero && (
                          <span className="text-[10px] font-bold text-gray-600 uppercase">{evento.numero}</span>
                        )}
                        {evento.local && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-700 uppercase">
                            <MapPin className="w-3 h-3" /> {evento.local}
                          </span>
                        )}
                        {evento.horaInicio && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase">
                            <Clock className="w-3 h-3" />
                            {evento.horaInicio}
                            {evento.horaFim ? ` - ${evento.horaFim}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {evento.status && (
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${statusStyle(evento.status)}`}>
                        {evento.status.replace('_', ' ')}
                      </span>
                    )}
                    {evento.tipo === 'tarefa' && !isCliente && podeExecutar(tarefaEvento) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => abrirTarefa(evento)}
                          className="px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Detalhes
                        </button>
                        {evento.status === 'pendente' && (
                          <button
                            onClick={() => executarTarefa(evento.id, 'iniciar')}
                            disabled={tarefaEmExecucao === evento.id}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1"
                          >
                            {tarefaEmExecucao === evento.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            Iniciar
                          </button>
                        )}
                        {evento.status === 'em_progresso' && (
                          <button
                            onClick={() => executarTarefa(evento.id, 'concluir')}
                            disabled={tarefaEmExecucao === evento.id}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1"
                          >
                            {tarefaEmExecucao === evento.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Fechar
                          </button>
                        )}
                      </div>
                    )}
                    {evento.tipo === 'tarefa' && usuario?.perfil === 'admin' && (
                      <TarefaMenuDropdown
                        tarefa={tarefaEvento || ({ id: evento.id, titulo: evento.titulo, numero: evento.numero, estado: evento.status } as Tarefa)}
                        onVerDetalhes={() => abrirTarefa(evento)}
                        onAtualizado={() => {
                          carregarDados();
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Resumo</h3>
            <p className="text-white text-sm mb-6">
              Tens {eventosProximos7Dias} evento{eventosProximos7Dias === 1 ? '' : 's'} nos próximos 7 dias.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-indigo-300 pb-2">
                <span className="text-sm">Intervenções no mês</span>
                <span className="text-2xl font-black">{intervencoesDoMes}</span>
              </div>
              <div className="flex justify-between items-end border-b border-indigo-300 pb-2">
                <span className="text-sm">Tarefas pendentes</span>
                <span className="text-2xl font-black">{tarefasPendentes}</span>
              </div>
              <div className="flex justify-between items-end border-b border-indigo-300 pb-2">
                <span className="text-sm">Eventos hoje</span>
                <span className="text-2xl font-black">{eventosPorDia.get(hojeKey)?.length || 0}</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
        </div>
      </div>

      <NovaTarefaModal
        aberto={mostrarModal}
        onFechar={() => setMostrarModal(false)}
        onCriado={handleTarefaCriada}
      />

      <TarefaDetalheModal
        aberto={!!tarefaSelecionada}
        tarefa={tarefaSelecionada}
        onFechar={() => setTarefaSelecionada(null)}
        onAtualizado={() => {
          carregarDados();
          setTarefaSelecionada(null);
        }}
        podeGerir={usuario?.perfil === 'admin'}
        podeExecutar={podeExecutar(tarefaSelecionada)}
      />

      {menuTarefa && (
        <MenuAcoesTarefa
          aberto={!!menuTarefa}
          tarefa={menuTarefa}
          onFechar={() => setMenuTarefa(null)}
          onVerDetalhes={() => {
            const encontrada = tarefas.find((t) => t.id === menuTarefa.id);
            setTarefaSelecionada(encontrada || menuTarefa);
          }}
          onAtualizado={() => {
            carregarDados();
            setMenuTarefa(null);
          }}
        />
      )}
    </div>
  );
}
