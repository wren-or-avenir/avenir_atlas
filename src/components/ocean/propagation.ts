// The shelf is static. Bake each event's travel profile once, not per pixel/frame.
export const TRAVEL_SAMPLES = 256;
export const TRAVEL_MIN_Y = -20;
export const TRAVEL_MAX_Y = 24;

export function shelfDepth(y: number): number {
  const t = Math.max(0, Math.min(1, (y + 17) / 30));
  return 1.4 + 11.6 * t * t * (3 - 2 * t);
}

export function speedRatio(depth: number, wavelength: number): number {
  return Math.sqrt(Math.tanh(6.2831853 * depth / wavelength));
}

export function travelDistance(y: number, wavelength: number): number {
  const distance = TRAVEL_MAX_Y - y;
  let total = 1 / speedRatio(shelfDepth(y), wavelength) + 1 / speedRatio(shelfDepth(TRAVEL_MAX_Y), wavelength);
  for (let j = 1; j < 16; j++) {
    total += (j % 2 === 0 ? 2 : 4) / speedRatio(shelfDepth(y + distance * j / 16), wavelength);
  }
  return distance * total / 48;
}

export function writeTravelProfile(data: Float32Array, eventIndex: number, wavelength: number): void {
  for (let i = 0; i < TRAVEL_SAMPLES; i++) {
    const y = TRAVEL_MIN_Y + (TRAVEL_MAX_Y - TRAVEL_MIN_Y) * i / (TRAVEL_SAMPLES - 1);
    data[eventIndex * TRAVEL_SAMPLES + i] = travelDistance(y, wavelength);
  }
}
