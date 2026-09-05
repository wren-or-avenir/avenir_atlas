import type { WeatherInput } from '../theme/theme';

export type WeatherProviderName = 'mock' | 'qweather';

export interface WeatherProvider {
  readonly name: WeatherProviderName;
  fetchCurrent(): Promise<WeatherInput>;
}
