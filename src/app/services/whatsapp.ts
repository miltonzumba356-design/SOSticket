// Serviço de envio de notificações via WhatsApp (Evolution API)
const WHATSAPP_API_URL =
  'https://whatsapp-api.electrosoftwares.com/message/sendText/hunter-d8b7488806cb5b9677fe3e22777e7cd1';
const WHATSAPP_API_KEY = '80816CAF-5D19-49E7-A0AB-7F27E2F09379';

function formatarNumero(numero: string): string {
  return numero.replace(/\D/g, '');
}

export async function sendText(number: string, text: string): Promise<void> {
  const numeroFormatado = formatarNumero(number);
  if (!numeroFormatado || !text) return;

  try {
    await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: WHATSAPP_API_KEY,
      },
      body: JSON.stringify({ number: numeroFormatado, text }),
    });
  } catch (error) {
    console.error('Erro ao enviar notificação via WhatsApp:', error);
  }
}

interface NotificacaoTexto {
  titulo?: string;
  mensagem?: string;
}

export const whatsappService = {
  sendText,
  notificarUsuario(telefone: string | undefined | null, notificacao: NotificacaoTexto) {
    if (!telefone) return Promise.resolve();

    const texto = [notificacao.titulo ? `*${notificacao.titulo}*` : null, notificacao.mensagem]
      .filter(Boolean)
      .join('\n');

    if (!texto) return Promise.resolve();

    return sendText(telefone, texto);
  },
};
