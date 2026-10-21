import type { AuthResponse, Device, RelayCommand, SensorReading, User } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const TOKEN_KEY = 'smartfarm_token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, `Tidak bisa terhubung ke server (${API_URL})`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(res.status, msg ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => request<User>('/auth/me'),

  devices: () => request<Device[]>('/devices'),
  device: (id: number) => request<Device>(`/devices/${id}`),
  createDevice: (name: string, location: string) =>
    request<Device>('/devices', { method: 'POST', body: JSON.stringify({ name, location }) }),
  deleteDevice: (id: number) => request<{ ok: true }>(`/devices/${id}`, { method: 'DELETE' }),
  readings: (id: number, limit = 48) => request<SensorReading[]>(`/devices/${id}/readings?limit=${limit}`),
  commands: (id: number) => request<RelayCommand[]>(`/devices/${id}/commands`),
  sendCommand: (id: number, relay: number, action: 'ON' | 'OFF', durationMs?: number) =>
    request<RelayCommand>(`/devices/${id}/commands`, {
      method: 'POST',
      body: JSON.stringify({ relay, action, durationMs }),
    }),
};
