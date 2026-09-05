import type { WeatherProvider } from './interface';
import { createMockWeatherProvider } from './mock';

export function resolveWeatherProvider(
  env: Record<string, string | undefined> = {},
): WeatherProvider {
  const name = env.WEATHER_PROVIDER ?? 'mock';
  if (name === 'mock') {
    return createMockWeatherProvider(env);
  }
  throw new Error(`weather: Provider "${name}" 未实现，当前仅支持 mock（qweather 待接入）`);
}

export type { WeatherProvider } from './interface';
