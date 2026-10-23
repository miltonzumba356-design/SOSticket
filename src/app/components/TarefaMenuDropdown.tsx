import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  UserCog,
  X,
  Eye,
} from 'lucide-react';
import { tarefasService, tecnicosService } from '../services/api';
import { EstadoTarefa, Tarefa, Tecnico } from '../types/api';

interface TarefaMenuDropdownProps {
  tarefa: Tarefa;
  onVerDetalhes: () => void;
  onAtualizado: () => void;
}

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

const ESTADOS: Array<{ value: EstadoTarefa; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_progresso', label: 'Em progresso' },
  { value: 'concluida', label: 'Concluida' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'expirado', label: 'Expirado' },
];

export function TarefaMenuDropdown({ tarefa, onVerDetalhes, onAtualizado }: TarefaMenuDropdownProps) {
  const [aberto, setAberto] = useState(false);
  const [secao, setSecao] = useState<'menu' | 'status' | 'atribuir'>('menu');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [estado, setEstado] = useState<EstadoTarefa>((tarefa.estado as EstadoTarefa) || 'pendente');
  const [atribuidoA, setAtribuidoA] = useState(tarefa.atribuido_a?.id || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
        setSecao('menu');
        setErro('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!aberto) {
      setSecao('menu');
      setErro('');
      setSalvando(false);
      return;
    }
    setEstado((tarefa.estado as EstadoTarefa) || 'pendente');
    setAtribuidoA(tarefa.atribuido_a?.id || '');
    tecnicosService
      .listar({ limit: 100 })
      .then((response) => setTecnicos(normalizarLista<Tecnico>(response)))
      .catch(() => setTecnicos([]));
  }, [aberto, tarefa.id]);

  const fecharTudo = () => {
    setAberto(false);
    setSecao('menu');
    setErro('');
  };

  const handleAtualizarStatus = async () => {
    setSalvando(true);
    setErro('');
    try {
      await tarefasService.atualizacaoParcial(tarefa.id, { estado });
      onAtualizado();
      fecharTudo();
    } catch (error: any) {
      setErro(error?.message || 'Falha ao atualizar o estado.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAtribuir = async () => {
    setSalvando(true);
    setErro('');
    try {
      if (atribuidoA) {
        await tarefasService.atribuir(tarefa.id, atribuidoA);
      } else {
        await tarefasService.atualizacaoParcial(tarefa.id, { atribuido_a_id: null });
      }
      onAtualizado();
      fecharTudo();
    } catch (error: any) {
      setErro(error?.message || 'Falha ao atribuir tecnico.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async () => {
    if (!window.confirm('Tem a certeza que pretende remover esta tarefa?')) return;
    setSalvando(true);
    setErro('');
    try {
      await tarefasService.deletar(tarefa.id);
      onAtualizado();
      fecharTudo();
    } catch (error: any) {
      setErro(error?.message || 'Falha ao remover a tarefa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
          setSecao('menu');
          setErro('');
        }}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Acoes"
        aria-label="Acoes da tarefa"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-9 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-[90] overflow-hidden">
          {secao === 'menu' && (
            <div className="py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerDetalhes();
                  fecharTudo();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-400" />
                Ver detalhes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSecao('status');
                  setErro('');
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
                Atualizar status
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSecao('atribuir');
                  setErro('');
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UserCog className="w-4 h-4 text-gray-400" />
                Atribuir tecnico
              </button>
              <div className="my-1 border-t border-gray-50" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemover();
                }}
                disabled={salvando}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remover
              </button>
            </div>
          )}

          {secao === 'status' && (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Atualizar status</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSecao('menu');
                    setErro('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoTarefa)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium"
              >
                {ESTADOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {erro && (
                <div className="p-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {erro}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAtualizarStatus();
                }}
                disabled={salvando}
                className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-theme-primary text-white hover:bg-theme-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Guardar
              </button>
            </div>
          )}

          {secao === 'atribuir' && (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Atribuir tecnico</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSecao('menu');
                    setErro('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <select
                value={atribuidoA}
                onChange={(e) => setAtribuidoA(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium"
              >
                <option value="">Sem atribuicao</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome}
                  </option>
                ))}
              </select>
              {erro && (
                <div className="p-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {erro}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAtribuir();
                }}
                disabled={salvando}
                className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-theme-primary text-white hover:bg-theme-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Guardar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
