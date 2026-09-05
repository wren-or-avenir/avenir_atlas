import { DEFAULT_THEME_CONFIG, type ThemeConfig } from './config';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type DayNight = 'day' | 'night';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'typhoon'
  | 'snow';

export interface WeatherInput {
  condition: WeatherCondition;
  windSpeed: number;
}

export interface ClimateParams {
  rainIntensity: number;
  rainTilt: number;
  lightningFrequency: number;
  saturation: number;
  brightness: number;
}

const SEASON_MONTHS: readonly (readonly [Season, readonly number[]])[] = [
  ['spring', [3, 4, 5]],
  ['summer', [6, 7, 8]],
  ['autumn', [9, 10, 11]],
  ['winter', [12, 1, 2]],
];

const CONDITION_PARAMS: Record<
  WeatherCondition,
  Pick<ClimateParams, 'rainIntensity' | 'lightningFrequency' | 'saturation' | 'brightness'>
> = {
  sunny: { rainIntensity: 0, lightningFrequency: 0, saturation: 1, brightness: 1 },
  cloudy: { rainIntensity: 0, lightningFrequency: 0, saturation: 0.85, brightness: 0.92 },
  rain: { rainIntensity: 0.5, lightningFrequency: 0, saturation: 0.75, brightness: 0.88 },
  storm: { rainIntensity: 0.8, lightningFrequency: 0.25, saturation: 0.6, brightness: 0.78 },
  typhoon: { rainIntensity: 1, lightningFrequency: 0.5, saturation: 0.5, brightness: 0.7 },
  snow: { rainIntensity: 0.3, lightningFrequency: 0, saturation: 0.7, brightness: 0.9 },
};

const MAX_RAIN_TILT = 45;
const FULL_WIND_SPEED = 50;

export function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  for (const [season, months] of SEASON_MONTHS) {
    if (months.includes(month)) {
      return season;
    }
  }
  throw new Error(`theme: 无法确定 ${month} 月所属季节`);
}

export function getDayNight(date: Date, config: ThemeConfig = DEFAULT_THEME_CONFIG): DayNight {
  const hour = date.getHours();
  return hour >= config.dayStartHour && hour < config.dayEndHour ? 'day' : 'night';
}

export function resolveWeatherParams(input: WeatherInput): ClimateParams {
  const base = CONDITION_PARAMS[input.condition];
  const windFactor = clamp(input.windSpeed / FULL_WIND_SPEED, 0, 1);
  return {
    rainIntensity: base.rainIntensity * (0.6 + 0.4 * windFactor),
    rainTilt: windFactor * MAX_RAIN_TILT,
    lightningFrequency: base.lightningFrequency,
    saturation: base.saturation,
    brightness: base.brightness,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
