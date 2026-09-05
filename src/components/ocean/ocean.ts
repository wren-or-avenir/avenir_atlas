import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector4 } from 'three';
import type { ClimateParams, DayNight } from '../../core/theme/theme';
import type { StageScene } from '../webgl/stage';
import { oceanRect } from '../webgl/viewport';
import { DEFAULT_OCEAN_CONFIG } from './config';
import { resolveOceanLook } from './colors';
import {
  ageWakeEntries,
  MAX_WAKE_POINTS,
  pushWakePoint,
  type WakeEntry,
  type WakePoint,
} from './wake';
import vertexShader from './shaders/ocean.vert.glsl?raw';
import fragmentShader from './shaders/ocean.frag.glsl?raw';

export interface OceanScene extends StageScene {
  setDayNight: (dayNight: DayNight) => void;
  setClimate: (climate: ClimateParams) => void;
  pushWakePoint: (point: WakePoint) => void;
}

const DEFAULT_CLIMATE: ClimateParams = {
  rainIntensity: 0,
  rainTilt: 0,
  lightningFrequency: 0,
  saturation: 1,
  brightness: 1,
};

export function createOceanScene(): OceanScene {
  const config = DEFAULT_OCEAN_CONFIG;
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;

  const wakePoints = Array.from({ length: MAX_WAKE_POINTS }, () => new Vector4(0, 0, -1, 0));
  const wakeDirs = Array.from({ length: MAX_WAKE_POINTS }, () => new Vector2(0, 0));

  const uniforms = {
    uTime: { value: 0 },
    uAmplitude: { value: config.waveAmplitude },
    uFrequency: { value: config.waveFrequency },
    uSpeed: { value: config.waveSpeed },
    uWakePoints: { value: wakePoints },
    uWakeDirs: { value: wakeDirs },
    uWakeWidth: { value: config.wakeWidth },
    uWakeWaveLen: { value: config.wakeWaveLen },
    uWakeLife: { value: config.wakeLife },
    uDeep: { value: [0.19, 0.33, 0.33] },
    uShallow: { value: [0.22, 0.45, 0.47] },
    uCrest: { value: [0.76, 0.84, 0.83] },
    uGlint: { value: [0.8, 0.87, 0.86] },
    uGlintStrength: { value: 0.5 },
    uFoamThreshold: { value: 1.15 },
    uFoamSmoothness: { value: 0.5 },
    uFoamIntensity: { value: 0.85 },
    uSparkleStrength: { value: 0.12 },
  };

  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms });
  const plane = new Mesh(
    new PlaneGeometry(2, 2, config.segmentCount, config.segmentCount),
    material,
  );
  const scene = new Scene();
  scene.add(plane);

  let dayNight: DayNight = 'day';
  let climate: ClimateParams = DEFAULT_CLIMATE;
  let wake: WakeEntry[] = [];

  const applyLook = (): void => {
    const look = resolveOceanLook(dayNight, climate);
    uniforms.uDeep.value = [...look.deep];
    uniforms.uShallow.value = [...look.shallow];
    uniforms.uCrest.value = [...look.crest];
    uniforms.uGlint.value = [...look.glint];
    uniforms.uGlintStrength.value = look.glintStrength;
    uniforms.uFoamThreshold.value = look.foamThreshold;
    uniforms.uFoamSmoothness.value = look.foamSmoothness;
    uniforms.uFoamIntensity.value = look.foamIntensity;
    uniforms.uSparkleStrength.value = look.sparkleStrength;
  };

  const applyAmplitude = (): void => {
    uniforms.uAmplitude.value = config.waveAmplitude * (1 + 2 * climate.rainIntensity);
  };

  const syncWakeUniforms = (): void => {
    for (let i = 0; i < MAX_WAKE_POINTS; i++) {
      const entry = wake[i];
      if (entry) {
        wakePoints[i].set(entry.x, entry.y, entry.age, entry.strength);
        wakeDirs[i].set(entry.dirX, entry.dirY);
      } else {
        wakePoints[i].set(0, 0, -1, 0);
        wakeDirs[i].set(0, 0);
      }
    }
  };

  return {
    scene,
    camera,
    rect: () => oceanRect({ width: window.innerWidth, height: window.innerHeight }),
    update(dt) {
      uniforms.uTime.value += dt;
      wake = ageWakeEntries(wake, dt, config.wakeLife);
      syncWakeUniforms();
    },
    setDayNight(value) {
      dayNight = value;
      applyLook();
    },
    setClimate(value) {
      climate = value;
      applyLook();
      applyAmplitude();
    },
    pushWakePoint(point) {
      wake = pushWakePoint(wake, point);
      syncWakeUniforms();
    },
  };
}
