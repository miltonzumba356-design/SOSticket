import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  UserCog,
  X,
} from 'lucide-react';
import { tarefasService, tecnicosService } from '../services/api';
import { EstadoTarefa, Prioridade, Tarefa, TarefaRequest, Tecnico } from '../types/api';

interface TarefaDetalheModalProps {
  aberto: boolean;
  tarefa: Tarefa | null;
  onFechar: () => void;
  onAtualizado: () => void;
  podeGerir: boolean;
}

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

function toLocalInput(data?: string | null) {
  if (!data) return '';
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function comSegundos(valor: string) {
  if (!valor) return undefined;
  return valor.length === 16 ? `${valor}:00` : valor;
}

const ESTADOS: Array<{ value: EstadoTarefa; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_progresso', label: 'Em progresso' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'expirado', label: 'Expirado' },
];

const PRIORIDADES: Array<{ value: Prioridade; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

export function TarefaDetalheModal({ aberto, tarefa, onFechar, onAtualizado, podeGerir }: TarefaDetalheModalProps) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [estado, setEstado] = useState<EstadoTarefa>('pendente');
  const [atribuidoA, setAtribuidoA] = useState('');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto || !tarefa) return;

    setModoEdicao(false);
    setTitulo(tarefa.titulo || '');
    setDescricao(tarefa.descricao || '');
    setDataInicio(toLocalInput(tarefa.data_inicio));
    setDataFim(toLocalInput(tarefa.data_fim));
    setPrioridade((tarefa.prioridade as Prioridade) || 'media');
    setEstado((tarefa.estado as EstadoTarefa) || 'pendente');
    setAtribuidoA(tarefa.atribuido_a?.id || '');
    setErro('');
    setSalvando(false);
    setApagando(false);

    if (podeGerir) {
      tecnicosService
        .listar({ limit: 100 })
        .then((response) => setTecnicos(normalizarLista<Tecnico>(response)))
        .catch(() => setTecnicos([]));
    }
  }, [aberto, tarefa?.id, podeGerir]);

  if (!aberto || !tarefa) return null;

  const dataInicioFmt = tarefa.data_inicio ? new Date(tarefa.data_inicio).toLocaleString('pt-PT') : '-';
  const dataFimFmt = tarefa.data_fim ? new Date(tarefa.data_fim).toLocaleString('pt-PT') : '-';
  const dataCriacaoFmt = tarefa.data_criacao ? new Date(tarefa.data_criacao).toLocaleString('pt-PT') : '-';
  const dataConclusaoFmt = tarefa.data_conclusao ? new Date(tarefa.data_conclusao).toLocaleString('pt-PT') : '-';

  const handleGuardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro('');

    if (dataInicio && dataFim && new Date(comSegundos(dataFim) || dataFim) <= new Date(comSegundos(dataInicio) || dataInicio)) {
      setErro('A data de fim deve ser posterior à data de início.');
      return;
    }

    setSalvando(true);

    try {
      const payload: Partial<TarefaRequest> = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        estado,
        data_inicio: dataInicio ? comSegundos(dataInicio) : undefined,
        data_fim: dataFim ? comSegundos(dataFim) : undefined,
        atribuido_a_id: atribuidoA ? atribuidoA : null,
      };

      await tarefasService.atualizacaoParcial(tarefa.id, payload);
      onAtualizado();
      setModoEdicao(false);
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      setErro(error?.message || 'Falha ao atualizar a tarefa.');
    } finally {
      setSalvando(false);
    }
  };

  const handleApagar = async () => {
    if (!window.confirm('Tem a certeza que pretende apagar esta tarefa? Esta ação não pode ser revertida.')) return;
    setErro('');
    setApagando(true);

    try {
      await tarefasService.deletar(tarefa.id);
      onAtualizado();
      onFechar();
    } catch (error: any) {
      console.error('Erro ao apagar tarefa:', error);
      setErro(error?.message || 'Falha ao apagar a tarefa.');
    } finally {
      setApagando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-theme-primary text-white sticky top-0 z-10">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/70">{tarefa.numero || 'TAREFA'}</p>
            <h3 className="text-xl font-black">{modoEdicao ? 'Editar tarefa' : 'Detalhes da tarefa'}</h3>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {modoEdicao && podeGerir ? (
          <form onSubmit={handleGuardar} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título *</label>
              <input
                type="text"
                required
                maxLength={255}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição *</label>
              <textarea
                required
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
                <input
                  type="datetime-local"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim / Prazo</label>
                <input
                  type="datetime-local"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                >
                  {PRIORIDADES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoTarefa)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
                >
                  {ESTADOS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <UserCog className="w-3 h-3" /> Atribuir a
              </label>
              <select
                value={atribuidoA}
                onChange={(e) => setAtribuidoA(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              >
                <option value="">Sem atribuição</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome}{tecnico.email ? ` (${tecnico.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {erro && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {erro}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModoEdicao(false)}
                className="flex-1 py-3 text-sm font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all bg-theme-primary text-white shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <h4 className="text-lg font-black text-gray-900">{tarefa.titulo}</h4>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{tarefa.descricao}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Estado</p>
                <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{(tarefa.estado || '-').replace('_', ' ')}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Prioridade</p>
                <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{tarefa.prioridade || '-'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Início
                </p>
                <p className="text-xs font-bold text-gray-900 mt-1">{dataInicioFmt}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fim / Prazo
                </p>
                <p className="text-xs font-bold text-gray-900 mt-1">{dataFimFmt}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-1">
                  <UserCog className="w-3 h-3" /> Atribuído a
                </p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {tarefa.atribuido_a?.nome ? `${tarefa.atribuido_a.nome}${tarefa.atribuido_a.email ? ` (${tarefa.atribuido_a.email})` : ''}` : 'Sem atribuição'}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Criado</p>
                <p className="text-xs font-bold text-gray-900 mt-1">{dataCriacaoFmt}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Concluída</p>
                <p className="text-xs font-bold text-gray-900 mt-1">{dataConclusaoFmt}</p>
              </div>
              {tarefa.criado_por?.nome && (
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Criado por</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {tarefa.criado_por.nome}{tarefa.criado_por.email ? ` (${tarefa.criado_por.email})` : ''}
                  </p>
                </div>
              )}
            </div>

            {erro && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {erro}
              </div>
            )}

            {podeGerir && (
              <div className="pt-2">
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
