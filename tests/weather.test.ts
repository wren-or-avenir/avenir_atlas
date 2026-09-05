import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveWeatherProvider } from '../src/core/weather/index';

describe('resolveWeatherProvider', () => {
  it('默认返回 mock provider', async () => {
    const provider = resolveWeatherProvider({});
    assert.equal(provider.name, 'mock');
    assert.deepEqual(await provider.fetchCurrent(), { condition: 'sunny', windSpeed: 8 });
  });

  it('环境变量可切换 mock 天气', async () => {
    const provider = resolveWeatherProvider({
      WEATHER_PROVIDER: 'mock',
      WEATHER_MOCK_CONDITION: 'typhoon',
      WEATHER_MOCK_WIND: '80',
    });
    assert.deepEqual(await provider.fetchCurrent(), { condition: 'typhoon', windSpeed: 80 });
  });

  it('非法天气类型报错', () => {
    assert.throws(() => resolveWeatherProvider({ WEATHER_MOCK_CONDITION: 'meteor' }));
  });

  it('非法风速报错', () => {
    assert.throws(() => resolveWeatherProvider({ WEATHER_MOCK_WIND: 'abc' }));
    assert.throws(() => resolveWeatherProvider({ WEATHER_MOCK_WIND: '-5' }));
  });

  it('未实现的 provider 与未知值都报错，不静默降级', () => {
    assert.throws(() => resolveWeatherProvider({ WEATHER_PROVIDER: 'qweather' }));
    assert.throws(() => resolveWeatherProvider({ WEATHER_PROVIDER: 'nasa' }));
  });
});
