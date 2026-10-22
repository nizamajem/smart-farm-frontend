import type {
  ActivityPage,
  ActivitySummary,
  AppRelease,
  AuthResponse,
  Device,
  HaEntityMap,
  HaHealth,
  HaState,
  HaSyncResult,
  IntegrationsStatus,
  LogChannel,
  LogEntry,
  LogStats,
  MqttCredentials,
  RelayCommand,
  Role,
  SensorReading,
  User,
} from './types';

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
        'x-client': 'web',
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

/** Unggah APK lewat XHR (fetch belum mendukung progres unggahan). */
function uploadRelease(
  data: { file: File; notes: string },
  onProgress: (percent: number) => void,
): Promise<AppRelease> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('notes', data.notes);
    form.append('file', data.file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/app-releases`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { message?: string | string[] } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as AppRelease);
      const msg =
        xhr.status === 413
          ? 'Berkas terlalu besar untuk diunggah'
          : Array.isArray(body?.message)
            ? body.message.join(', ')
            : body?.message ?? `HTTP ${xhr.status}`;
      reject(new ApiError(xhr.status, msg));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Koneksi terputus saat mengunggah'));
    xhr.send(form);
  });
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/auth/me'),

  users: () => request<User[]>('/users'),
  createUser: (data: { name: string; email: string; password: string; role: Role }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<{ ok: true }>(`/users/${id}`, { method: 'DELETE' }),

  haHealth: () => request<HaHealth>('/home-assistant/health'),
  haStates: (domain = 'sensor') => request<HaState[]>(`/home-assistant/states?domain=${domain}`),
  haSync: () => request<HaSyncResult>('/home-assistant/sync', { method: 'POST' }),
  setHaEntities: (deviceId: number, map: HaEntityMap) =>
    request<Device>(`/home-assistant/devices/${deviceId}`, { method: 'PUT', body: JSON.stringify(map) }),

  logStats: () => request<LogStats>('/logs'),
  logs: (channel: LogChannel, after = 0) => request<LogEntry[]>(`/logs/${channel}?after=${after}&limit=2000`),
  clearLogs: (channel: LogChannel) => request<{ ok: true }>(`/logs/${channel}`, { method: 'DELETE' }),

  integrations: () => request<IntegrationsStatus>('/integrations'),
  setIntegration: (name: 'mqtt' | 'home-assistant', enabled: boolean) =>
    request<IntegrationsStatus>(`/integrations/${name}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  mqttCredentials: (deviceId: number) => request<MqttCredentials>(`/devices/${deviceId}/mqtt`),

  appOpen: () => request<{ ok: boolean }>('/activity/app-open', { method: 'POST' }),
  activity: (userId: number, type?: string, before?: number) => {
    const q = new URLSearchParams({ limit: '30' });
    if (type) q.set('type', type);
    if (before) q.set('before', String(before));
    return request<ActivityPage>(`/users/${userId}/activity?${q}`);
  },
  activitySummary: (userId: number) => request<ActivitySummary>(`/users/${userId}/activity/summary`),

  latestRelease: () => request<{ release: AppRelease | null }>('/app-releases/latest'),
  releases: () => request<AppRelease[]>('/app-releases'),
  deleteRelease: (id: number) => request<{ ok: true }>(`/app-releases/${id}`, { method: 'DELETE' }),
  releaseDownloadUrl: (id?: number) => `${API_URL}/app-releases/${id ?? 'latest'}/download`,
  uploadRelease,

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
