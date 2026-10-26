import { useState, useEffect } from 'react';
import { Tecnico } from '../types/api';
import { tecnicosService } from '../services/api';
import { formatarHoras } from '../utils/formatters';
import { imprimirRelatorioSemanal, paraInputData } from '../utils/relatorioSemanal';
import { Avatar, AvatarUtilizador } from './Avatar';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Phone, 
  Award, 
  CheckCircle, 
  Clock, 
  MoreVertical,
  Printer,
  Edit2,
  Trash2,
  Filter,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export function Tecnicos() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [exibirModal, setExibirModal] = useState(false);
  const [exibirPerformance, setExibirPerformance] = useState(false);
  const [tecnicoPerformance, setTecnicoPerformance] = useState<Tecnico | null>(null);
  const [carregandoPerformance, setCarregandoPerformance] = useState(false);
  const [semanaRelatorio, setSemanaRelatorio] = useState('');
  const [imprimindoRelatorio, setImprimindoRelatorio] = useState(false);
  const [menuTecnicoAberto, setMenuTecnicoAberto] = useState<string | null>(null);
  const [tecnicoEmEdicao, setTecnicoEmEdicao] = useState<Tecnico | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Estado do formulário de novo técnico
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    telefone: '',
    especialidades: '',
    data_contratacao: '',
    empresa: '',
    endereco: '',
    status: 'activo' as 'activo' | 'inactivo'
  });

  const carregarTecnicos = async () => {
    setCarregando(true);
    setErro('');
    try {
      const response = await tecnicosService.listar({ 
        search: busca || undefined 
      });
      const lista = Array.isArray(response) 
        ? response 
        : (response as any)?.results || (response as any)?.data || [];
      setTecnicos(Array.isArray(lista) ? lista : []);
    } catch (error: any) {
      console.error('Erro ao carregar técnicos:', error);
      setErro('Não foi possível carregar a lista de técnicos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTecnicos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarTecnicos();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    if (!menuTecnicoAberto) return;
    const fecharMenu = () => setMenuTecnicoAberto(null);
    document.addEventListener('click', fecharMenu);
    return () => document.removeEventListener('click', fecharMenu);
  }, [menuTecnicoAberto]);

  const formVazio = {
    nome: '',
    email: '',
    password: '',
    telefone: '',
    especialidades: '',
    data_contratacao: '',
    empresa: '',
    endereco: '',
    status: 'activo' as 'activo' | 'inactivo'
  };

  const fecharModal = () => {
    setExibirModal(false);
    setTecnicoEmEdicao(null);
    setFormData(formVazio);
  };

  const abrirNovoTecnico = () => {
    setTecnicoEmEdicao(null);
    setFormData(formVazio);
    setExibirModal(true);
  };

  const abrirEdicaoTecnico = (tecnico: Tecnico) => {
    setTecnicoEmEdicao(tecnico);
    setFormData({
      ...formVazio,
      nome: tecnico.nome || '',
      email: tecnico.email || '',
      telefone: (tecnico as any).telefone || '',
      especialidades: Array.isArray(tecnico.especialidades) ? tecnico.especialidades.join(', ') : '',
      data_contratacao: tecnico.data_contratacao ? String(tecnico.data_contratacao).slice(0, 10) : '',
      status: tecnico.status === 'inactivo' ? 'inactivo' : 'activo'
    });
    setExibirModal(true);
  };

  const removerTecnico = async (tecnico: Tecnico) => {
    if (!window.confirm(`Deseja eliminar o técnico ${tecnico.nome}?`)) return;
    setErro('');
    try {
      await tecnicosService.deletar(tecnico.id);
      await carregarTecnicos();
    } catch (err: any) {
      console.error('Erro ao eliminar técnico:', err);
      setErro(err?.message || 'Falha ao eliminar técnico.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setStatus('loading');
    setErro('');

    try {
      const dados = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        especialidades: formData.especialidades
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        data_contratacao: formData.data_contratacao || null,
        status: formData.status
      };

      if (tecnicoEmEdicao) {
        await tecnicosService.atualizacaoParcial(tecnicoEmEdicao.id, {
          ...dados,
          ...(formData.password ? { password: formData.password } : {})
        } as Partial<Tecnico>);
      } else {
        await tecnicosService.criar({ ...dados, password: formData.password });
      }

      setStatus('success');
      setTimeout(() => {
        fecharModal();
        setStatus('idle');
        carregarTecnicos();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao guardar técnico:', err);
      setErro(err.message || (tecnicoEmEdicao ? 'Falha ao atualizar técnico.' : 'Falha ao criar novo técnico.'));
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setCarregando(false);
    }
  };

  const imprimirRelatorio = async () => {
    if (!tecnicoPerformance || !semanaRelatorio) return;
    const [ano, mes, dia] = semanaRelatorio.split('-').map(Number);
    setImprimindoRelatorio(true);
    setErro('');
    try {
      await imprimirRelatorioSemanal(tecnicoPerformance, new Date(ano, mes - 1, dia));
    } catch (err: any) {
      console.error('Erro ao gerar relatório semanal:', err);
      setErro(err?.message || 'Falha ao gerar o relatório semanal.');
    } finally {
      setImprimindoRelatorio(false);
    }
  };

  const abrirPerformance = async (tecnico: Tecnico) => {
    setCarregandoPerformance(true);
    setErro('');
    try {
      const detalhe = await tecnicosService.obterPorId(tecnico.id);
      setTecnicoPerformance(detalhe);
      setSemanaRelatorio(paraInputData(new Date()));
      setExibirPerformance(true);
    } catch (err: any) {
      console.error('Erro ao carregar performance do técnico:', err);
      setErro(err.message || 'Falha ao carregar performance do técnico.');
    } finally {
      setCarregandoPerformance(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipa Técnica</h2>
          <p className="text-sm text-gray-500">Gestão de performance, especialidades e atribuições.</p>
        </div>
        <button 
          onClick={abrirNovoTecnico}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar Técnico</span>
        </button>
      </div>

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">{erro}</span>
        </div>
      )}

      {/* Toolbar e Lista ... mantido igual ... */}
      {/* (Omitido para brevidade no replacement, mas incluirei o resto do arquivo abaixo) */}
      
      {/* (Vou fornecer o arquivo completo para garantir que não quebre) */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar técnico por nome ou especialidade..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {carregando ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-gray-50 rounded-2xl animate-pulse"></div>
          ))
        ) : tecnicos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
             <User className="w-12 h-12 text-gray-200 mx-auto mb-2" />
             <p className="text-gray-500">Nenhum técnico encontrado.</p>
          </div>
        ) : tecnicos.filter(t => t && t.id).map((tecnico) => (
          <div key={tecnico.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  {tecnico.avatar_url ? (
                    <AvatarUtilizador id={tecnico.id} email={tecnico.email} nome={tecnico.nome} url={tecnico.avatar_url} className="w-16 h-16 text-2xl !rounded-2xl" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${tecnico.status === 'activo' ? 'bg-emerald-500' : 'bg-red-500'} border-4 border-white rounded-full flex items-center justify-center`} title={tecnico.status === 'activo' ? 'Ativo' : 'Inativo'}>
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuTecnicoAberto((atual) => atual === tecnico.id ? null : tecnico.id);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                  {menuTecnicoAberto === tecnico.id && (
                    <div className="absolute right-0 top-9 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden text-left">
                      <button
                        onClick={() => {
                          setMenuTecnicoAberto(null);
                          abrirEdicaoTecnico(tecnico);
                        }}
                        className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          setMenuTecnicoAberto(null);
                          removerTecnico(tecnico);
                        }}
                        className="w-full px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{tecnico.nome}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{tecnico.email}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(tecnico.especialidades) ? tecnico.especialidades : []).length > 0 
                    ? (tecnico.especialidades as string[]).map((esp, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">
                          {String(esp).toUpperCase()}
                        </span>
                      ))
                    : (['Suporte Geral', 'TI']).map((esp, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">
                          {esp.toUpperCase()}
                        </span>
                      ))
                  }
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div className="text-center">
                  <p className="text-xs text-gray-400 font-medium mb-1">Intervenções</p>
                  <span className="font-bold text-gray-900">{tecnico.intervencoes_ativas || 0}</span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 font-medium mb-1">Horas/Mês</p>
                  <span className="font-bold text-gray-900">{formatarHoras(tecnico.total_horas_mes)}</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                if (!carregandoPerformance) abrirPerformance(tecnico);
              }}
              className="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100 group-hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              <button
                type="button"
                disabled={carregandoPerformance}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 group-hover:text-white transition-colors disabled:opacity-60"
              >
                {carregandoPerformance ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                VER PERFORMANCE
              </button>
              <button type="button" className="text-gray-400 group-hover:text-white/80">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Adicionar Técnico */}
      {exibirModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{tecnicoEmEdicao ? 'Editar Técnico' : 'Novo Técnico'}</h3>
              <button onClick={fecharModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Nome Completo *</label>
                  <input 
                    type="text" 
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Ex: João Silva" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Email *</label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="joao@tecnico.com" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">{tecnicoEmEdicao ? 'Nova Password (opcional)' : 'Password *'}</label>
                  <input
                    type="password"
                    name="password"
                    required={!tecnicoEmEdicao}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <input 
                    type="text" 
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="+244 ..." 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Especialidades</label>
                  <input 
                    type="text" 
                    name="especialidades"
                    value={formData.especialidades}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Redes, Hardware, Windows Server..." 
                  />
                </div>
                <div className="space-y-1">
                  <label className="hidden">Empresa</label>
                  <input 
                    type="text" 
                    name="empresa"
                    disabled
                    value={formData.empresa}
                    onChange={handleInputChange}
                    className="hidden" 
                    placeholder="Safira" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Endereço</label>
                  <input 
                    type="text" 
                    name="endereco"
                    disabled
                    value={formData.endereco}
                    onChange={handleInputChange}
                    className="hidden" 
                    placeholder="Angola" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Data de Contratação</label>
                  <input 
                    type="date" 
                    name="data_contratacao"
                    value={formData.data_contratacao}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'activo' | 'inactivo' }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={fecharModal} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                <button 
                  type="submit"
                  disabled={carregando || status === 'success'}
                  className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg ${
                    status === 'success' 
                      ? 'bg-emerald-500 text-white shadow-emerald-100' 
                      : status === 'error'
                      ? 'bg-red-500 text-white shadow-red-100'
                      : 'bg-theme-primary text-white shadow-indigo-100 hover:bg-theme-primary-hover'
                  } disabled:opacity-50`}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{tecnicoEmEdicao ? 'Técnico Atualizado!' : 'Técnico Criado!'}</span>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Erro ao Salvar</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>{tecnicoEmEdicao ? 'Guardar Alterações' : 'Salvar Técnico'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exibirPerformance && tecnicoPerformance && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar nome={tecnicoPerformance.nome} url={tecnicoPerformance.avatar_url} className="w-16 h-16 text-2xl border-2 border-white/60" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-100">Performance técnica</p>
                  <h3 className="text-2xl font-black">{tecnicoPerformance.nome}</h3>
                  <p className="text-sm text-indigo-100">{tecnicoPerformance.email}</p>
                </div>
              </div>
              <button onClick={() => setExibirPerformance(false)} className="p-2 hover:bg-white/20 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Semana do relatório</label>
                  <input
                    type="date"
                    value={semanaRelatorio}
                    onChange={(e) => setSemanaRelatorio(e.target.value)}
                    className="block px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={imprimirRelatorio}
                  disabled={imprimindoRelatorio || !semanaRelatorio}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-60"
                >
                  {imprimindoRelatorio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  Imprimir relatório semanal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Intervenções ativas</p>
                  <p className="text-3xl font-black text-indigo-700 mt-2">{tecnicoPerformance.intervencoes_ativas || 0}</p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Horas registadas</p>
                  <p className="text-3xl font-black text-emerald-700 mt-2">{formatarHoras(tecnicoPerformance.total_horas_mes)}</p>
                </div>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Status</p>
                  <p className="text-2xl font-black text-amber-700 mt-2 capitalize">{tecnicoPerformance.status || 'activo'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Especialidades</h4>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(tecnicoPerformance.especialidades) ? tecnicoPerformance.especialidades : []).length > 0 ? (
                    (tecnicoPerformance.especialidades as string[]).map((item, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">{item}</span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Sem especialidades registadas.</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Histórico de intervenções</h4>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  {tecnicoPerformance.historico_intervencoes?.length ? tecnicoPerformance.historico_intervencoes.map((item: any) => (
                    <div key={item.id} className="px-4 py-3 border-b border-gray-50 last:border-b-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">#{item.numero} - {item.titulo}</p>
                        <p className="text-xs text-gray-500 capitalize">{String(item.status || '').replace('_', ' ')}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  )) : (
                    <div className="px-4 py-10 text-center text-sm text-gray-500">Sem histórico de intervenções.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
