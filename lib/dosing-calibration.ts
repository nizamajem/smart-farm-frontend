import { api } from './api';
import type { NutrientStatus, PumpChannel } from './types';

export const PUMP_CHANNELS: PumpChannel[] = ['a', 'b', 'phUp', 'phDown'];
const pending = new Map<string, Promise<NutrientStatus>>();

/** Import measured ml/time from the original browser notes; never overwrite server calibration. */
export function loadNutrients(deviceId: number, ownerId: number): Promise<NutrientStatus> {
  const key = `smartfarm:nutrient-drafts:v1:${ownerId}:${deviceId}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    let status = await api.nutrientStatus(deviceId);
    let notes: { pumps?: Record<number, { seconds?: string; volume?: string }> };
    try { notes = JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return status; }
    if (status.mix?.status === 'running') return status;
    for (const [index, channel] of PUMP_CHANNELS.entries()) {
      if (status.pumps?.[channel]) continue;
      const note = notes?.pumps?.[index];
      if (!note) continue;
      const seconds = Number(note.seconds), ml = Number(note.volume);
      if (!Number.isFinite(seconds) || seconds < .5 || seconds > 60 || !Number.isFinite(ml) || ml < .001 || ml > 1000000) continue;
      status = await api.importDosingPump(deviceId, channel, { seconds, ml });
    }
    return status;
  })();
  pending.set(key, task);
  void task.finally(() => { if (pending.get(key) === task) pending.delete(key); }).catch(() => {});
  return task;
}
