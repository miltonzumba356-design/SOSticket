import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  UserCog,
  X,
} from 'lucide-react';
import { tarefasService, tecnicosService } from '../services/api';
import { EstadoTarefa, Tarefa, Tecnico } from '../types/api';

interface MenuTarefaProps {
  aberto: boolean;
  onFechar: () => void;
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
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'expirado', label: 'Expirado' },
];

export function MenuAcoesTarefa({ aberto, onFechar, tarefa, onVerDetalhes, onAtualizado }: MenuTarefaProps) {
  const [mostrarStatus, setMostrarStatus] = useState(false);
  const [mostrarAtribuir, setMostrarAtribuir] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [estado, setEstado] = useState<EstadoTarefa>((tarefa.estado as EstadoTarefa) || 'pendente');
  const [atribuidoA, setAtribuidoA] = useState(tarefa.atribuido_a?.id || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) {
      setMostrarStatus(false);
      setMostrarAtribuir(false);
      setErro('');
      setSalvando(false);
    } else {
      setEstado((tarefa.estado as EstadoTarefa) || 'pendente');
      setAtribuidoA(tarefa.atribuido_a?.id || '');
      tecnicosService
        .listar({ limit: 100 })
        .then((response) => setTecnicos(normalizarLista<Tecnico>(response)))
        .catch(() => setTecnicos([]));
    }
  }, [aberto, tarefa.id]);

  if (!aberto) return null;

  const handleAtualizarStatus = async () => {
    setSalvando(true);
    setErro('');
    try {
      await tarefasService.atualizacaoParcial(tarefa.id, { estado });
      onAtualizado();
      onFechar();
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
      onFechar();
    } catch (error: any) {
      setErro(error?.message || 'Falha ao atribuir técnico.');
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
      onFechar();
    } catch (error: any) {
      setErro(error?.message || 'Falha ao remover a tarefa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-start justify-center pt-24 px-4" onClick={onFechar}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{tarefa.numero || 'TAREFA'}</p>
            <p className="text-sm font-black text-gray-900 truncate max-w-[260px]">{tarefa.titulo}</p>
          </div>
          <button onClick={onFechar} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {!mostrarStatus && !mostrarAtribuir && (
          <div className="p-2">
            <button
              onClick={() => {
                onVerDetalhes();
                onFechar();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors"
            >
              <UserCog className="w-4 h-4 text-gray-400" />
              Ver detalhes
            </button>
            <button
              onClick={() => setMostrarStatus(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
              Atualizar status
            </button>
            <button
              onClick={() => setMostrarAtribuir(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors"
            >
              <UserCog className="w-4 h-4 text-gray-400" />
              Atribuir técnico
            </button>
            <button
              onClick={handleRemover}
              disabled={salvando}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm font-black text-red-600 transition-colors disabled:opacity-60"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remover
            </button>
          </div>
        )}

        {mostrarStatus && (
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Atualizar status</p>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoTarefa)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium"
            >
              {ESTADOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {erro && (
              <div className="p-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                {erro}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarStatus(false)}
                className="flex-1 py-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={handleAtualizarStatus}
                disabled={salvando}
                className="flex-1 py-2 text-xs font-black uppercase tracking-widest bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Guardar
              </button>
            </div>
          </div>
        )}

        {mostrarAtribuir && (
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Atribuir técnico</p>
            <select
              value={atribuidoA}
              onChange={(e) => setAtribuidoA(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium"
            >
              <option value="">Sem atribuição</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nome}
                </option>
              ))}
            </select>
            {erro && (
              <div className="p-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                {erro}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarAtribuir(false)}
                className="flex-1 py-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={handleAtribuir}
                disabled={salvando}
                className="flex-1 py-2 text-xs font-black uppercase tracking-widest bg-theme-primary text-white rounded-xl hover:bg-theme-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
