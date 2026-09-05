import type { WeatherCondition, WeatherInput } from '../theme/theme';
import type { WeatherProvider } from './interface';

const CONDITIONS: readonly WeatherCondition[] = [
  'sunny',
  'cloudy',
  'rain',
  'storm',
  'typhoon',
  'snow',
];

const DEFAULT_CONDITION: WeatherCondition = 'sunny';
const DEFAULT_WIND_SPEED = 8;

export function createMockWeatherProvider(
  env: Record<string, string | undefined> = {},
): WeatherProvider {
  const condition = readCondition(env.WEATHER_MOCK_CONDITION);
  const windSpeed = readNumber(env.WEATHER_MOCK_WIND, 'WEATHER_MOCK_WIND');
  return {
    name: 'mock',
    async fetchCurrent(): Promise<WeatherInput> {
      return { condition, windSpeed };
    },
  };
}

function readCondition(raw: string | undefined): WeatherCondition {
  if (raw === undefined) {
    return DEFAULT_CONDITION;
  }
  if (!CONDITIONS.includes(raw as WeatherCondition)) {
    throw new Error(`weather: WEATHER_MOCK_CONDITION 非法值 "${raw}"，可选 ${CONDITIONS.join('/')}`);
  }
  return raw as WeatherCondition;
}

function readNumber(raw: string | undefined, key: string): number {
  if (raw === undefined) {
    return DEFAULT_WIND_SPEED;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`weather: ${key} 必须是非负数，收到 "${raw}"`);
  }
  return value;
}
