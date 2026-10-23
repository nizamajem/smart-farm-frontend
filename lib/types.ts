export type Role = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface SensorReading {
  id: number;
  deviceId: number;
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  lightLux: number | null;
  ph?: number | null;
  orp?: number | null;
  conductivity?: number | null;
  tds?: number | null;
  salinity?: number | null;
  specificGravity?: number | null;
  conductivityFactor?: number | null;
  source?: 'http' | 'mqtt' | 'ha';
  createdAt: string;
}

export interface Device {
  id: number;
  name: string;
  location: string;
  apiKey: string;
  relayLabels: string[];
  haEntities: HaEntityMap | null;
  haRelays?: HaRelayMap | null;
  ownerId: number;
  lastSeenAt: string | null;
  createdAt: string;
  online: boolean;
  latestReading: SensorReading | null;
}

export interface RelayCommand {
  id: number;
  relay: number;
  action: 'ON' | 'OFF';
  durationMs: number;
  status: 'pending' | 'sent' | 'done' | 'expired' | 'failed';
  transport?: 'device' | 'ha';
  createdAt: string;
  ackAt: string | null;
}

export type HaMetric = 'temperature' | 'humidity' | 'soilMoisture' | 'lightLux' | 'ph' | 'orp' | 'conductivity' | 'tds' | 'salinity' | 'specificGravity' | 'conductivityFactor';
export type HaEntityMap = Partial<Record<HaMetric, string>>;
export type HaRelayKey = 'relay1' | 'relay2' | 'relay3' | 'relay4';
export type HaRelayMap = Partial<Record<HaRelayKey, string>>;
export interface HaRelayStatus {
  relay: number;
  entityId: string | null;
  state: 'on' | 'off' | 'unavailable' | 'unmapped';
  friendlyName: string | null;
  updatedAt: string | null;
}

export interface HaHealth {
  status: 'ok' | 'error' | 'not_configured';
  message?: string;
  baseUrl?: string;
}

export interface HaState {
  entity_id: string;
  state: string;
  attributes: { friendly_name?: string; unit_of_measurement?: string };
}

export interface HaSyncResult {
  status: 'success' | 'busy';
  devices?: number;
  inserted?: number;
  skipped?: { deviceId: number; reason: string }[];
}

export interface AppRelease {
  id: number;
  version: string;
  versionCode: number | null;
  notes: string;
  size: number;
  sha256: string;
  downloads?: number;
  createdAt: string;
}

export type ActivityType = 'login' | 'login_failed' | 'app_open' | 'action';

export interface ActivityLog {
  id: number;
  type: ActivityType;
  action: string | null;
  description: string;
  deviceId: number | null;
  platform: string | null;
  appVersion: string | null;
  ip: string | null;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityLog[];
  nextBefore: number | null;
}

export interface ActivitySummary {
  user: User;
  totals: { logins: number; failedLogins30d: number; appOpens30d: number; actions30d: number };
  daily: { date: string; web: number; app: number }[];
}

export interface MqttStatus {
  enabled: boolean;
  running: boolean;
  tcpPort: number;
  wsPath: string;
  startedAt: string | null;
  connectedClients: number;
  devicesConnected: number[];
  messagesReceived: number;
  lastMessageAt: string | null;
  lastMessage: { deviceId: number; topic: string; at: string } | null;
  lastError: string | null;
  publicHost: string | null;
  publicPort: number;
  adminUsername: string | null;
  adminPassword: string | null;
}

export interface HaIntegrationStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string | null;
  intervalSec: number;
  lastSyncAt: string | null;
  lastSyncResult: { devices: number; inserted: number; skipped: { deviceId: number; reason: string }[] } | null;
  lastSyncError: string | null;
}

export interface IntegrationsStatus {
  mqtt: MqttStatus;
  homeAssistant: HaIntegrationStatus;
}

export interface MqttCredentials {
  enabled: boolean;
  connected: boolean;
  tcp: { host: string | null; port: number };
  wsPath: string;
  username: string;
  password: string;
  clientIdHint: string;
  topics: { telemetry: string; status: string; command: string; ack: string };
  examples: { telemetry: Record<string, number>; command: Record<string, unknown>; ack: Record<string, unknown> };
}

export type LogChannel = 'system' | 'mqtt' | 'ha';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  ts: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

export type LogStats = Record<LogChannel, { count: number; errors: number }>;
