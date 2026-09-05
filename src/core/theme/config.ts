export interface ThemeConfig {
  dayStartHour: number;
  dayEndHour: number;
}

export const DEFAULT_THEME_CONFIG: Readonly<ThemeConfig> = {
  dayStartHour: 6,
  dayEndHour: 18,
};

const MAX_HOUR = 24;

export function resolveThemeConfig(
  env: Record<string, string | undefined>,
): ThemeConfig {
  return {
    dayStartHour: readHour(env.THEME_DAY_START, DEFAULT_THEME_CONFIG.dayStartHour),
    dayEndHour: readHour(env.THEME_DAY_END, DEFAULT_THEME_CONFIG.dayEndHour),
  };
}

function readHour(raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_HOUR) {
    throw new Error(`theme config: hour 必须在 0-${MAX_HOUR}，收到 "${raw}"`);
  }
  return value;
}
