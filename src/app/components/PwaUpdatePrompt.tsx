import { useRegisterSW } from 'virtual:pwa-register/react';

// Exibe um aviso quando o app pode ser instalado/atualizado como PWA.
// Não interfere em nenhum outro fluxo da aplicação.
export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Erro ao registar o service worker do PWA:', error);
    },
  });

  if (!offlineReady && !needRefresh) return null;

  const fechar = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
      <p className="text-sm font-bold text-gray-900">
        {needRefresh ? 'Nova versão disponível' : 'SOSTicket pronto para uso offline'}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {needRefresh
          ? 'Atualize para obter as últimas melhorias do sistema.'
          : 'A aplicação já pode ser instalada e usada sem ligação à internet.'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        {needRefresh && (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Atualizar
          </button>
        )}
        <button
          type="button"
          onClick={fechar}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
