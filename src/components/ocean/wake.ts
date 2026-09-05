export interface WakePoint {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  strength: number;
}

export interface WakeEntry extends WakePoint {
  age: number;
}

export const MAX_WAKE_POINTS = 8;

export function pushWakePoint(entries: readonly WakeEntry[], point: WakePoint): WakeEntry[] {
  return [...entries, { ...point, age: 0 }].slice(-MAX_WAKE_POINTS);
}

export function ageWakeEntries(entries: readonly WakeEntry[], dt: number, life: number): WakeEntry[] {
  return entries
    .map((entry) => ({ ...entry, age: entry.age + dt }))
    .filter((entry) => entry.age < life);
}
