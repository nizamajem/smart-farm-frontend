export type Role = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
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
  createdAt: string;
}

export interface Device {
  id: number;
  name: string;
  location: string;
  apiKey: string;
  relayLabels: string[];
  haEntities: HaEntityMap | null;
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
  status: 'pending' | 'sent' | 'done' | 'expired';
  createdAt: string;
  ackAt: string | null;
}

export type HaMetric = 'temperature' | 'humidity' | 'soilMoisture' | 'lightLux';
export type HaEntityMap = Partial<Record<HaMetric, string>>;

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
