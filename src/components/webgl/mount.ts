import { resolveWeatherParams, getDayNight } from '../../core/theme/theme';
import { resolveWeatherProvider } from '../../core/weather';
import { resolveSiteConfig, toWeatherEnv } from '../../config/site';
import { createOceanScene } from '../ocean/ocean';
import { createGlobeScene } from '../globe/globe';
import { createStage } from './stage';

const DAYNIGHT_REFRESH_MS = 60_000;

export function mountOceanGlobe(container: HTMLElement): void {
  let disposed=false;
  const ocean = createOceanScene();
  const refreshDayNight = (): void => {
    const preview=import.meta.env.DEV ? new URLSearchParams(location.search).get('ocean') : null;
    const value = preview==='day'||preview==='night' ? preview : getDayNight(new Date());
    document.body.dataset.daynight = value;
    ocean.setDayNight(value);
  };
  refreshDayNight();
  const dayNightTimer = window.setInterval(refreshDayNight, DAYNIGHT_REFRESH_MS);

  const globe = createGlobeScene();
  const stage = createStage({
    container,
    scenes: [ocean, globe],
    onDispose: () => {disposed=true;window.clearInterval(dayNightTimer);},
  });
  if (!stage) {
    disposed=true;
    window.clearInterval(dayNightTimer);
    ocean.dispose?.();
    globe.dispose?.();
    container.classList.add('no-webgl');
    return;
  }
  const site = resolveSiteConfig(import.meta.env);
  resolveWeatherProvider(toWeatherEnv(site))
    .fetchCurrent()
    .then((input) => {
      if(disposed) return;
      ocean.setClimate(resolveWeatherParams(input));
    })
    .catch((error) => {
      if(disposed) return;
      console.warn('[weather] 获取失败，降级为默认气候参数', error);
      ocean.setClimate(resolveWeatherParams({ condition: 'sunny', windSpeed: 0 }));
    });
  if(import.meta.hot) import.meta.hot.dispose(()=>stage.dispose());

}
