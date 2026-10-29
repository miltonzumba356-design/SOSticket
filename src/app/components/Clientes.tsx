import { useState, useEffect } from 'react';
import { Cliente, ClienteRequest, Empresa } from '../types/api';
import { clientesService, empresasService } from '../services/api';
import { Avatar } from './Avatar';
import { CampoPassword } from './CampoPassword';
import { 
  Search, 
  Plus, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MoreVertical, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  Server,
  Monitor,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

function getEmpresaNome(empresa: Cliente['empresa']) {
  if (!empresa) return '';
  if (typeof empresa === 'string') return empresa;
  return String(empresa.nome || empresa.Email_empresa || 'Empresa');
}

function getEmpresaLabel(empresa: Empresa) {
  return [empresa.nome, empresa.nif ? `NIF ${empresa.nif}` : undefined].filter(Boolean).join(' - ');
}

function getPostosDaEmpresa(empresa?: Empresa) {
  if (!empresa?.postos || typeof empresa.postos !== 'object') return [];

  return Object.entries(empresa.postos).map(([key, value]: [string, any]) => ({
    key,
    id: value && typeof value === 'object' ? value.id || key : key,
    nome: value && typeof value === 'object' ? value.nome || key : key,
  }));
}

function getPostoSelecionado(cliente: Cliente) {
  const postoId = cliente.ID_POSTOS;
  const empresa = typeof cliente.empresa === 'object' ? cliente.empresa : undefined;
  const posto = getPostosDaEmpresa(empresa).find((item) => item.id === postoId || item.key === postoId);

  return {
    id: postoId || 'N/A',
    nome: posto?.nome || (postoId ? 'Posto selecionado' : 'Sem posto selecionado'),
  };
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'activo' | 'inactivo' | ''>('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [exibirModal, setExibirModal] = useState(false);
  const [exibirModalDetalhes, setExibirModalDetalhes] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clienteEdicao, setClienteEdicao] = useState<Cliente | null>(null);
  const [menuClienteAberto, setMenuClienteAberto] = useState<string | null>(null);
  const [listaPostos, setListaPostos] = useState([{ id: '', nome: '' }]);
  const [statusEnvio, setStatusEnvio] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Estado do formulário de novo cliente
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    empresa: '',
    ID_POSTOS: '',
    telefone: '',
    nif: '',
    ip_servidor: '',
    endereco: ''
  });

  // Atualiza os inputs quando necessário

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'empresa' ? { ID_POSTOS: '' } : {}),
    }));
  };

  const carregarEmpresas = async () => {
    try {
      const response = await empresasService.listar({ limit: 100 });
      const lista = Array.isArray(response)
        ? response
        : (response as any)?.results || (response as any)?.data || [];
      setEmpresas(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setStatusEnvio('loading');
    setErro('');
    
    try {
      if (!formData.empresa) {
        throw new Error('Selecione uma empresa para associar este cliente.');
      }

      const payload: ClienteRequest = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        empresa: formData.empresa,
        ID_POSTOS: formData.ID_POSTOS,
      };

      if (formData.password) payload.password = formData.password;
      if (clienteEdicao) {
        delete (payload as Partial<ClienteRequest>).email;
      }

      console.log('Enviando payload de criação de cliente:', payload);

      if (clienteEdicao) {
        await clientesService.atualizacaoParcial(clienteEdicao.id, payload);
      } else {
        await clientesService.criar({ ...payload, password: formData.password });
      }
      
      setStatusEnvio('success');
      
      // Delay pequeno para mostrar o sucesso
      setTimeout(() => {
        setExibirModal(false);
        setClienteEdicao(null);
        setStatusEnvio('idle');
        // Limpa o form
        setFormData({
          nome: '',
          email: '',
          password: '',
          empresa: '',
          ID_POSTOS: '',
          telefone: '',
          nif: '',
          ip_servidor: '',
          endereco: ''
        });
        carregarClientes();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao criar cliente:', err);
      setStatusEnvio('error');
      setErro(err.message || 'Falha ao criar novo cliente. Verifique os dados e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarClientes = async () => {
    setCarregando(true);
    setErro('');
    try {
      const response = await clientesService.listar({ 
        search: busca || undefined,
        status: statusFiltro || undefined,
        page: pagina,
        limit: 10
      });
      const lista = Array.isArray(response) 
        ? response 
        : (response as any)?.results || (response as any)?.data || [];
      setClientes(Array.isArray(lista) ? lista : []);
      setTotalPaginas((response as any)?.pagination?.total_pages || (response as any)?.total_pages || 1);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      setErro('Falha ao carregar a lista de clientes.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarClientes();
    carregarEmpresas();
  }, [pagina, statusFiltro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagina === 1) carregarClientes();
      else setPagina(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const empresaSelecionada = empresas.find((empresa) => empresa.id === formData.empresa);
  const postosDaEmpresa = getPostosDaEmpresa(empresaSelecionada);

  const resetFormCliente = () => {
    setFormData({
      nome: '',
      email: '',
      password: '',
      empresa: '',
      ID_POSTOS: '',
      telefone: '',
      nif: '',
      ip_servidor: '',
      endereco: ''
    });
  };

  const abrirNovoCliente = () => {
    setClienteEdicao(null);
    resetFormCliente();
    setErro('');
    setExibirModal(true);
  };

  const abrirEdicaoCliente = (cliente: Cliente) => {
    const empresaId = typeof cliente.empresa === 'object' ? cliente.empresa.id : '';
    setClienteEdicao(cliente);
    setFormData({
      nome: cliente.nome || '',
      email: cliente.email || '',
      password: '',
      empresa: empresaId || '',
      ID_POSTOS: cliente.ID_POSTOS || '',
      telefone: cliente.telefone || '',
      nif: cliente.nif || '',
      ip_servidor: cliente.ip_servidor || '',
      endereco: cliente.endereco || ''
    });
    setErro('');
    setExibirModal(true);
  };

  const removerCliente = async (cliente: Cliente) => {
    if (!window.confirm(`Deseja eliminar o cliente ${cliente.nome}?`)) return;
    setErro('');
    try {
      await clientesService.deletar(cliente.id);
      setMenuClienteAberto(null);
      await carregarClientes();
    } catch (error: any) {
      console.error('Erro ao eliminar cliente:', error);
      setErro(error?.message || 'Falha ao eliminar cliente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h2>
          <p className="text-sm text-gray-500">Visualize e gerencie todos os clientes da plataforma.</p>
        </div>
        <button 
          onClick={abrirNovoCliente}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar Cliente</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, email ou empresa..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-4">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos Status</option>
            <option value="activo">Ativos</option>
            <option value="inactivo">Inativos</option>
          </select>
          <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Cliente / Empresa</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Contratos</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {carregando ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-12 bg-gray-100 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum cliente encontrado.</td>
                </tr>
              ) : clientes.filter(c => c && c.id).map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar nome={cliente.nome} url={cliente.avatar_url} className="w-10 h-10 text-base" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{cliente.nome}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span>{getEmpresaNome(cliente.empresa) || 'Individual'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{cliente.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{cliente.telefone || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      cliente.status === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {cliente.status === 'activo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{cliente.contratos_ativos || 0}</span>
                      <span className="text-xs text-gray-400">Ativos</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                        title="Visualizar"
                        onClick={() => {
                          setClienteSelecionado(cliente);
                          setExibirModalDetalhes(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirEdicaoCliente(cliente)}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removerCliente(cliente)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMenuClienteAberto((atual) => atual === cliente.id ? null : cliente.id)}
                        className="p-2 text-gray-400"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuClienteAberto === cliente.id && (
                        <div className="absolute right-0 top-9 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden text-left">
                          <button
                            onClick={() => {
                              setClienteSelecionado(cliente);
                              setExibirModalDetalhes(true);
                              setMenuClienteAberto(null);
                            }}
                            className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" /> Ver detalhes
                          </button>
                          <button
                            onClick={() => {
                              abrirEdicaoCliente(cliente);
                              setMenuClienteAberto(null);
                            }}
                            className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Editar
                          </button>
                          <button
                            onClick={() => removerCliente(cliente)}
                            className="w-full px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando <span className="font-medium">{clientes.length}</span> de <span className="font-medium">{(totalPaginas * 10)}</span> clientes
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={pagina === 1}
              onClick={() => setPagina(p => p - 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-4">Página {pagina} de {totalPaginas}</span>
            <button 
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina(p => p + 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Placeholder para Adicionar/Editar */}
      {exibirModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{clienteEdicao ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => { setExibirModal(false); setClienteEdicao(null); }} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <form id="form-cliente" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    required={!clienteEdicao}
                    disabled={!!clienteEdicao}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" 
                    placeholder="joao@exemplo.com" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Password *</label>
                  <CampoPassword
                    name="password"
                    required={!clienteEdicao}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Empresa *</label>
                  <select
                    name="empresa"
                    required
                    value={formData.empresa}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>{getEmpresaLabel(empresa)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Posto *</label>
                  {postosDaEmpresa.length > 0 ? (
                    <select
                      name="ID_POSTOS"
                      required
                      value={formData.ID_POSTOS}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Selecione um posto...</option>
                      {postosDaEmpresa.map((posto) => (
                        <option key={posto.key} value={posto.id}>{posto.nome} - {posto.id}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="ID_POSTOS"
                      required
                      value={formData.ID_POSTOS}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="ID do posto cadastrado na empresa"
                    />
                  )}
                </div>
                <div className="hidden">
                  <input 
                    type="text" 
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none bg-gray-50 text-gray-500" 
                    placeholder="Número de Identificação Fiscal" 
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
                <div className="hidden">
                  <label className="text-sm font-bold text-gray-700">IP do Servidor</label>
                  <input 
                    type="text" 
                    name="ip_servidor"
                    value={formData.ip_servidor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="192.168.1.100" 
                  />
                </div>

                {/* Configuração de postos pertence ao cadastro de empresa. */}
                <div className="hidden">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Configuração de Postos</h4>
                    <button 
                      type="button" 
                      onClick={() => setListaPostos([...listaPostos, { id: '', nome: '' }])}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Posto
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {listaPostos.map((posto, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all relative group">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">ID Posto {index + 1}</label>
                            <input 
                              type="text"
                              value={posto.id}
                              onChange={(e) => {
                                const nova = [...listaPostos];
                                nova[index].id = e.target.value;
                                setListaPostos(nova);
                              }}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                              placeholder="ID ou Anydesk"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Nome Posto {index + 1}</label>
                            <input 
                              type="text"
                              value={posto.nome}
                              onChange={(e) => {
                                const nova = [...listaPostos];
                                nova[index].nome = e.target.value;
                                setListaPostos(nova);
                              }}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                              placeholder="Ex: Recepção, Caixa 1"
                            />
                          </div>
                        </div>
                        {listaPostos.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setListaPostos(listaPostos.filter((_, i) => i !== index))}
                            className="absolute -right-2 -top-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden">
                  <label className="text-sm font-bold text-gray-700">Endereço</label>
                  <textarea 
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    rows={2} 
                    placeholder="Rua, Bairro, Cidade..."
                  ></textarea>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex flex-col gap-4 bg-gray-50/50 rounded-b-2xl">
              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-tight">{erro}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setExibirModal(false);
                    setClienteEdicao(null);
                    setErro('');
                    setStatusEnvio('idle');
                  }} 
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="form-cliente"
                  disabled={carregando || statusEnvio === 'success'}
                  className={`px-8 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 min-w-[160px] justify-center ${
                    statusEnvio === 'success' ? 'bg-emerald-500 shadow-emerald-100' :
                    statusEnvio === 'error' ? 'bg-red-500 shadow-red-100 animate-shake' :
                    'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700'
                  }`}
                >
                  {statusEnvio === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : statusEnvio === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvo!</span>
                    </>
                  ) : statusEnvio === 'error' ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Tentar Novamente</span>
                    </>
                  ) : (
                    clienteEdicao ? 'Salvar Alterações' : 'Salvar Cliente'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Cliente */}
      {exibirModalDetalhes && clienteSelecionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <div>
                <h3 className="text-2xl font-black">{clienteSelecionado.nome}</h3>
                <p className="text-indigo-100 text-sm font-medium">{getEmpresaNome(clienteSelecionado.empresa) || 'Cliente Individual'}</p>
              </div>
              <button onClick={() => setExibirModalDetalhes(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informações de Conexão */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-emerald-600" />
                      Meu Posto
                    </h4>
                    <div>
                      <p className="text-xl font-black text-emerald-800 leading-tight">{getPostoSelecionado(clienteSelecionado).nome}</p>
                      <div className="mt-4 pt-4 border-t border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">ID do posto</p>
                        <p className="text-lg font-black text-gray-900 font-mono">{getPostoSelecionado(clienteSelecionado).id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Server className="w-4 h-4 text-indigo-500" />
                      Configuração do Servidor
                    </h4>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">IP do Servidor</p>
                      <p className="text-lg font-black text-indigo-600 tracking-tight">{clienteSelecionado.ip_servidor || 'Não Configurado'}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-indigo-500" />
                      Contato Direto
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Email</p>
                          <p className="text-sm font-bold text-gray-800 break-all">{clienteSelecionado.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Telefone</p>
                          <p className="text-sm font-bold text-gray-800">{clienteSelecionado.telefone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Postos */}
                <div className="hidden">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 ml-1">
                    <Monitor className="w-4 h-4 text-indigo-500" />
                    Lista de Postos ({Object.keys(clienteSelecionado.postos || {}).length})
                  </h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {clienteSelecionado.postos && typeof clienteSelecionado.postos === 'object' ? (
                      Object.entries(clienteSelecionado.postos).map(([key, value]: [string, any], index) => {
                        const isObject = value && typeof value === 'object';
                        const id = isObject ? (value.id || value.Id || index) : value;
                        const nome = isObject ? (value.nome || value.Nome || value.localização || key) : key;

                        return (
                          <div key={index} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{key}</span>
                              <Cpu className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-900">{nome}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Identificador:</span>
                              <span className="text-[10px] font-black text-gray-700 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{id}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 w-full">
                        <Monitor className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 font-bold uppercase">Nenhum posto configurado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-center">
              <button 
                onClick={() => setExibirModalDetalhes(false)}
                className="px-12 py-3 bg-white border border-gray-200 text-gray-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all shadow-sm"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
