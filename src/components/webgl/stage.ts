import { WebGLRenderer, type Camera, type Scene } from 'three';
import { toGLCoords, type Rect, type Size } from './viewport';

export interface StageScene {
  readonly scene: Scene;
  readonly camera: Camera;
  readonly rect: () => Rect;
  update: (dt: number) => void;
  onResize?: (size: Size) => void;
}

export interface Stage {
  dispose: () => void;
}

const MAX_FRAME_DT = 0.1;

export function createStage(options: {
  container: HTMLElement;
  scenes: readonly StageScene[];
  onDispose?: () => void;
}): Stage | null {
  if (window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  } catch (error) {
    console.warn('[webgl] WebGL 不可用，背景退化为 CSS', error);
    return null;
  }

  const { container, scenes, onDispose } = options;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  container.appendChild(canvas);

  const shaderErrorOverlay = document.createElement('pre');
  shaderErrorOverlay.style.cssText =
    'position:fixed;left:0;bottom:0;right:0;max-height:40vh;overflow:auto;' +
    'margin:0;padding:8px;background:#300;color:#fcc;font:12px/1.4 monospace;z-index:9999;white-space:pre-wrap;';
  shaderErrorOverlay.hidden = true;
  container.appendChild(shaderErrorOverlay);

  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    const logVs = gl.getShaderInfoLog(vs) ?? '';
    const logFs = gl.getShaderInfoLog(fs) ?? '';
    const logProgram = gl.getProgramInfoLog(program) ?? '';
    shaderErrorOverlay.hidden = false;
    shaderErrorOverlay.textContent = `[着色器编译失败]\nVS: ${logVs}\nFS: ${logFs}\nLINK: ${logProgram}`;
    console.warn('[webgl] 着色器编译失败', logVs, logFs, logProgram);
  };

  let disposed = false;
  let frameId = 0;

  const handleResize = (): void => {
    const size = currentSize();
    renderer.setSize(size.width, size.height);
    for (const entry of scenes) {
      entry.onResize?.(size);
    }
  };

  const handleContextLost = (event: Event): void => {
    event.preventDefault();
    console.warn('[webgl] 上下文丢失，背景退化为 CSS');
    dispose();
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', handleResize);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    renderer.dispose();
    canvas.remove();
    onDispose?.();
  };

  canvas.addEventListener('webglcontextlost', handleContextLost);
  window.addEventListener('resize', handleResize);
  handleResize();

  let last = performance.now();
  const frame = (now: number): void => {
    if (disposed) {
      return;
    }
    const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
    last = now;

    const size = currentSize();
    for (const entry of scenes) {
      entry.update(dt);
    }

    let first = true;
    for (const entry of scenes) {
      const rect = toGLCoords(entry.rect(), size.height);
      renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
      renderer.setScissor(rect.x, rect.y, rect.w, rect.h);
      renderer.setScissorTest(true);
      renderer.autoClear = first;
      renderer.render(entry.scene, entry.camera);
      first = false;
    }
    renderer.setScissorTest(false);
    renderer.autoClear = true;

    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);

  return { dispose };
}

function currentSize(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}
