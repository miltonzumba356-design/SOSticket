import { useEffect, useState } from 'react';
import { clientesService, tecnicosService } from '../services/api';

interface Diretorio {
  porId: Map<string, string>;
  porEmail: Map<string, string>;
  porNome: Map<string, string>;
}

function normalizarLista(response: any): any[] {
  const lista = Array.isArray(response)
    ? response
    : response?.results || response?.data?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

let diretorio: Diretorio | null = null;
let pedido: Promise<Diretorio> | null = null;
const ouvintes = new Set<() => void>();

async function construirDiretorio(): Promise<Diretorio> {
  const novo: Diretorio = { porId: new Map(), porEmail: new Map(), porNome: new Map() };

  // Cada lista pode ser recusada consoante o perfil; o que falhar fica simplesmente sem foto.
  const [tecnicos, clientes] = await Promise.all([
    tecnicosService.listar({ limit: 500 }).catch(() => []),
    clientesService.listar({ limit: 500 }).catch(() => []),
  ]);

  [...normalizarLista(tecnicos), ...normalizarLista(clientes)].forEach((item) => {
    const url = item?.avatar_url;
    if (!url) return;
    if (item.id) novo.porId.set(String(item.id), url);
    if (item.email) novo.porEmail.set(String(item.email).toLowerCase(), url);
    if (item.nome) novo.porNome.set(String(item.nome).toLowerCase(), url);
  });

  return novo;
}

export function carregarDiretorioAvatares(forcar = false) {
  if (forcar) {
    pedido = null;
  }

  if (!pedido) {
    pedido = construirDiretorio().then((resultado) => {
      diretorio = resultado;
      ouvintes.forEach((ouvinte) => ouvinte());
      return resultado;
    });
  }

  return pedido;
}

export function invalidarDiretorioAvatares() {
  diretorio = null;
  pedido = null;
}

interface Referencia {
  id?: string | null;
  email?: string | null;
  nome?: string | null;
}

/** Devolve a foto de qualquer utilizador conhecido (técnicos e clientes), pelo id, email ou nome. */
export function useFotoDeUtilizador({ id, email, nome }: Referencia) {
  const [, atualizar] = useState(0);

  useEffect(() => {
    const ouvinte = () => atualizar((valor) => valor + 1);
    ouvintes.add(ouvinte);
    carregarDiretorioAvatares();
    return () => {
      ouvintes.delete(ouvinte);
    };
  }, []);

  if (!diretorio) return undefined;
  return (
    (id ? diretorio.porId.get(String(id)) : undefined) ||
    (email ? diretorio.porEmail.get(email.toLowerCase()) : undefined) ||
    (nome ? diretorio.porNome.get(nome.toLowerCase()) : undefined)
  );
}
