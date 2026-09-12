import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  LinearFilter,
  HalfFloatType,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { ClimateParams, DayNight } from '../../core/theme/theme';
import type { StageScene } from '../webgl/stage';
import { oceanRect, type Size } from '../webgl/viewport';
import { DEFAULT_OCEAN_CONFIG } from './config';
import { resolveOceanLook } from './colors';
import vertexShader from './shaders/ocean.vert.glsl?raw';
import fragmentShader from './shaders/ocean.frag.glsl?raw';
import historyFragmentShader from './shaders/history.frag.glsl?raw';
import fieldShader from './shaders/field.glsl?raw';

const EVENT_COUNT = 8;
const FIXED_STEP = 1 / 30;

export interface OceanScene extends StageScene {
  setDayNight: (dayNight: DayNight) => void;
  setClimate: (climate: ClimateParams) => void;
}

const DEFAULT_CLIMATE: ClimateParams = {
  rainIntensity: 0,
  rainTilt: 0,
  lightningFrequency: 0,
  saturation: 1,
  brightness: 1,
};

interface WaveEvent {
  start: number;
  centerX: number;
  speed: number;
  width: number;
  strength: number;
  life: number;
  kind: number;
}

export function createOceanScene(): OceanScene {
  const config = DEFAULT_OCEAN_CONFIG;
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const geometry = new PlaneGeometry(2, 2, 1, 1);

  const blackFallback: Texture = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blackFallback.colorSpace = NoColorSpace;
  blackFallback.needsUpdate = true;

  const eventUniforms = Array.from({ length: EVENT_COUNT }, () => new Vector4(0, 1.2, 0, 0));
  const eventParams = Array.from({ length: EVENT_COUNT }, () => new Vector4(1e6, 0.06, 0.08, 1));
  const uniforms = {
    uTime: { value: 0 },
    uWorldSize: { value: new Vector2(16, 40) },
    uNight: { value: 0 },
    uDeep: { value: [0, 0, 0] },
    uShallow: { value: [0, 0, 0] },
    uFoamColor: { value: [1, 1, 1] },
    uGlint: { value: [1, 1, 1] },
    uGlintStrength: { value: 0 },
    uFoamIntensity: { value: 1 },
    uSparkleStrength: { value: 0 },
    uSaturation: { value: 1 },
    uBrightness: { value: 1 },
    uSeaState: { value: 1 },
    uDebug: { value: 0 },
    uHistoryTexel: { value: new Vector2(1/512,1/512) },
    uEvents: { value: eventUniforms },
    uEventParams: { value: eventParams },
    uHistory: { value: blackFallback },
  };
  const material = new ShaderMaterial({ vertexShader, fragmentShader: fragmentShader.replace('// FIELD',fieldShader), uniforms });
  const plane = new Mesh(geometry, material);
  const scene = new Scene();
  scene.add(plane);

  const historyCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  historyCamera.position.z = 2;
  const historyUniforms = {
    uWorldSize: { value: uniforms.uWorldSize.value },
    uSeaState: uniforms.uSeaState,
    uHistory: { value: blackFallback },
    uTime: { value: 0 },
    uDt: { value: FIXED_STEP },
    uFoamTau: { value: config.historyFoamTau },
    uGlowTau: { value: config.historyGlowTau },
    uAerationTau: { value: config.historyAerationTau },
    uEvents: { value: eventUniforms },
    uEventParams: { value: eventParams },
  };
  const historyMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: historyFragmentShader.replace('// FIELD',fieldShader),
    uniforms: historyUniforms,
  });
  const historyScene = new Scene();
  historyScene.add(new Mesh(geometry, historyMaterial));

  let dayNight: DayNight = 'day';
  let climate: ClimateParams = DEFAULT_CLIMATE;
  let simulationTime = 0;
  let pendingTime = 0;
  let nextEventAt = 6;
  let nextLargeEventAt = 24;
  let randomState = 0x2f6e2b1;
  let historyTargets: [WebGLRenderTarget, WebGLRenderTarget] | null = null;
  let historyRead = 0;
  let historyNeedsClear = true;
  let disposed = false;
  let paused = false;
  let destroyGui: (() => void) | undefined;

  const events: Array<WaveEvent | null> = Array.from({ length: EVENT_COUNT }, () => null);
  const random = (): number => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };

  const spawnEvent = (kind: number, start = simulationTime): void => {
    const slot = events.findIndex((event) => event === null || simulationTime > event.start + event.life);
    if (slot < 0) return;
    const large = kind > 0;
    events[slot] = {
      start,
      centerX: (random()-0.5)*36,
      speed: (large ? 2.5 : 1.8) + random()*0.4,
      width: large ? 14+random()*10 : 7+random()*10,
      strength: large ? 0.9 + random() * 0.45 : 0.45 + random() * 0.4,
      life: 48,
      kind: random()*40,
    };
  };

  const reset = (): void => {
    simulationTime=0;
    pendingTime=0;
    randomState=0x2f6e2b1;
    nextEventAt=4;
    nextLargeEventAt=24;
    events.fill(null);
    spawnEvent(0,-17);
    spawnEvent(1,-11);
    spawnEvent(0,-4);
    historyNeedsClear=true;
    uniforms.uTime.value=0;
  };
  reset();

  const syncEvents = (): void => {
    for (let i = 0; i < EVENT_COUNT; i++) {
      const event = events[i];
      if (!event) {
        eventUniforms[i].set(0, 1.2, 0, 0);
        eventParams[i].set(1e6, 0.06, 0.08, 1);
        continue;
      }
      eventUniforms[i].set(event.centerX, 24, event.strength, event.kind);
      eventParams[i].set(event.start, event.speed, event.width, event.life);
    }
  };
  syncEvents();

  const applyLook = (): void => {
    // Color transforms happen once, in linear light in the final shader.
    const look = resolveOceanLook(dayNight, DEFAULT_CLIMATE);
    uniforms.uDeep.value = [...look.deep];
    uniforms.uShallow.value = [...look.shallow];
    uniforms.uFoamColor.value = [...look.crest];
    uniforms.uGlint.value = [...look.glint];
    uniforms.uGlintStrength.value = look.glintStrength;
    uniforms.uFoamIntensity.value = look.foamIntensity;
    uniforms.uSparkleStrength.value = look.sparkleStrength;
    uniforms.uNight.value = dayNight === 'night' ? 1 : 0;
    uniforms.uSaturation.value = climate.saturation;
    uniforms.uBrightness.value = climate.brightness;
    uniforms.uSeaState.value = 1 + Math.min(1,Math.max(0,climate.rainIntensity))*0.35;
  };

  const updateWorldSize = (size: Size): void => {
    uniforms.uWorldSize.value.set((size.width / Math.max(size.height, 1)) * 40, 40);
    historyUniforms.uWorldSize.value = uniforms.uWorldSize.value;
  };

  const makeHistoryTargets = (width: number, height: number): void => {
    historyTargets?.forEach((target) => target.dispose());
    const options = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      format: RGBAFormat,
      type: HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    } as const;
    historyTargets = [new WebGLRenderTarget(width, height, options), new WebGLRenderTarget(width, height, options)];
    for (const target of historyTargets) {
      target.texture.colorSpace = NoColorSpace;
      target.texture.needsUpdate = true;
    }
    historyRead = 0;
    historyNeedsClear = true;
    uniforms.uHistoryTexel.value.set(1/width,1/height);
  };

  const restoreRendererState = (
    renderer: WebGLRenderer,
    target: WebGLRenderTarget | null,
    viewport: Vector4,
    scissor: Vector4,
    scissorTest: boolean,
    autoClear: boolean,
  ): void => {
    renderer.setRenderTarget(target);
    renderer.setViewport(viewport);
    renderer.setScissor(scissor);
    renderer.setScissorTest(scissorTest);
    renderer.autoClear = autoClear;
  };

  const advanceSimulation = (): void => {
    simulationTime += FIXED_STEP;
    while (simulationTime >= nextEventAt) {
      spawnEvent(0);
      nextEventAt += config.eventIntervalMin + random() * (config.eventIntervalMax - config.eventIntervalMin);
    }
    while (simulationTime >= nextLargeEventAt) {
      spawnEvent(1);
      nextLargeEventAt += config.largeEventIntervalMin + random() * (config.largeEventIntervalMax - config.largeEventIntervalMin);
    }
    syncEvents();
  };

  applyLook();

  if(import.meta.env.DEV) {
    const preview = new URLSearchParams(window.location.search).get('ocean');
    if(preview==='day'||preview==='night') dayNight=preview;
    applyLook();
    void import('lil-gui').then(({GUI})=>{
      if(disposed) return;
      const gui=new GUI({title:'Ocean preview'});
      const controls={mode:dayNight,pause:false,reset:()=>{reset();syncEvents();},view:0};
      gui.add(controls,'mode',['day','night']).onChange((v:DayNight)=>{
        dayNight=v;applyLook();document.body.dataset.daynight=v;
      });
      gui.add(controls,'pause').onChange((v:boolean)=>{paused=v;pendingTime=0;});
      gui.add(controls,'reset');
      gui.add(controls,'view',{water:0,depth:1,normal:2,breaking:3,history:4})
        .onChange((v:number)=>{uniforms.uDebug.value=Number(v);});
      destroyGui=()=>gui.destroy();
    }).catch(error=>console.warn('[ocean] preview controls unavailable',error));
  }

  return {
    scene,
    camera,
    rect: () => oceanRect({ width: window.innerWidth, height: window.innerHeight }),
    update(dt) {
      if(!paused) pendingTime += Math.min(Math.max(dt, 0), 0.1);
    },
    beforeRender(renderer) {
      if (!historyTargets) return;
      const previousTarget = renderer.getRenderTarget();
      const viewport = renderer.getViewport(new Vector4());
      const scissor = renderer.getScissor(new Vector4());
      const scissorTest = renderer.getScissorTest();
      const autoClear = renderer.autoClear;
      const clearColor = renderer.getClearColor(new Color());
      const clearAlpha = renderer.getClearAlpha();
      try {
      if (historyNeedsClear) {
        renderer.setClearColor(0,0);
        renderer.setScissorTest(false);
        renderer.autoClear = true;
        for (const target of historyTargets) {
          renderer.setRenderTarget(target);
          renderer.setViewport(0, 0, target.width, target.height);
          renderer.clear();
        }
        historyNeedsClear = false;
      }
      let steps = 0;
      while (pendingTime >= FIXED_STEP && steps < config.maxHistorySteps) {
        pendingTime -= FIXED_STEP;
        advanceSimulation();
        const read = historyTargets[historyRead];
        const write = historyTargets[1 - historyRead];
        historyUniforms.uHistory.value = read.texture;
        historyUniforms.uTime.value = simulationTime;
        historyUniforms.uDt.value = FIXED_STEP;
        renderer.setRenderTarget(write);
        renderer.setViewport(0, 0, write.width, write.height);
        renderer.setScissorTest(false);
        renderer.autoClear = true;
        renderer.render(historyScene, historyCamera);
        historyRead = 1 - historyRead;
        steps++;
      }
      if (steps === config.maxHistorySteps && pendingTime >= FIXED_STEP) pendingTime = 0;
      uniforms.uTime.value = simulationTime;
      uniforms.uHistory.value = historyTargets[historyRead].texture;
      if(import.meta.env.DEV) renderer.domElement.dataset.oceanTime=simulationTime.toFixed(3);
      } finally {
      restoreRendererState(renderer, previousTarget, viewport, scissor, scissorTest, autoClear);
      renderer.setClearColor(clearColor,clearAlpha);
      }
    },
    onResize(size) {
      updateWorldSize(size);
      const scale=Math.min(0.5*Math.min(window.devicePixelRatio||1,2),1024/Math.max(size.width,size.height));
      const width = Math.max(1,Math.round(size.width*scale));
      const height = Math.max(1,Math.round(size.height*scale));
      if (!historyTargets || historyTargets[0].width !== width || historyTargets[0].height !== height) {
        makeHistoryTargets(width, height);
      }
    },
    dispose() {
      disposed=true;
      destroyGui?.();
      historyTargets?.forEach((target) => target.dispose());
      geometry.dispose();
      material.dispose();
      historyMaterial.dispose();
      blackFallback.dispose();
    },
    setDayNight(value) {
      dayNight = value;
      applyLook();
    },
    setClimate(value) {
      if(disposed) return;
      climate = value;
      applyLook();
    },
  };
}
