import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Intervencoes } from './components/Intervencoes';
import { Clientes } from './components/Clientes';
import { Empresas } from './components/Empresas';
import { Tecnicos } from './components/Tecnicos';
import { Contratos } from './components/Contratos';
import { Relatorios } from './components/Relatorios';
import { Configuracoes } from './components/Configuracoes';
import { Perfil } from './components/Perfil';
import { Horas } from './components/Horas';
import { Calendario } from './components/Calendario';
import { Register } from './components/Register';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

// Componente principal da aplicação que gerencia as rotas
function AppContent() {
  const { isAuthenticated, carregando } = useAuth();
  const [paginaAtual, setPaginaAtual] = useState('dashboard');
  const [mostrandoRegistro, setMostrandoRegistro] = useState(false);

  // Mostra tela de carregamento enquanto verifica autenticação
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostra tela de login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Função para renderizar o conteúdo da página atual
  const renderizarPagina = () => {
    // Dashboard handles
    if (paginaAtual === 'dashboard' || paginaAtual.startsWith('dashboard_')) {
      return <Dashboard onNavigate={setPaginaAtual} />;
    }
    
    // Clientes handles
    if (paginaAtual === 'clientes' || paginaAtual.startsWith('clientes_')) {
      return <Clientes />;
    }

    if (paginaAtual === 'empresas' || paginaAtual.startsWith('empresas_')) {
      return <Empresas />;
    }

    // Intervenções handles
    if (paginaAtual === 'intervencoes' || paginaAtual.startsWith('intervencoes_')) {
      return <Intervencoes onNavigate={setPaginaAtual} />;
    }

    // Tecnicos handles
    if (paginaAtual === 'tecnicos' || paginaAtual.startsWith('tecnicos_')) {
      return <Tecnicos />;
    }

    // Contratos handles
    if (paginaAtual === 'contratos' || paginaAtual.startsWith('contratos_')) {
      return <Contratos />;
    }

    // Horas handles
    if (paginaAtual === 'horas' || paginaAtual.startsWith('horas_')) {
      return <Horas />;
    }

    // Calendario handles
    if (paginaAtual === 'calendario' || paginaAtual.startsWith('calendario_')) {
      return <Calendario />;
    }

    // Relatorios handles
    if (paginaAtual === 'relatorios' || paginaAtual.startsWith('relatorios_')) {
      return <Relatorios />;
    }

    // Configuracoes handles
    if (paginaAtual === 'configuracoes' || paginaAtual.startsWith('config_')) {
      return <Configuracoes />;
    }

    // Perfil handles
    if (paginaAtual === 'perfil' || paginaAtual.startsWith('perfil_')) {
      return <Perfil />;
    }

    return <Dashboard />;
  };

  return (
    <Layout paginaAtual={paginaAtual} onNavigate={setPaginaAtual}>
      {renderizarPagina()}
    </Layout>
  );
}

import { CronometroProvider } from './contexts/CronometroContext';

// Componente raiz que envolve tudo com o AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <CronometroProvider>
        <AppContent />
      </CronometroProvider>
      <PwaUpdatePrompt />
    </AuthProvider>
  );
}
