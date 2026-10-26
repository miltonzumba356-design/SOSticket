import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Loader2, Plus, UserCog, X } from 'lucide-react';
import { tarefasService, tecnicosService } from '../services/api';
import { Prioridade, Tarefa, TarefaRequest, Tecnico } from '../types/api';

interface NovaTarefaModalProps {
  aberto: boolean;
  onFechar: () => void;
  onCriado: (tarefa: Tarefa) => void;
}

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

function toLocalInput(data: Date) {
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function valoresIniciais() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 9, 0, 0);
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 18, 0, 0);
  return { inicio: toLocalInput(inicio), fim: toLocalInput(fim) };
}

function comSegundos(valor: string) {
  return valor.length === 16 ? `${valor}:00` : valor;
}

export function NovaTarefaModal({ aberto, onFechar, onCriado }: NovaTarefaModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [atribuidoA, setAtribuidoA] = useState('');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    const valores = valoresIniciais();
    setTitulo('');
    setDescricao('');
    setDataInicio(valores.inicio);
    setDataFim(valores.fim);
    setPrioridade('media');
    setAtribuidoA('');
    setErro('');
    setSucesso(false);
    setSalvando(false);

    tecnicosService
      .listar({ limit: 100 })
      .then((response) => setTecnicos(normalizarLista<Tecnico>(response)))
      .catch((error) => {
        console.error('Erro ao carregar técnicos:', error);
        setTecnicos([]);
      });
  }, [aberto]);

  if (!aberto) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro('');

    if (new Date(dataFim) <= new Date(dataInicio)) {
      setErro('A data de fim deve ser posterior à data de início.');
      return;
    }

    setSalvando(true);

    try {
      const payload: TarefaRequest = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_inicio: comSegundos(dataInicio),
        data_fim: comSegundos(dataFim),
        prioridade,
        ...(atribuidoA ? { atribuido_a_id: atribuidoA } : {}),
      };

      const tarefa = await tarefasService.criar(payload);
      setSucesso(true);
      onCriado(tarefa);
      setTimeout(() => onFechar(), 600);
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      setErro(error?.message || 'Falha ao criar a tarefa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-theme-primary text-white sticky top-0 z-10">
          <h3 className="text-xl font-black">Nova Tarefa</h3>
          <button onClick={onFechar} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título da tarefa *</label>
            <input
              type="text"
              required
              maxLength={255}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              placeholder="Resumo da tarefa"
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
              placeholder="Descreva a tarefa..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início *</label>
              <input
                type="datetime-local"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim / Prazo *</label>
              <input
                type="datetime-local"
                required
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
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
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
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-theme-primary-light p-3 text-theme-primary-text">
            <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-[11px] font-bold leading-relaxed">
              A tarefa aparece na agenda nas datas de início e fim. Se o prazo passar sem ser concluída, o estado muda automaticamente para <span className="uppercase">expirado</span>.
            </p>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {erro}
            </div>
          )}

          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-4 text-sm font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || sucesso}
              className={`flex-[2] py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                sucesso ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-theme-primary text-white shadow-indigo-100 hover:bg-theme-primary-hover'
              } disabled:opacity-60`}
            >
              {sucesso ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Tarefa criada!</span>
                </>
              ) : salvando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>A criar...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Criar tarefa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
