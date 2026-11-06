import type {
  ActivityPage,
  ActivitySummary,
  AppRelease,
  AuthResponse,
  Device,
  HaEntityMap,
  HaRelayMap,
  HaRelayStatus,
  HaMcbStatus,
  NutrientRecipe, NutrientStatus, MixPlan, PumpChannel, PumpCalibration, PhPlan,
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
  nutrientStatus: (id: number) => request<NutrientStatus>(`/devices/${id}/nutrients`),
  phDosePlan: (id: number, channel: 'phUp' | 'phDown', ml: number) => request<PhPlan>(`/devices/${id}/nutrients/ph/plan`, { method: 'POST', body: JSON.stringify({ channel, ml }) }),
  startPhDose: (id: number, plan: PhPlan, requestId: string) => request<NutrientStatus>(`/devices/${id}/nutrients/ph/dose`, { method: 'POST', body: JSON.stringify({ channel: plan.channel, ml: plan.ml, calibrationKey: plan.calibrationKey, requestId }) }),
  stopPhDose: (id: number) => request<NutrientStatus>(`/devices/${id}/nutrients/ph/stop`, { method: 'POST' }),
  saveDosingPump: (id: number, channel: PumpChannel, calibration: PumpCalibration) => request<NutrientStatus>(`/devices/${id}/nutrients/pumps/${channel}`, { method: 'PUT', body: JSON.stringify(calibration) }),
  importDosingPump: (id: number, channel: PumpChannel, calibration: PumpCalibration) => request<NutrientStatus>(`/devices/${id}/nutrients/pumps/${channel}/import`, { method: 'POST', body: JSON.stringify(calibration) }),
  saveNutrientRecipe: (id: number, recipe: NutrientRecipe) => request<NutrientStatus>(`/devices/${id}/nutrients/recipe`, { method: 'PUT', body: JSON.stringify(recipe) }),
  nutrientPlan: (id: number, liters: number) => request<MixPlan>(`/devices/${id}/nutrients/plan`, { method: 'POST', body: JSON.stringify({ liters }) }),
  startNutrientMix: (id: number, plan: MixPlan, requestId: string) => request<NutrientStatus>(`/devices/${id}/nutrients/mix`, { method: 'POST', body: JSON.stringify({ liters: plan.liters, calibrationKey: plan.calibrationKey, requestId, newWater: true }) }),
  stopNutrientMix: (id: number) => request<NutrientStatus>(`/devices/${id}/nutrients/stop`, { method: 'POST' }),
  setMcbSensors: (id: number, power: string, energy: string) => request<Device>(`/home-assistant/devices/${id}/mcb/sensors`, { method: 'PUT', body: JSON.stringify({ power, energy }) }),
  haMcbStatus: (id: number) => request<HaMcbStatus>(`/home-assistant/devices/${id}/mcb`),
  setHaMcb: (id: number, entityId: string) => request<Device>(`/home-assistant/devices/${id}/mcb`, { method: 'PUT', body: JSON.stringify({ entityId }) }),
  commandHaMcb: (id: number, action: 'ON' | 'OFF') => request<HaMcbStatus>(`/home-assistant/devices/${id}/mcb/command`, { method: 'POST', body: JSON.stringify({ action }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/auth/me'),

  users: () => request<User[]>('/users'),
  createUser: (data: { name: string; email: string; password: string; role: Role }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<{ ok: true }>(`/users/${id}`, { method: 'DELETE' }),

  haHealth: () => request<HaHealth>('/home-assistant/health'),
  haStates: (domain = 'sensor') => request<HaState[]>(`/home-assistant/states?domain=${domain}`),
  haRelayEntities: () => request<HaState[]>('/home-assistant/relay-entities'),
  haRelayStatus: (deviceId: number) => request<HaRelayStatus[]>(`/home-assistant/devices/${deviceId}/relays`),
  manualRelay: (id: number, relay: number, on: boolean) => request<HaRelayStatus[]>(`/home-assistant/devices/${id}/relays/manual`, { method: 'POST', body: JSON.stringify({ relay, action: on ? 'ON' : 'OFF' }) }),
  readingHistory: (from: string, to: string, offset = 0, deviceId?: number) => request<SensorReading[]>(`/devices/${deviceId == null ? 'readings/history' : `${deviceId}/readings`}?${new URLSearchParams({ from, to, offset: String(offset), limit: '200' })}`),
  setHaRelays: (deviceId: number, map: HaRelayMap) => request<Device>(`/home-assistant/devices/${deviceId}/relays`, { method: 'PUT', body: JSON.stringify(map) }),
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
  createDevice: (name: string, location: string, relayLabels?: string[]) =>
    request<Device>('/devices', { method: 'POST', body: JSON.stringify({ name, location, relayLabels }) }),
  updateDevice: (id: number, name: string, location: string) =>
    request<Device>(`/devices/${id}`, { method: 'PATCH', body: JSON.stringify({ name, location }) }),
  deleteDevice: (id: number) => request<{ ok: true }>(`/devices/${id}`, { method: 'DELETE' }),
  readings: (id: number, limit = 48) => request<SensorReading[]>(`/devices/${id}/readings?limit=${limit}`),
  commands: (id: number) => request<RelayCommand[]>(`/devices/${id}/commands`),
  sendCommand: (id: number, relay: number, action: 'ON' | 'OFF', durationMs?: number) =>
    request<RelayCommand>(`/devices/${id}/commands`, {
      method: 'POST',
      body: JSON.stringify({ relay, action, durationMs }),
    }),
};
