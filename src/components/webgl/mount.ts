import { resolveWeatherParams, getDayNight } from '../../core/theme/theme';
import { resolveWeatherProvider } from '../../core/weather';
import { clientToLonLat } from '../../core/geo/projection';
import { isInsideWorldOutline } from '../../core/geo/contour';
import { resolveSiteConfig, toWeatherEnv } from '../../config/site';
import { createOceanScene } from '../ocean/ocean';
import { createGlobeScene } from '../globe/globe';
import { createStage } from './stage';

const DAYNIGHT_REFRESH_MS = 60_000;

export function mountOceanGlobe(container: HTMLElement): void {
  const refreshDayNight = (): void => {
    document.body.dataset.daynight = getDayNight(new Date());
  };
  refreshDayNight();
  window.setInterval(refreshDayNight, DAYNIGHT_REFRESH_MS);

  const ocean = createOceanScene();
  const globe = createGlobeScene();
  const stage = createStage({ container, scenes: [ocean, globe] });
  if (!stage) {
    container.classList.add('no-webgl');
    return;
  }
  ocean.setDayNight(getDayNight(new Date()));

  const site = resolveSiteConfig(import.meta.env);
  resolveWeatherProvider(toWeatherEnv(site))
    .fetchCurrent()
    .then((input) => {
      ocean.setClimate(resolveWeatherParams(input));
    })
    .catch((error) => {
      console.warn('[weather] 获取失败，降级为默认气候参数', error);
      ocean.setClimate(resolveWeatherParams({ condition: 'sunny', windSpeed: 0 }));
    });

  let hasLastMove = false;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;

  window.addEventListener('pointermove', (event) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const point = clientToLonLat(event.clientX, event.clientY, width, height);
    if (isInsideWorldOutline(point.lon, point.lat)) {
      hasLastMove = false;
      return;
    }
    const x = (event.clientX / width) * 2 - 1;
    const y = -((event.clientY / height) * 2 - 1);
    const now = performance.now();
    if (!hasLastMove) {
      lastX = x;
      lastY = y;
      lastTime = now;
      hasLastMove = true;
      return;
    }
    const dtSec = Math.max((now - lastTime) / 1000, 1e-3);
    const dx = x - lastX;
    const dy = y - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) {
      return;
    }
    const speed = dist / dtSec;
    const strength = Math.min(1.2, Math.max(0.4, 0.5 + speed * 0.8));
    ocean.pushWakePoint({ x, y, dirX: dx / dist, dirY: dy / dist, strength });
    lastX = x;
    lastY = y;
    lastTime = now;
  });
}
