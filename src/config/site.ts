export interface SiteConfig {
  weatherProvider: string;
  weatherMockCondition: string | undefined;
  weatherMockWind: string | undefined;
  musicProvider: string;
}

export function resolveSiteConfig(
  env: Record<string, string | undefined>,
): SiteConfig {
  return {
    weatherProvider: env.PUBLIC_WEATHER_PROVIDER ?? 'mock',
    weatherMockCondition: env.PUBLIC_WEATHER_MOCK_CONDITION,
    weatherMockWind: env.PUBLIC_WEATHER_MOCK_WIND,
    musicProvider: env.PUBLIC_MUSIC_PROVIDER ?? 'mock',
  };
}

export function toWeatherEnv(config: SiteConfig): Record<string, string | undefined> {
  return {
    WEATHER_PROVIDER: config.weatherProvider,
    WEATHER_MOCK_CONDITION: config.weatherMockCondition,
    WEATHER_MOCK_WIND: config.weatherMockWind,
  };
}
