import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Contrato, Empresa } from '../types/api';
import { formatarHoras } from '../utils/formatters';
import { contratosService, empresasService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  User,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

function getEmpresaNome(empresa: Empresa | string | undefined) {
  if (!empresa) return '';
  if (typeof empresa === 'string') return empresa;
  return String(empresa.nome || empresa.Email_empresa || 'Empresa');
}

function getEmpresaId(empresa: Empresa | string | unknown) {
  if (!empresa || typeof empresa === 'string') return undefined;
  return (empresa as { id?: string }).id;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ROTULOS_ESTADO: Record<string, string> = {
  activo: 'Ativo',
  ativo: 'Ativo',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

const ROTULOS_PAGAMENTO: Record<string, string> = {
  horas: 'Pacote de horas',
  mensal: 'Mensal',
  anual: 'Anual',
};

const ROTULOS_TIPO_CONTRATO: Record<string, string> = {
  'assistencia tecnica': 'Assistência técnica',
  suporte: 'Suporte técnico',
  'instalação': 'Instalação',
  'manutencao preventiva': 'Manutenção preventiva',
  'manutencao corretiva': 'Manutenção corretiva',
  'servico avulso': 'Serviço avulso',
  outros: 'Outros',
};

function rotuloEstado(status?: string) {
  return ROTULOS_ESTADO[status || 'ativo'] || status || 'Ativo';
}

function rotuloPagamento(valor?: string) {
  return (valor && ROTULOS_PAGAMENTO[valor]) || valor || '-';
}

function rotuloTipoContrato(valor?: string) {
  return (valor && ROTULOS_TIPO_CONTRATO[valor]) || valor || '-';
}

function formatarData(data?: string) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-PT');
}

function contratoHtml(contrato: Contrato, autoPrint = false) {
  const empresa = contrato.cliente_nome || (typeof contrato.empresa === 'string' ? contrato.empresa : contrato.empresa?.nome) || contrato.empresa_detalhe?.nome || 'Empresa';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Contrato ${escapeHtml(contrato.numero || contrato.id)}</title>
  <style>
    @page { size: A4; margin: 32px; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; font-size: 13px; line-height: 1.65; background: #f8fafc; }
    .document { background: #fff; padding: 32px 40px; border-radius: 18px; }
    .header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 18px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    h1 { margin: 0; color: #2563eb; font-size: 30px; }
    h2 { margin: 0; color: #0f172a; font-size: 20px; }
    .muted { color: #64748b; }
    .contacts { margin-top: 18px; font-size: 12px; color: #475569; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 15px; font-weight: 700; color: #2563eb; margin-bottom: 12px; padding-left: 12px; border-left: 4px solid #2563eb; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: #f8fafc; padding: 12px 16px; border-radius: 14px; }
    .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    .value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 5px; }
    .status { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-weight: 700; font-size: 11px; }
    .observacoes { background: #f8fafc; padding: 18px; border-radius: 14px; min-height: 64px; }
    .assinaturas { margin-top: 52px; display: flex; justify-content: space-between; }
    .assinatura { width: 240px; text-align: center; }
    .linha { border-top: 1px solid #94a3b8; padding-top: 8px; color: #475569; }
    .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div>
        <h1>SOSTicket</h1>
        <p class="muted">Assistência Técnica e Consultoria</p>
        <div class="contacts">
          <div><strong>Tel:</strong> +244 9XX XXX XXX</div>
          <div><strong>Email:</strong> contacto@empresa.com</div>
          <div><strong>Morada:</strong> Luanda, Angola</div>
        </div>
      </div>
      <div style="text-align:right">
        <h2>Relatório de contrato</h2>
        <p class="muted">${escapeHtml(contrato.numero || contrato.id)}</p>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Dados do contrato</div>
      <div class="info-grid">
        <div class="card"><div class="label">Empresa</div><div class="value">${escapeHtml(empresa)}</div></div>
        <div class="card"><div class="label">Tipo</div><div class="value">${escapeHtml(rotuloTipoContrato(contrato.tipo_contrato))}</div></div>
        <div class="card"><div class="label">Pagamento</div><div class="value">${escapeHtml(rotuloPagamento(contrato.tipo_de_pagamento || contrato.tipo))}</div></div>
        <div class="card"><div class="label">Estado</div><div class="value"><span class="status">${escapeHtml(rotuloEstado(contrato.status))}</span></div></div>
        <div class="card"><div class="label">Horas contratadas</div><div class="value">${escapeHtml(contrato.horas_contratadas)}</div></div>
        <div class="card"><div class="label">Horas utilizadas</div><div class="value">${escapeHtml(contrato.horas_utilizadas)}</div></div>
        <div class="card"><div class="label">Valor por hora</div><div class="value">${escapeHtml(contrato.valor_hora)} Kz</div></div>
        <div class="card"><div class="label">Valor total</div><div class="value">${escapeHtml(contrato.valor_total)} Kz</div></div>
        <div class="card"><div class="label">Início</div><div class="value">${formatarData(contrato.data_inicio)}</div></div>
        <div class="card"><div class="label">Fim</div><div class="value">${formatarData(contrato.data_fim)}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Observações</div>
      <div class="observacoes">${escapeHtml(contrato.observacoes || 'Sem observações.')}</div>
    </div>
    <div class="assinaturas">
      <div class="assinatura"><div class="linha">Responsável Técnico</div></div>
      <div class="assinatura"><div class="linha">Cliente</div></div>
    </div>
    <div class="footer">Documento gerado automaticamente pelo sistema SOSTicket.</div>
  </div>
  ${autoPrint ? '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 300));</script>' : ''}
</body>
</html>`;
}

export function Contratos() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'admin';
  const isCliente = usuario?.perfil === 'cliente';
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [exibirModal, setExibirModal] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [exibirModalDetalhes, setExibirModalDetalhes] = useState(false);
  const [contratoDetalhe, setContratoDetalhe] = useState<Contrato | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Estado do formulário de novo contrato
  const [formData, setFormData] = useState({
    empresa_id: '',
    tipo: 'horas' as 'horas' | 'mensal' | 'anual',
    horas_contratadas: '0',
    horas_utilizadas: '0',
    valor_total: '0',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'activo' as any,
    descricao_contrato: '',
    observacoes: ''
  });

  const carregarContratos = async () => {
    setCarregando(true);
    setErro('');
    try {
      const response = await contratosService.listar({ 
        search: busca || undefined,
        status: (filtroStatus as any) || undefined,
        empresa_id: isCliente ? getEmpresaId(usuario?.empresa) : undefined,
        page: pagina,
        limit: 10
      });
      const lista = Array.isArray(response) 
        ? response 
        : (response as any)?.results || (response as any)?.data || [];
      setContratos(Array.isArray(lista) ? lista : []);
      setTotalPaginas((response as any)?.pagination?.total_pages || (response as any)?.total_pages || 1);
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error);
      setErro('Não foi possível carregar os contratos.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarEmpresas = async () => {
    try {
      const response = await empresasService.listar({ limit: 100 });
      const lista = Array.isArray(response) 
        ? response 
        : (response as any)?.results || (response as any)?.data?.results || (response as any)?.data || [];
      setEmpresas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error('Erro ao carregar empresas para o contrato:', err);
      setEmpresas([]);
    }
  };

  useEffect(() => {
    carregarContratos();
    carregarEmpresas();
  }, [pagina, filtroStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarContratos();
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const handleVerDetalhes = async (id: string) => {
    setCarregando(true);
    setErro('');
    try {
      const resp = await contratosService.obterPorId(id);
      setContratoDetalhe(resp);
      setExibirModalDetalhes(true);
    } catch (err) {
      console.error('Erro ao carregar detalhes do contrato:', err);
      setErro('Falha ao carregar detalhes do contrato.');
    } finally {
      setCarregando(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empresa_id) {
      setErro('Selecione uma empresa.');
      return;
    }

    setCarregando(true);
    setStatus('loading');
    setErro('');

    try {
      await contratosService.criar({
        empresa_id: formData.empresa_id,
        tipo_contrato: 'suporte', // Valor padrão ou vindo do form
        tipo_de_pagamento: formData.tipo as any,
        horas_contratadas: String(formData.horas_contratadas),
        valor_total: String(formData.valor_total),
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        status: formData.status as any,
        descricao_contrato: formData.descricao_contrato.trim() || 'Contrato de suporte técnico.',
        observacoes: formData.observacoes
      });
      
      setStatus('success');
      setTimeout(() => {
        setExibirModal(false);
        setFormData({
          empresa_id: '',
          tipo: 'horas',
          horas_contratadas: '0',
          horas_utilizadas: '0',
          valor_total: '0',
          data_inicio: new Date().toISOString().split('T')[0],
          data_fim: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          status: 'activo',
          descricao_contrato: '',
          observacoes: ''
        });
        setStatus('idle');
        carregarContratos();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao criar contrato:', err);
      setErro(err.message || 'Falha ao criar novo contrato.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setCarregando(false);
    }
  };

  const proximoDia = (data?: string) => {
    const base = data ? new Date(data) : new Date();
    base.setDate(base.getDate() + 1);
    return base.toISOString().split('T')[0];
  };

  const maisUmAno = (data?: string) => {
    const base = data ? new Date(data) : new Date();
    base.setFullYear(base.getFullYear() + 1);
    return base.toISOString().split('T')[0];
  };

  const handleRenovarContrato = async (contrato: Contrato) => {
    const empresaId = contrato.empresa_id || getEmpresaId(contrato.empresa_detalhe) || getEmpresaId(contrato.cliente);
    if (!empresaId) {
      setErro('Não foi possível identificar a empresa deste contrato para renovar.');
      return;
    }

    if (!window.confirm(`Deseja renovar o contrato de ${contrato.cliente_nome || contrato.empresa || 'empresa'}?`)) return;

    setCarregando(true);
    setErro('');
    try {
      await contratosService.criar({
        empresa_id: empresaId,
        tipo_contrato: contrato.tipo_contrato || 'suporte',
        tipo_de_pagamento: contrato.tipo_de_pagamento || contrato.tipo || 'horas',
        descricao_contrato: contrato.descricao_contrato,
        horas_contratadas: contrato.horas_contratadas,
        valor_total: contrato.valor_total,
        data_inicio: proximoDia(contrato.data_fim),
        data_fim: maisUmAno(contrato.data_fim),
        status: 'activo',
        observacoes: contrato.observacoes,
      });
      await carregarContratos();
    } catch (err: any) {
      console.error('Erro ao renovar contrato:', err);
      setErro(err.message || 'Falha ao renovar contrato.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCancelarContrato = async (contrato: Contrato) => {
    if (!window.confirm(`Deseja cancelar o contrato ${contrato.numero || contrato.id.substring(0, 8)}?`)) return;
    setCarregando(true);
    setErro('');
    try {
      await contratosService.atualizacaoParcial(contrato.id, { status: 'cancelado' });
      await carregarContratos();
    } catch (err: any) {
      console.error('Erro ao cancelar contrato:', err);
      setErro(err.message || 'Falha ao cancelar contrato.');
    } finally {
      setCarregando(false);
    }
  };

  const handleBaixarPdf = async (contrato: Contrato) => {
    setErro('');
    const iframe = document.createElement('iframe');
    try {
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '794px';
      iframe.style.height = '1123px';
      iframe.srcdoc = contratoHtml(contrato);

      const carregou = new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
      });
      document.body.appendChild(iframe);
      await carregou;

      const documento = iframe.contentDocument;
      if (!documento?.body) throw new Error('Não foi possível preparar o contrato para PDF.');

      const canvas = await html2canvas(documento.body, {
        scale: 2,
        backgroundColor: '#f8fafc',
        useCORS: true,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const image = canvas.toDataURL('image/png');

      // O contrato ocupa uma única página A4: se for mais alto do que a folha, a imagem é reduzida.
      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.addImage(image, 'PNG', (pageWidth - imgWidth) / 2, 0, imgWidth, imgHeight);

      pdf.save(`contrato_${contrato.numero || contrato.id.substring(0, 8)}.pdf`);
    } catch (err: any) {
      console.error('Erro ao baixar contrato:', err);
      setErro(err.message || 'Falha ao baixar o contrato em PDF.');
    } finally {
      iframe.remove();
    }
  };

  const handleEliminarContrato = async (contrato: Contrato) => {
    if (!window.confirm(`Deseja eliminar definitivamente o contrato ${contrato.numero || contrato.id.substring(0, 8)}?`)) return;
    setCarregando(true);
    setErro('');
    try {
      await contratosService.deletar(contrato.id);
      await carregarContratos();
    } catch (err: any) {
      console.error('Erro ao eliminar contrato:', err);
      setErro(err.message || 'Falha ao eliminar contrato.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Contratos</h2>
          <p className="text-sm text-gray-500">Controlo de pacotes de horas e mensalidades.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setExibirModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            <span>Novo contrato</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por número ou cliente..." 
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-theme-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="flex-1 md:flex-none bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-theme-primary text-gray-600"
          >
            <option value="">Todos os estados</option>
            <option value="activo">Ativos</option>
            <option value="expirado">Expirados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <button className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-theme-primary hover:bg-theme-primary-light transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {carregando ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))
        ) : contratos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum contrato encontrado.</p>
          </div>
        ) : contratos.map((contrato) => {
          const percHoras = contrato.horas_contratadas ? Math.min(100, Math.round((Number(contrato.horas_utilizadas) / Number(contrato.horas_contratadas)) * 100)) : 0;
          const statusCor = contrato.status === 'activo' ? 'emerald' : contrato.status === 'expirado' ? 'red' : 'gray';
          
          return (
            <div key={contrato.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-${statusCor}-100 text-${statusCor}-600`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">#{contrato.numero || contrato.id.substring(0, 6).toUpperCase()}</h3>
                      <p className="text-sm font-bold text-gray-500">{contrato.cliente_nome}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full bg-${statusCor}-50 text-${statusCor}-600 border border-${statusCor}-100`}>
                    {rotuloEstado(contrato.status).toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</p>
                    <p className="text-sm font-bold text-gray-900">{rotuloTipoContrato(contrato.tipo_contrato)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Valor total</p>
                    <p className="text-sm font-bold text-gray-900">{contrato.valor_total} Kz</p>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Validade</p>
                    <p className="text-sm font-bold text-gray-900">{new Date(contrato.data_fim).toLocaleDateString('pt-PT')}</p>
                  </div>
                </div>

                {contrato.tipo_de_pagamento === 'horas' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Uso de horas: <span className="font-bold text-gray-900">{formatarHoras(contrato.horas_utilizadas)}</span> / {formatarHoras(contrato.horas_contratadas)}</span>
                      </div>
                      <span className={`font-bold ${percHoras > 90 ? 'text-red-600' : percHoras > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{percHoras}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percHoras > 90 ? 'bg-red-500' : percHoras > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percHoras}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => handleVerDetalhes(contrato.id)}
                    className="px-3 py-2 text-sm font-bold text-theme-primary bg-white border border-theme-primary/20 hover:bg-theme-primary-light rounded-lg flex items-center gap-1"
                  >
                    Ver detalhes <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                   <button
                    onClick={() => handleEliminarContrato(contrato)}
                    className="px-3 py-2 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => handleRenovarContrato(contrato)}
                    className="px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Renovar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar Contrato */}
      {exibirModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Novo contrato</h3>
              <button onClick={() => setExibirModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Empresa *</label>
                  <select 
                    name="empresa_id"
                    required
                    value={formData.empresa_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {empresas.map((empresa) => {
                      const empresaNome = getEmpresaNome(empresa);
                      return <option key={empresa.id} value={empresa.id}>{empresaNome}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Tipo de pagamento *</label>
                  <select 
                    name="tipo"
                    required
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary bg-white"
                  >
                    <option value="horas">Pacote de horas</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Horas contratadas *</label>
                    <input 
                      type="text" 
                      name="horas_contratadas"
                      required
                      value={formData.horas_contratadas}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Horas utilizadas</label>
                    <input 
                      type="text" 
                      name="horas_utilizadas"
                      value={formData.horas_utilizadas}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Valor total (Kz) *</label>
                  <input 
                    type="text" 
                    name="valor_total"
                    required
                    value={formData.valor_total}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Descrição do contrato *</label>
                  <textarea
                    name="descricao_contrato"
                    required
                    value={formData.descricao_contrato}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Ex.: Contrato de suporte técnico e manutenção."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Data de início *</label>
                    <input 
                      type="date" 
                      name="data_inicio"
                      required
                      value={formData.data_inicio}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">Data de fim *</label>
                    <input 
                      type="date" 
                      name="data_fim"
                      required
                      value={formData.data_fim}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Observações</label>
                  <textarea 
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={() => setExibirModal(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
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
                      <span>A guardar...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Contrato criado!</span>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Erro ao guardar</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Guardar contrato</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1 || carregando}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-theme-primary hover:border-theme-primary disabled:opacity-30 transition-all bg-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || carregando}
              className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-theme-primary hover:border-theme-primary disabled:opacity-30 transition-all bg-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Contrato */}
      {exibirModalDetalhes && contratoDetalhe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-theme-primary text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Detalhes do contrato</h3>
                  <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
                    #{contratoDetalhe.id?.substring(0, 8) || 'CONTRATO'}
                  </p>
                </div>
              </div>
              <button onClick={() => setExibirModalDetalhes(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Cliente e Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <User className="w-6 h-6 text-theme-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                    <h4 className="text-lg font-bold text-gray-900">{contratoDetalhe.cliente_nome}</h4>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado atual</p>
                  <span className={`px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-tighter ${
                    contratoDetalhe.status === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {rotuloEstado(contratoDetalhe.status)}
                  </span>
                </div>
              </div>

              {/* Grid de Informações Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</p>
                  <p className="text-sm font-bold text-gray-900">{rotuloTipoContrato(contratoDetalhe.tipo_contrato)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</p>
                  <p className="text-sm font-bold text-gray-900">{rotuloPagamento(contratoDetalhe.tipo_de_pagamento)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início</p>
                    <p className="text-sm font-bold text-gray-900">
                      {contratoDetalhe.data_inicio ? new Date(contratoDetalhe.data_inicio).toLocaleDateString('pt-PT') : '-'}
                    </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fim</p>
                    <p className="text-sm font-bold text-gray-900">
                      {contratoDetalhe.data_fim ? new Date(contratoDetalhe.data_fim).toLocaleDateString('pt-PT') : '-'}
                    </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Estatísticas de Horas e Valores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Horas contratadas</p>
                  </div>
                  <p className="text-xl font-black text-indigo-700">{formatarHoras(contratoDetalhe.horas_contratadas)}</p>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Horas utilizadas</p>
                  </div>
                  <p className="text-xl font-black text-amber-700">{formatarHoras(contratoDetalhe.horas_utilizadas)}</p>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Horas disponíveis</p>
                  </div>
                  <p className="text-xl font-black text-emerald-700">{formatarHoras(contratoDetalhe.horas_disponiveis)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor total do contrato</p>
                  <p className="text-2xl font-black text-gray-900">{Number(contratoDetalhe.valor_total).toLocaleString()} Kz</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor por hora</p>
                  <p className="text-2xl font-black text-gray-900">{Number(contratoDetalhe.valor_hora).toLocaleString()} Kz</p>
                </div>
              </div>

              {contratoDetalhe.observacoes && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações internas</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl italic">"{contratoDetalhe.observacoes}"</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button
                onClick={() => handleBaixarPdf(contratoDetalhe)}
                className="mr-3 px-8 py-3 bg-white border border-theme-primary text-theme-primary text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-theme-primary-light transition-all"
              >
                Baixar PDF
              </button>
              <button 
                onClick={() => setExibirModalDetalhes(false)}
                className="px-8 py-3 bg-theme-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 hover:bg-theme-primary-hover transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
