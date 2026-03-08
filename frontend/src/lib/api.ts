/**
 * frontend/src/lib/api.ts
 * Cliente API con JWT — auto-refresh de tokens
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ─── Manejo de tokens en sessionStorage ──────────────────────────────────────

export const tokenStorage = {
  get: (): { access: string; refresh: string } | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('auth_tokens');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set: (tokens: { access: string; refresh: string }) => {
    sessionStorage.setItem('auth_tokens', JSON.stringify(tokens));
  },
  clear: () => {
    sessionStorage.removeItem('auth_tokens');
  },
  getAccess: (): string | null => tokenStorage.get()?.access ?? null,
  getRefresh: (): string | null => tokenStorage.get()?.refresh ?? null,
};

// ─── Refresh automático (evita múltiples llamadas paralelas) ─────────────────

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = tokenStorage.getRefresh();
    if (!refresh) return null;

    try {
      const res = await fetch(`${API_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        tokenStorage.clear();
        return null;
      }
      const data = await res.json();
      const tokens = tokenStorage.get();
      if (tokens) tokenStorage.set({ ...tokens, access: data.access });
      return data.access as string;
    } catch {
      tokenStorage.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Fetch base con JWT y retry automático ───────────────────────────────────

export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const makeRequest = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  let token = tokenStorage.getAccess();
  let res = await makeRequest(token);

  // 401 → intentar refresh y reintentar
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new Error('Sesión expirada. Inicia sesión de nuevo.');
    }
  }

  // 204 No Content (DELETE)
  if (res.status === 204) return null;

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || `Error ${res.status}`);
  }

  return res.json();
}

// ─── Métodos de la API ────────────────────────────────────────────────────────

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Credenciales incorrectas.');
    }
    const data = await res.json();
    tokenStorage.set({ access: data.access, refresh: data.refresh });
    return data;
  },

  logout: async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      await apiFetch('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    } finally {
      tokenStorage.clear();
    }
  },

  me: () => apiFetch('/auth/me/'),

  changePassword: (current_password: string, new_password: string) =>
    apiFetch('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  // ── Servicios ─────────────────────────────────────────────────────────────
  getServicios: (todos = false) =>
    apiFetch(`/servicios/${todos ? '' : '?activo=true'}`),
  createServicio: (data: object) =>
    apiFetch('/servicios/', { method: 'POST', body: JSON.stringify(data) }),
  updateServicio: (id: number, data: object) =>
    apiFetch(`/servicios/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServicio: (id: number) =>
    apiFetch(`/servicios/${id}/`, { method: 'DELETE' }),

  // ── Productos ─────────────────────────────────────────────────────────────
  getProductos: (params?: string) =>
    apiFetch(`/productos/${params ? '?' + params : ''}`),
  createProducto: (data: object) =>
    apiFetch('/productos/', { method: 'POST', body: JSON.stringify(data) }),
  updateProducto: (id: number, data: object) =>
    apiFetch(`/productos/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProducto: (id: number) =>
    apiFetch(`/productos/${id}/`, { method: 'DELETE' }),

  // ── Clientas ──────────────────────────────────────────────────────────────
  getClientas: (search?: string) =>
    apiFetch(`/clientas/${search ? '?search=' + search : ''}`),
  getClientaHistorial: (id: number) =>
    apiFetch(`/clientas/${id}/historial/`),
  createClienta: (data: object) =>
    apiFetch('/clientas/', { method: 'POST', body: JSON.stringify(data) }),
  updateClienta: (id: number, data: object) =>
    apiFetch(`/clientas/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClienta: (id: number) =>
    apiFetch(`/clientas/${id}/`, { method: 'DELETE' }),

  // ── Citas ─────────────────────────────────────────────────────────────────
  getCitas: (params?: string) =>
    apiFetch(`/citas/${params ? '?' + params : ''}`),
  createCita: (data: object) =>
    apiFetch('/citas/', { method: 'POST', body: JSON.stringify(data) }),
  updateCita: (id: number, data: object) =>
    apiFetch(`/citas/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  confirmarCita: (id: number) =>
    apiFetch(`/citas/${id}/confirmar/`, { method: 'POST' }),
  completarCita: (id: number) =>
    apiFetch(`/citas/${id}/completar/`, { method: 'POST' }),
  cancelarCita: (id: number) =>
    apiFetch(`/citas/${id}/cancelar/`, { method: 'POST' }),
  deleteCita: (id: number) =>
    apiFetch(`/citas/${id}/`, { method: 'DELETE' }),
  getQRCita: (id: number) =>
    apiFetch(`/citas/${id}/qr/`),

  // ── Bloqueos ──────────────────────────────────────────────────────────────
  getBloqueos: (params?: string) =>
    apiFetch(`/bloqueos/${params ? '?' + params : ''}`),
  createBloqueo: (data: object) =>
    apiFetch('/bloqueos/', { method: 'POST', body: JSON.stringify(data) }),
  deleteBloqueo: (id: number) =>
    apiFetch(`/bloqueos/${id}/`, { method: 'DELETE' }),

  // ── Órdenes ───────────────────────────────────────────────────────────────
  getOrdenes: (params?: string) =>
    apiFetch(`/ordenes/${params ? '?' + params : ''}`),
  createOrden: (data: object) =>
    apiFetch('/ordenes/', { method: 'POST', body: JSON.stringify(data) }),
  confirmarPagoOrden: (id: number, referencia: string) =>
    apiFetch(`/ordenes/${id}/confirmar_pago/`, {
      method: 'POST',
      body: JSON.stringify({ referencia }),
    }),
  cancelarOrden: (id: number) =>
    apiFetch(`/ordenes/${id}/cancelar/`, { method: 'POST' }),
  deleteOrden: (id: number) =>
    apiFetch(`/ordenes/${id}/`, { method: 'DELETE' }),

  // ── Stats & Reportes ──────────────────────────────────────────────────────
  getStats: () => apiFetch('/stats/'),
  getReportesMensuales: (year?: number) =>
    apiFetch(`/reportes/mensuales/${year ? '?year=' + year : ''}`),
  getDisponibilidad: (fecha: string, servicio_id: number) =>
    apiFetch(`/disponibilidad/?fecha=${fecha}&servicio_id=${servicio_id}`),

  // ── Seed ──────────────────────────────────────────────────────────────────
  seedData: () => apiFetch('/seed/', { method: 'POST' }),
};