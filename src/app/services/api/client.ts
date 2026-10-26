import { RespostaPaginada, Usuario } from '../../../types/api';

const DEFAULT_API_BASE_URL = '/api';
const rawApiBaseUrl = import.meta.env?.VITE_API_URL || DEFAULT_API_BASE_URL;

function normalizeApiBaseUrl(value: string) {
  const baseUrl = value.replace(/\/+$/, '');

  if (baseUrl.endsWith('/api/v1')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/v1`;

  return `${baseUrl}/api/v1`;
}

const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);

// Ficheiros (media) são servidos pelo backend e não passam pelo proxy `/api`.
const API_ORIGIN = /^https?:\/\//.test(rawApiBaseUrl)
  ? new URL(rawApiBaseUrl).origin
  : 'https://suportapi-production.up.railway.app';

export function resolverUrlFicheiro(url?: string | null) {
  if (!url) return undefined;
  if (/^(blob:|data:)/.test(url)) return url;
  // Páginas https bloqueiam imagens http (conteúdo misto): usa https para ficheiros do backend.
  if (/^https?:/.test(url)) {
    return typeof window !== 'undefined' && window.location.protocol === 'https:' ? url.replace(/^http:/, 'https:') : url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function buildQuery(params?: QueryParams) {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const text = query.toString();
  return text ? `?${text}` : '';
}

export function normalizePath(path: string) {
  const [pathname, query = ''] = path.split('?');
  const cleanPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return query ? `${cleanPathname}?${query}` : cleanPathname;
}

export function getToken() {
  return localStorage.getItem('auth_token');
}

export function decodeJwtPayload(token?: string | null) {
  if (!token) return undefined;

  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return JSON.parse(decoded);
  } catch {
    return undefined;
  }
}

export function usuarioFromToken(token?: string | null): Partial<Usuario> | undefined {
  const payload = decodeJwtPayload(token);
  if (!payload) return undefined;

  const email = payload.email || payload.user_email || payload.username;
  const perfil = payload.perfil || payload.role || payload.tipo || payload.user_type;

  if (!email && !perfil) return undefined;

  return {
    id: payload.user_id || payload.id || payload.sub || email || 'token-user',
    nome: payload.nome || payload.name || payload.first_name || email || 'Utilizador',
    email,
    perfil,
  };
}

export function persistAuthTokens(response: any) {
  const access = response?.access_token || response?.access || response?.token || response?.data?.access_token || response?.data?.access;
  const refresh = response?.refresh_token || response?.refresh || response?.data?.refresh_token || response?.data?.refresh;

  if (access) localStorage.setItem('auth_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

async function parseResponse(response: Response) {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

function unwrapResponse<T>(data: any): T {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }

  return data as T;
}

function errorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error?.details) {
    const details = data.error.details;
    const messages = Object.entries(details).flatMap(([field, value]) => {
      const list = Array.isArray(value) ? value : [value];
      return list.map((message) => `${field}: ${String(message)}`);
    });
    if (messages.length) return messages.join(' ');
  }
  if (data.error?.message) return data.error.message;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  if (data.error) return data.error;

  const firstFieldError = Object.values(data).flat().find(Boolean);
  if (typeof firstFieldError === 'string') return firstFieldError;

  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

function shouldKeepPathWithoutTrailingSlash(pathname: string) {
  return ['/perfil', '/perfil/password', '/configuracoes'].includes(pathname);
}

function withBackendTrailingSlash(path: string) {
  const normalized = normalizePath(path);
  const [pathname, query = ''] = normalized.split('?');

  if (pathname.endsWith('/') || shouldKeepPathWithoutTrailingSlash(pathname)) {
    return normalized;
  }

  return `${pathname}/${query ? `?${query}` : ''}`;
}

export async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = withBackendTrailingSlash(path);
  const url = `${API_BASE_URL}${normalizedPath}`;
  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 404 && !normalizedPath.split('?')[0].endsWith('/')) {
    const [pathname, query = ''] = normalizedPath.split('?');
    response = await fetch(`${API_BASE_URL}${pathname}/${query ? `?${query}` : ''}`, {
      ...options,
      headers,
    });
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(data, `Erro ${response.status} ao comunicar com a API.`), data);
  }

  return unwrapResponse<T>(data);
}

export const list = <T>(path: string, params?: QueryParams) =>
  fetchAPI<RespostaPaginada<T>>(`${path}${buildQuery(params)}`);

export const create = <T>(path: string, data: unknown) =>
  fetchAPI<T>(path, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const update = <T>(path: string, data: unknown, method: 'PUT' | 'PATCH' = 'PUT') =>
  fetchAPI<T>(path, {
    method,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export async function fetchFile(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${withBackendTrailingSlash(path)}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await parseResponse(response);
    throw new ApiError(response.status, errorMessage(data, `Erro ${response.status} ao baixar ficheiro.`), data);
  }

  return response.blob();
}
