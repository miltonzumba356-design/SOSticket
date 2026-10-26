import { intervencoesService, tarefasService } from '../services/api';
import { Intervencao, Tarefa, Tecnico } from '../types/api';

function normalizarLista<T>(response: any): T[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

function pad(valor: number) {
  return String(valor).padStart(2, '0');
}

export function paraInputData(data: Date) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

/** Segunda-feira da semana que contém a data indicada (00:00 local). */
export function inicioDaSemana(data: Date) {
  const inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diasDesdeSegunda = (inicio.getDay() + 6) % 7;
  inicio.setDate(inicio.getDate() - diasDesdeSegunda);
  return inicio;
}

function escapar(valor: unknown) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataValida(valor?: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataHora(valor?: string | null) {
  const data = dataValida(valor);
  return data ? data.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '-';
}

function rotulo(valor?: string | null) {
  return valor ? valor.replace(/_/g, ' ') : '-';
}

function dentroDaSemana(valores: Array<string | null | undefined>, inicio: Date, fim: Date) {
  return valores.some((valor) => {
    const data = dataValida(valor);
    return !!data && data >= inicio && data < fim;
  });
}

export async function imprimirRelatorioSemanal(tecnico: Tecnico, referencia: Date) {
  // A janela abre já no clique para o browser não bloquear o pop-up durante os pedidos à API.
  const janela = window.open('', '_blank');
  if (!janela) {
    throw new Error('O browser bloqueou a janela de impressão. Permita pop-ups para este site.');
  }
  janela.document.write('<p style="font-family:sans-serif">A preparar relatório...</p>');

  try {
    const inicio = inicioDaSemana(referencia);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 7);
    const ultimoDia = new Date(fim);
    ultimoDia.setDate(ultimoDia.getDate() - 1);

    const [respTarefas, respIntervencoes] = await Promise.all([
      tarefasService.listar({ limit: 500 }),
      intervencoesService.listar({ limit: 500, tecnico_id: tecnico.id }).catch(() => []),
    ]);

    const tarefas = normalizarLista<Tarefa>(respTarefas)
      .filter((tarefa) => tarefa.atribuido_a?.id === tecnico.id)
      .filter((tarefa) =>
        dentroDaSemana([tarefa.data_inicio, tarefa.data_fim, tarefa.data_conclusao], inicio, fim)
      )
      .sort((a, b) => (a.data_inicio || a.data_fim || '').localeCompare(b.data_inicio || b.data_fim || ''));

    const intervencoes = normalizarLista<Intervencao>(respIntervencoes)
      .filter((item) =>
        dentroDaSemana(
          [item.data_inicio_intervencao || item.data_abertura, item.data_fim_intervencao],
          inicio,
          fim
        )
      )
      .sort((a, b) =>
        (a.data_inicio_intervencao || a.data_abertura || '').localeCompare(b.data_inicio_intervencao || b.data_abertura || '')
      );

    const concluidas = tarefas.filter((t) => t.estado === 'concluida' || t.estado === 'verificado').length;
    const emProgresso = tarefas.filter((t) => t.estado === 'em_progresso').length;
    const pendentes = tarefas.filter((t) => t.estado === 'pendente').length;
    const expiradas = tarefas.filter((t) => t.estado === 'expirado').length;

    const periodo = `${inicio.toLocaleDateString('pt-PT')} a ${ultimoDia.toLocaleDateString('pt-PT')}`;

    const linhasTarefas = tarefas.length
      ? tarefas
          .map(
            (t) => `<tr>
              <td>${escapar(t.numero || '-')}</td>
              <td>${escapar(t.titulo)}</td>
              <td>${escapar(rotulo(t.estado))}</td>
              <td>${escapar(t.prioridade || '-')}</td>
              <td>${escapar(formatarDataHora(t.data_inicio))}</td>
              <td>${escapar(formatarDataHora(t.data_fim))}</td>
              <td>${escapar(formatarDataHora(t.data_conclusao))}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="vazio">Sem tarefas nesta semana.</td></tr>';

    const linhasIntervencoes = intervencoes.length
      ? intervencoes
          .map(
            (i) => `<tr>
              <td>${escapar(i.numero || '-')}</td>
              <td>${escapar(i.titulo)}</td>
              <td>${escapar(i.cliente_nome || '-')}</td>
              <td>${escapar(rotulo(i.status))}</td>
              <td>${escapar(formatarDataHora(i.data_inicio_intervencao || i.data_abertura))}</td>
              <td>${escapar(formatarDataHora(i.data_fim_intervencao))}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="6" class="vazio">Sem intervenções nesta semana.</td></tr>';

    janela.document.open();
    janela.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Relatório semanal - ${escapar(tecnico.nome)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 32px; font-size: 12px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 2px solid #4f46e5; padding-bottom: 4px; }
    .sub { color: #6b7280; margin: 0 0 16px; }
    .resumo { display: flex; gap: 12px; margin: 16px 0; }
    .resumo div { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
    .resumo strong { display: block; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    td { text-transform: none; }
    .vazio { text-align: center; color: #6b7280; padding: 16px; }
    .rodape { margin-top: 32px; color: #6b7280; font-size: 11px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>Relatório de atividades semanais</h1>
  <p class="sub">Técnico: <strong>${escapar(tecnico.nome)}</strong>${tecnico.email ? ` (${escapar(tecnico.email)})` : ''} &middot; Semana: ${escapar(periodo)}</p>

  <div class="resumo">
    <div><strong>${tarefas.length}</strong>Tarefas</div>
    <div><strong>${concluidas}</strong>Concluídas</div>
    <div><strong>${emProgresso}</strong>Em progresso</div>
    <div><strong>${pendentes}</strong>Pendentes</div>
    <div><strong>${expiradas}</strong>Expiradas</div>
    <div><strong>${intervencoes.length}</strong>Intervenções</div>
  </div>

  <h2>Tarefas</h2>
  <table>
    <thead><tr><th>N.º</th><th>Título</th><th>Estado</th><th>Prioridade</th><th>Início</th><th>Fim / Prazo</th><th>Concluída em</th></tr></thead>
    <tbody>${linhasTarefas}</tbody>
  </table>

  <h2>Intervenções</h2>
  <table>
    <thead><tr><th>N.º</th><th>Título</th><th>Cliente</th><th>Estado</th><th>Início</th><th>Fim</th></tr></thead>
    <tbody>${linhasIntervencoes}</tbody>
  </table>

  <p class="rodape">Gerado em ${escapar(new Date().toLocaleString('pt-PT'))} &middot; SOSTicket</p>
  <script>window.addEventListener('load', function () { window.focus(); window.print(); });</script>
</body>
</html>`);
    janela.document.close();
  } catch (error) {
    janela.close();
    throw error;
  }
}
