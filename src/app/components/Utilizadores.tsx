import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { empresasService, FuncaoUtilizador, utilizadoresService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Empresa, Usuario } from '../types/api';
import { AvatarUtilizador } from './Avatar';
import { CampoPassword } from './CampoPassword';

const FUNCOES: Array<{ valor: FuncaoUtilizador; rotulo: string; selo: string }> = [
  { valor: 'admin', rotulo: 'Administrador', selo: 'bg-purple-50 text-purple-700 border border-purple-200' },
  { valor: 'tecnico', rotulo: 'Técnico', selo: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { valor: 'cliente', rotulo: 'Cliente', selo: 'bg-blue-50 text-blue-700 border border-blue-200' },
];

function funcaoDe(valor?: string) {
  return FUNCOES.find((funcao) => funcao.valor === valor);
}

const FORMULARIO_VAZIO = {
  nome: '',
  email: '',
  password: '',
  perfil: 'tecnico' as FuncaoUtilizador,
  telefone: '',
  especialidades: '',
  data_contratacao: '',
  empresa: '',
};

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response) ? response : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

export function Utilizadores() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';

  const [utilizadores, setUtilizadores] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState<'' | FuncaoUtilizador>('');

  const [exibirNovo, setExibirNovo] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [aGuardar, setAGuardar] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const [utilizadorFuncao, setUtilizadorFuncao] = useState<Usuario | null>(null);
  const [novaFuncao, setNovaFuncao] = useState<FuncaoUtilizador>('tecnico');
  const [aAlterarFuncao, setAAlterarFuncao] = useState(false);
  const [erroFuncao, setErroFuncao] = useState('');

  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro('');
    try {
      const lista = await utilizadoresService.listar();
      // A sessão sabe sempre qual é a função de quem está autenticado.
      setUtilizadores(
        lista.map((item) =>
          usuario && String(item.id) === String(usuario.id) ? { ...item, perfil: usuario.perfil } : item
        )
      );
    } catch (error: any) {
      console.error('Erro ao carregar utilizadores:', error);
      setErro(error?.message || 'Não foi possível carregar os utilizadores.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    carregar();
    empresasService
      .listar({ limit: 100 })
      .then((resposta) => setEmpresas(normalizarLista<Empresa>(resposta)))
      .catch(() => setEmpresas([]));
  }, [isAdmin]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return utilizadores
      .filter((item) => !filtroFuncao || item.perfil === filtroFuncao)
      .filter((item) => !termo || `${item.nome} ${item.email}`.toLowerCase().includes(termo))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
  }, [utilizadores, busca, filtroFuncao]);

  const totais = useMemo(
    () => FUNCOES.map((funcao) => ({ ...funcao, total: utilizadores.filter((item) => item.perfil === funcao.valor).length })),
    [utilizadores]
  );

  const mudarCampo = (campo: keyof typeof FORMULARIO_VAZIO, valor: string) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  };

  const abrirNovo = () => {
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario('');
    setExibirNovo(true);
  };

  const criarUtilizador = async (event: React.FormEvent) => {
    event.preventDefault();
    setErroFormulario('');

    if (formulario.perfil === 'cliente' && !formulario.empresa) {
      setErroFormulario('Selecione a empresa do cliente.');
      return;
    }

    setAGuardar(true);
    try {
      await utilizadoresService.criar({
        nome: formulario.nome.trim(),
        email: formulario.email.trim(),
        password: formulario.password,
        perfil: formulario.perfil,
        telefone: formulario.telefone.trim() || undefined,
        status: 'activo',
        ...(formulario.perfil === 'tecnico'
          ? {
              especialidades: formulario.especialidades.split(',').map((item) => item.trim()).filter(Boolean),
              data_contratacao: formulario.data_contratacao || null,
            }
          : {}),
        ...(formulario.perfil === 'cliente' ? { empresa: formulario.empresa } : {}),
      });
      setExibirNovo(false);
      setSucesso(`Utilizador ${formulario.nome.trim()} criado com sucesso.`);
      await carregar();
    } catch (error: any) {
      console.error('Erro ao criar utilizador:', error);
      setErroFormulario(error?.message || 'Falha ao criar o utilizador.');
    } finally {
      setAGuardar(false);
    }
  };

  const abrirFuncao = (item: Usuario) => {
    setUtilizadorFuncao(item);
    setNovaFuncao((item.perfil as FuncaoUtilizador) || 'tecnico');
    setErroFuncao('');
  };

  const guardarFuncao = async () => {
    if (!utilizadorFuncao) return;
    if (novaFuncao === utilizadorFuncao.perfil) {
      setUtilizadorFuncao(null);
      return;
    }

    setAAlterarFuncao(true);
    setErroFuncao('');
    try {
      await utilizadoresService.alterarFuncao(utilizadorFuncao.id, novaFuncao);
      setSucesso(`${utilizadorFuncao.nome} passou a ${funcaoDe(novaFuncao)?.rotulo.toLowerCase()}.`);
      setUtilizadorFuncao(null);
      await carregar();
    } catch (error: any) {
      console.error('Erro ao alterar a função:', error);
      setErroFuncao(
        error?.status === 404 || error?.status === 405
          ? 'O servidor ainda não permite alterar a função de um utilizador (falta o pedido PATCH /auth/{id}/register).'
          : error?.message || 'Falha ao alterar a função.'
      );
    } finally {
      setAAlterarFuncao(false);
    }
  };

  const eliminarUtilizador = async (item: Usuario) => {
    if (!window.confirm(`Eliminar o utilizador ${item.nome} (${item.email})? Esta ação não pode ser revertida.`)) return;

    setAEliminar(item.id);
    setErro('');
    setSucesso('');
    try {
      await utilizadoresService.eliminar(item.id);
      setUtilizadores((atuais) => atuais.filter((outro) => outro.id !== item.id));
      setSucesso(`Utilizador ${item.nome} eliminado.`);
    } catch (error: any) {
      console.error('Erro ao eliminar utilizador:', error);
      setErro(error?.message || 'Falha ao eliminar o utilizador.');
    } finally {
      setAEliminar(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-24 text-center text-gray-500">
        <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        Apenas os administradores podem gerir utilizadores.
      </div>
    );
  }

  const campo = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Utilizadores</h2>
          <p className="text-sm text-gray-500">Crie contas, altere a função e elimine utilizadores.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          <span>Novo utilizador</span>
        </button>
      </div>

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" /> {erro}
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> {sucesso}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {totais.map((funcao) => (
          <button
            key={funcao.valor}
            onClick={() => setFiltroFuncao((atual) => (atual === funcao.valor ? '' : funcao.valor))}
            className={`text-left p-4 bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md ${
              filtroFuncao === funcao.valor ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-100'
            }`}
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{funcao.rotulo}s</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{funcao.total}</p>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome ou email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filtroFuncao}
          onChange={(e) => setFiltroFuncao(e.target.value as '' | FuncaoUtilizador)}
          className="w-full md:w-auto bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600"
        >
          <option value="">Todas as funções</option>
          {FUNCOES.map((funcao) => (
            <option key={funcao.valor} value={funcao.valor}>{funcao.rotulo}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                <th className="px-6 py-4">Utilizador</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {carregando ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin inline-block text-gray-300" />
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    Nenhum utilizador encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => {
                  const funcao = funcaoDe(item.perfil);
                  const eOProprio = String(item.id) === String(usuario?.id);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarUtilizador id={item.id} email={item.email} nome={item.nome} url={item.avatar_url} className="w-10 h-10 text-base" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {item.nome}
                              {eOProprio && <span className="ml-2 text-[10px] font-black text-indigo-600 uppercase">(você)</span>}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${funcao?.selo || 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                          {funcao?.rotulo || item.perfil || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${item.status === 'inactivo' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.status === 'inactivo' ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirFuncao(item)}
                            disabled={eOProprio}
                            title={eOProprio ? 'Não pode alterar a sua própria função' : 'Alterar função'}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserCog className="w-4 h-4" /> Alterar função
                          </button>
                          <button
                            onClick={() => eliminarUtilizador(item)}
                            disabled={eOProprio || aEliminar === item.id}
                            title={eOProprio ? 'Não pode eliminar a sua própria conta' : 'Eliminar utilizador'}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {aEliminar === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {exibirNovo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Novo utilizador</h3>
              <button onClick={() => setExibirNovo(false)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Fechar">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={criarUtilizador}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Função *</label>
                  <select value={formulario.perfil} onChange={(e) => mudarCampo('perfil', e.target.value)} className={campo}>
                    {FUNCOES.map((funcao) => (
                      <option key={funcao.valor} value={funcao.valor}>{funcao.rotulo}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Nome completo *</label>
                  <input required value={formulario.nome} onChange={(e) => mudarCampo('nome', e.target.value)} className={campo} placeholder="Ex.: João Silva" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Email *</label>
                  <input required type="email" value={formulario.email} onChange={(e) => mudarCampo('email', e.target.value)} className={campo} placeholder="joao@empresa.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Palavra-passe *</label>
                  <CampoPassword required value={formulario.password} onChange={(e) => mudarCampo('password', e.target.value)} className={campo} placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Telefone{formulario.perfil !== 'admin' ? ' *' : ''}</label>
                  <input required={formulario.perfil !== 'admin'} value={formulario.telefone} onChange={(e) => mudarCampo('telefone', e.target.value)} className={campo} placeholder="+244 ..." />
                </div>

                {formulario.perfil === 'tecnico' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">Especialidades *</label>
                      <input required value={formulario.especialidades} onChange={(e) => mudarCampo('especialidades', e.target.value)} className={campo} placeholder="Redes, Hardware, Windows Server..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">Data de contratação *</label>
                      <input required type="date" value={formulario.data_contratacao} onChange={(e) => mudarCampo('data_contratacao', e.target.value)} className={campo} />
                    </div>
                  </>
                )}

                {formulario.perfil === 'cliente' && (
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Empresa *</label>
                    <select required value={formulario.empresa} onChange={(e) => mudarCampo('empresa', e.target.value)} className={campo}>
                      <option value="">Selecione uma empresa...</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.email || empresa.id}</option>
                      ))}
                    </select>
                  </div>
                )}

                {erroFormulario && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {erroFormulario}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={() => setExibirNovo(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aGuardar}
                  className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest bg-theme-primary text-white shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-all disabled:opacity-50"
                >
                  {aGuardar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Criar utilizador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {utilizadorFuncao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Alterar função</h3>
                <p className="text-xs text-gray-500">{utilizadorFuncao.nome} · {utilizadorFuncao.email}</p>
              </div>
              <button onClick={() => setUtilizadorFuncao(null)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Fechar">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-8 space-y-3">
              {FUNCOES.map((funcao) => (
                <label
                  key={funcao.valor}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    novaFuncao === funcao.valor ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="funcao"
                    checked={novaFuncao === funcao.valor}
                    onChange={() => setNovaFuncao(funcao.valor)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm font-bold text-gray-900">{funcao.rotulo}</span>
                  {utilizadorFuncao.perfil === funcao.valor && <span className="ml-auto text-[10px] font-black text-gray-400 uppercase">Atual</span>}
                </label>
              ))}
              {erroFuncao && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {erroFuncao}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-2xl">
              <button onClick={() => setUtilizadorFuncao(null)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button
                onClick={guardarFuncao}
                disabled={aAlterarFuncao}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest bg-theme-primary text-white shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-all disabled:opacity-50"
              >
                {aAlterarFuncao ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
