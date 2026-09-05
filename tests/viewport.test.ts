import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { globeRect, oceanRect, toGLCoords } from '../src/components/webgl/viewport';

describe('viewport', () => {
  it('oceanRect 铺满整个视口', () => {
    assert.deepEqual(oceanRect({ width: 1280, height: 720 }), { x: 0, y: 0, w: 1280, h: 720 });
  });

  it('globeRect 固定在左上角且大小有上下限', () => {
    assert.deepEqual(globeRect({ width: 1000, height: 800 }), { x: 24, y: 24, w: 144, h: 144 });
    assert.deepEqual(globeRect({ width: 300, height: 300 }), { x: 24, y: 24, w: 120, h: 120 });
    assert.deepEqual(globeRect({ width: 4000, height: 4000 }), { x: 24, y: 24, w: 240, h: 240 });
  });

  it('toGLCoords 将左上原点换算为 GL 左下原点', () => {
    const gl = toGLCoords({ x: 24, y: 24, w: 144, h: 144 }, 800);
    assert.deepEqual(gl, { x: 24, y: 800 - 24 - 144, w: 144, h: 144 });
  });
});
