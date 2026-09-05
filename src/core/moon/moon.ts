export type MoonPhaseName =
  | '新月'
  | '蛾眉月'
  | '上弦月'
  | '盈凸月'
  | '满月'
  | '亏凸月'
  | '下弦月'
  | '残月';

const SYNODIC_MONTH_DAYS = 29.53058867;

const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

const PHASE_NAMES: readonly (readonly [MoonPhaseName, number, number])[] = [
  ['新月', 0, 0.0625],
  ['蛾眉月', 0.0625, 0.1875],
  ['上弦月', 0.1875, 0.3125],
  ['盈凸月', 0.3125, 0.4375],
  ['满月', 0.4375, 0.5625],
  ['亏凸月', 0.5625, 0.6875],
  ['下弦月', 0.6875, 0.8125],
  ['残月', 0.8125, 1],
];

const SCROLL_START_PHASE = 0.9;
const SCROLL_END_PHASE = 0.5;

const PHASE_EPSILON = 1e-9;

export function moonPhase(date: Date): number {
  const daysSinceEpoch = (date.getTime() - NEW_MOON_EPOCH_MS) / 86_400_000;
  const phase = (daysSinceEpoch / SYNODIC_MONTH_DAYS) % 1;
  if (phase < 0) {
    return phase + 1;
  }
  return phase > 1 - PHASE_EPSILON ? 0 : phase;
}

export function moonPhaseName(phase: number): MoonPhaseName {
  for (const [name, start, end] of PHASE_NAMES) {
    if (phase >= start && phase < end) {
      return name;
    }
  }
  throw new Error(`moon: 非法月相值 ${phase}，范围应为 [0, 1)`);
}

export function scrollProgressToPhase(progress: number): number {
  if (progress < 0 || progress > 1) {
    throw new Error(`moon: 滚动进度 ${progress} 超出 [0, 1]`);
  }
  return SCROLL_START_PHASE - (SCROLL_START_PHASE - SCROLL_END_PHASE) * progress;
}

export { SYNODIC_MONTH_DAYS };
