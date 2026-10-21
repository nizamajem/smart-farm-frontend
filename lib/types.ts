export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'farmer';
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
