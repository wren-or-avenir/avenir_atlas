export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GLOBE_MARGIN = 24;
const GLOBE_MIN_SIZE = 120;
const GLOBE_MAX_SIZE = 240;
const GLOBE_RATIO = 0.18;

export function oceanRect(size: Size): Rect {
  return { x: 0, y: 0, w: size.width, h: size.height };
}

export function globeRect(size: Size): Rect {
  const side = clamp(Math.min(size.width, size.height) * GLOBE_RATIO, GLOBE_MIN_SIZE, GLOBE_MAX_SIZE);
  return { x: GLOBE_MARGIN, y: GLOBE_MARGIN, w: side, h: side };
}

export function toGLCoords(rect: Rect, canvasHeight: number): Rect {
  return { x: rect.x, y: canvasHeight - rect.y - rect.h, w: rect.w, h: rect.h };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
