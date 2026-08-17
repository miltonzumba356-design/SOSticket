import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCronometro } from '../contexts/CronometroContext';
import { adminMenu, MenuItem } from '../data/AdminMenu';
import { notificacoesService } from '../services/api';
import { whatsappService } from '../services/whatsapp';
import { Notificacao } from '../types/api';
import {
  LayoutDashboard,
  Ticket,
  Users,
  UserCog,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  Calendar,
  Clock,
  Building2
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  paginaAtual: string;
  onNavigate: (pagina: string) => void;
}

import { WidgetCronometro } from './WidgetCronometro';

// Componente de layout principal da aplicação
export function Layout({ children, paginaAtual, onNavigate }: LayoutProps) {
  const { usuario, logout } = useAuth();
  const { cronometros } = useCronometro();
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [painelNotificacoes, setPainelNotificacoes] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [avisoNotificacoes, setAvisoNotificacoes] = useState(false);

  const tentarLogout = () => {
    const temCronometroPendente = cronometros.some((cronometro) =>
      ['ativo', 'pausado'].includes(cronometro.status)
    );

    if (temCronometroPendente) {
      window.alert('Existe um cronómetro ativo. Salve ou pare o cronómetro antes de terminar a sessão.');
      return;
    }

    logout();
  };

  const obterNotificacoesJaEnviadasWhatsapp = (): Set<string> => {
    if (!usuario) return new Set();
    try {
      const guardado = localStorage.getItem(`whatsapp_notificacoes_enviadas_${usuario.id}`);
      return new Set(guardado ? JSON.parse(guardado) : []);
    } catch {
      return new Set();
    }
  };

  const marcarNotificacoesComoEnviadasWhatsapp = (ids: string[]) => {
    if (!usuario || ids.length === 0) return;
    try {
      const enviadas = obterNotificacoesJaEnviadasWhatsapp();
      ids.forEach((id) => enviadas.add(id));
      localStorage.setItem(`whatsapp_notificacoes_enviadas_${usuario.id}`, JSON.stringify(Array.from(enviadas)));
    } catch {
      // Falha ao gravar no localStorage não deve impedir o funcionamento das notificações.
    }
  };

  const dispararNotificacoesWhatsapp = (lista: Notificacao[]) => {
    if (!usuario?.telefone) return;
    try {
      const jaEnviadas = obterNotificacoesJaEnviadasWhatsapp();
      const pendentes = lista.filter((item) => item.id && !item.lida && !jaEnviadas.has(item.id));
      if (pendentes.length === 0) return;

      pendentes.forEach((item) => {
        whatsappService.notificarUsuario(usuario.telefone, item);
      });
      marcarNotificacoesComoEnviadasWhatsapp(pendentes.map((item) => item.id));
    } catch (error) {
      console.error('Erro ao disparar notificações via WhatsApp:', error);
    }
  };

  const carregarNotificacoes = async () => {
    if (!usuario) return;
    setCarregandoNotificacoes(true);
    try {
      const response = await notificacoesService.listar({ limit: 10 });
      const lista = Array.isArray(response)
        ? response
        : (response as any)?.results || (response as any)?.data || [];
      const listaFinal = Array.isArray(lista) ? lista : [];
      setNotificacoes(listaFinal);
      dispararNotificacoesWhatsapp(listaFinal);
    } catch (error) {
      console.error('Erro ao carregar notificacoes:', error);
      setNotificacoes([]);
    } finally {
      setCarregandoNotificacoes(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
  }, [usuario?.id]);

  // Verificação periódica em segundo plano para que novas notificações do backend
  // sejam encaminhadas via WhatsApp mesmo sem o utilizador abrir o painel de sinos.
  useEffect(() => {
    if (!usuario) return;
    const intervalo = window.setInterval(() => {
      carregarNotificacoes();
    }, 5000);
    return () => window.clearInterval(intervalo);
  }, [usuario?.id]);

  const notificacoesNaoLidas = notificacoes.filter((item) => !item.lida).length;

  useEffect(() => {
    if (notificacoesNaoLidas > 0 && !painelNotificacoes) {
      setAvisoNotificacoes(true);
      const timer = window.setTimeout(() => setAvisoNotificacoes(false), 10000);
      return () => window.clearTimeout(timer);
    }

    setAvisoNotificacoes(false);
  }, [notificacoesNaoLidas, painelNotificacoes]);

  const marcarNotificacaoLida = async (id: string) => {
    try {
      await notificacoesService.marcarLida(id);
      setNotificacoes((atuais) => atuais.map((item) => item.id === id ? { ...item, lida: true } : item));
    } catch (error) {
      console.error('Erro ao marcar notificacao como lida:', error);
    }
  };

  // Itens de menu baseados no perfil do usuário
  const getMenuItems = (): MenuItem[] => {
    // ... existing logic
    if (usuario?.perfil === 'admin') {
      return adminMenu;
    }

    const menuComum = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'intervencoes', label: 'Tickets', icon: Ticket },
    ];

    if (usuario?.perfil === 'tecnico') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'intervencoes', label: 'Minhas Intervenções', icon: Ticket },
        { id: 'horas', label: 'Registo de Horas', icon: Clock },
        { id: 'calendario', label: 'Calendário', icon: Calendar },
        { id: 'perfil', label: 'Meu Perfil', icon: UserCog },
      ] as MenuItem[];
    }

    if (usuario?.perfil === 'cliente') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'intervencoes', label: 'Minhas Intervenções', icon: Ticket },
        { id: 'contratos', label: 'Meus Contratos', icon: FileText },
        { id: 'perfil', label: 'Meu Perfil', icon: UserCog },
      ] as MenuItem[];
    }

    return menuComum as MenuItem[];
  };

  const menuItems = getMenuItems();

  return (
    <div className={`min-h-screen bg-gray-50 ${
      usuario?.perfil === 'tecnico' ? 'role-tecnico' : 
      usuario?.perfil === 'cliente' ? 'role-cliente' : 
      'role-admin'
    }`}>
      {/* ... existing header and sidebar ... */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl font-bold text-theme-primary">SOSTicket</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
            <div className="flex items-center gap-2">
              {avisoNotificacoes && (
                <button
                  onClick={() => {
                    setPainelNotificacoes(true);
                    setAvisoNotificacoes(false);
                    carregarNotificacoes();
                  }}
                  className="hidden md:flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-2 text-sm font-black text-red-700 shadow-sm shadow-red-100 animate-pulse"
                >
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  {notificacoesNaoLidas} nova{notificacoesNaoLidas > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => {
                  setPainelNotificacoes((aberto) => !aberto);
                  setAvisoNotificacoes(false);
                  if (!painelNotificacoes) carregarNotificacoes();
                }}
                className={`h-11 w-11 rounded-xl relative flex items-center justify-center transition-all ${
                  notificacoesNaoLidas > 0
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200 ring-4 ring-red-100 hover:bg-red-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                }`}
                aria-label={`Notificações${notificacoesNaoLidas > 0 ? `, ${notificacoesNaoLidas} não lidas` : ''}`}
              >
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute inset-0 rounded-xl bg-red-500 opacity-30 animate-ping" />
                )}
                <Bell className={`relative w-5 h-5 ${notificacoesNaoLidas > 0 ? 'animate-bounce' : ''}`} />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1 bg-white text-red-600 border-2 border-red-600 text-[11px] font-black rounded-full flex items-center justify-center">
                    {notificacoesNaoLidas > 99 ? '99+' : notificacoesNaoLidas}
                  </span>
                )}
              </button>
            </div>
            {painelNotificacoes && (
              <div className="absolute right-0 top-14 w-[min(380px,calc(100vw-2rem))] bg-white border border-gray-100 rounded-xl shadow-2xl shadow-slate-200 z-[80] overflow-hidden">
                <div className={`${notificacoesNaoLidas > 0 ? 'bg-red-600 text-white' : 'bg-white text-gray-900'} px-4 py-4 border-b border-gray-100 flex items-center justify-between`}>
                  <div>
                    <p className="text-sm font-black">Notificações</p>
                    <p className={`text-xs ${notificacoesNaoLidas > 0 ? 'text-red-50' : 'text-gray-500'}`}>{notificacoesNaoLidas} não lidas</p>
                  </div>
                  {notificacoesNaoLidas > 0 && (
                    <button
                      onClick={async () => {
                        await notificacoesService.marcarTodasLidas();
                        setNotificacoes((atuais) => atuais.map((item) => ({ ...item, lida: true })));
                      }}
                      className="text-xs font-bold text-white/90 hover:text-white underline underline-offset-4"
                    >
                      Marcar todas
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {carregandoNotificacoes ? (
                    <div className="p-6 text-sm text-gray-500 text-center">Carregando...</div>
                  ) : notificacoes.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 text-center">Sem notificações.</div>
                  ) : notificacoes.map((notificacao) => (
                    <button
                      key={notificacao.id}
                      onClick={() => marcarNotificacaoLida(notificacao.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${notificacao.lida ? 'bg-white' : 'bg-red-50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 w-2.5 h-2.5 rounded-full ${notificacao.lida ? 'bg-gray-200' : 'bg-red-600 ring-4 ring-red-100'}`} />
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${notificacao.lida ? 'font-bold text-gray-900' : 'font-black text-red-950'}`}>{notificacao.titulo}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">{notificacao.mensagem}</p>
                          {notificacao.data_criacao && (
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(notificacao.data_criacao).toLocaleString('pt-PT')}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{usuario?.nome}</p>
                <p className="text-xs text-gray-500 capitalize">{usuario?.perfil}</p>
              </div>
              <button onClick={tentarLogout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0 overflow-y-auto h-[calc(100vh-60px)]
        `}>
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isAtivo = paginaAtual === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMenuAberto(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isAtivo ? 'bg-theme-light text-theme-dark font-medium' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
            <button onClick={tentarLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 sm:hidden mt-4">
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sair</span>
            </button>
          </nav>
        </aside>

        {menuAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setMenuAberto(false)} />
        )}

        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-60px)] relative">
          {children}
          {usuario?.perfil === 'tecnico' && <WidgetCronometro />}
        </main>
      </div>
    </div>
  );
}

