import {
  DataTexture,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector4,
} from 'three';
import type { Texture } from 'three';
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

  const whiteFallback: Texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  whiteFallback.colorSpace = NoColorSpace;
  whiteFallback.needsUpdate = true;

  const uniforms = {
    uTime: { value: 0 },
    uAmplitude: { value: config.waveAmplitude },
    uSpeed: { value: config.waveSpeed },
    uWaveScale: { value: 1.6 },
    uWaveIterations: { value: 6 },
    uDetailNormal: { value: 0.8 },
    uSlopeGain: { value: 0.6 },
    uWakePoints: { value: wakePoints },
    uWakeDirs: { value: wakeDirs },
    uWakeWidth: { value: config.wakeWidth },
    uWakeWaveLen: { value: config.wakeWaveLen },
    uWakeLife: { value: config.wakeLife },
    uDeep: { value: [0.03, 0.35, 0.49] },
    uShallow: { value: [0.37, 0.54, 0.62] },
    uFoamColor: { value: [1, 1, 1] },
    uGlint: { value: [0.87, 0.91, 0.93] },
    uGlintStrength: { value: 0.5 },
    uFoamThreshold: { value: 1.0 },
    uFoamSmoothness: { value: 0.4 },
    uFoamIntensity: { value: 0.9 },
    uFoamStyle: { value: 0 },
    uGlowStrength: { value: 0.12 },
    uTexAlbedo: { value: whiteFallback },
    uAlbedoMean: { value: [1, 1, 1] },
    uAlbedoStrength: { value: 0.4 },
    uSaturation: { value: 1 },
    uNight: { value: 0 },
    uWaveDir: { value: new Vector2(0.7071, 0.7071).normalize() },
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
    uniforms.uFoamColor.value = dayNight === 'day' ? [1, 1, 1] : [...look.crest];
    uniforms.uGlint.value = [...look.glint];
    uniforms.uGlintStrength.value = look.glintStrength;
    uniforms.uFoamThreshold.value = look.foamThreshold;
    uniforms.uFoamSmoothness.value = look.foamSmoothness;
    uniforms.uFoamIntensity.value = look.foamIntensity;
    uniforms.uGlowStrength.value = look.sparkleStrength;
    uniforms.uAlbedoStrength.value = look.albedoStrength;
    uniforms.uNight.value = dayNight === 'day' ? 0 : 1;
    uniforms.uSaturation.value = climate.saturation;
  };

  if (import.meta.env.DEV) {
    void import('lil-gui').then(({ GUI }) => {
      const gui = new GUI({ title: 'Ocean Debug' });
      gui.add(uniforms.uFoamThreshold, 'value', 0, 2, 0.01).name('foamThreshold');
      gui.add(uniforms.uFoamSmoothness, 'value', 0, 1, 0.01).name('foamSmoothness');
      gui.add(uniforms.uFoamIntensity, 'value', 0, 1.5, 0.01).name('foamIntensity');
      gui.add(uniforms.uFoamStyle, 'value', { 网状: 0, 碎斑: 1 }).name('foamStyle');
      gui.add(uniforms.uWaveIterations, 'value', 1, 8, 1).name('waveIterations');
      gui.add(uniforms.uWaveScale, 'value', 0.5, 4, 0.05).name('waveScale');
      gui.add(uniforms.uDetailNormal, 'value', 0, 3, 0.05).name('detailNormal');
      gui.add(uniforms.uSlopeGain, 'value', 0, 2, 0.05).name('slopeGain');
      gui.add(uniforms.uGlintStrength, 'value', 0, 1.5, 0.01).name('specularIntensity');
      gui.add(uniforms.uAlbedoStrength, 'value', 0, 1, 0.01).name('albedoStrength');
    }).catch((error: unknown) => {
      console.warn('[ocean] lil-gui 加载失败', error);
    });
  }

  void new TextureLoader().loadAsync('/textures/ocean/day/albedo.png').then((texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    uniforms.uTexAlbedo.value = texture;
  }).catch((error: unknown) => {
    console.warn('[ocean] 反照率贴图加载失败，回退纯程序化', error);
  });
  void fetch('/textures/ocean/day/albedo.json')
    .then((res) => res.json())
    .then((meta: { mean?: number[] }) => {
      if (meta.mean?.length === 3) {
        uniforms.uAlbedoMean.value = meta.mean;
      }
    })
    .catch((error: unknown) => {
      console.warn('[ocean] 反照率元数据加载失败，均值按 1 处理', error);
    });

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
