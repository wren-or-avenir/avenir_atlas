import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Execute the shader's scalar travel functions, not a second copy of the model.
// Actual GLSL compilation and texture history are checked in check-ocean-browser.mjs.
const field = readFileSync(new URL('../src/components/ocean/shaders/field.glsl', import.meta.url), 'utf8');
const source = ['shelfDepth', 'speedRatio', 'travelDistance'].map(name => {
  const match = field.match(new RegExp(`float ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing GLSL function ${name}`);
  return match[0]
    .replace(/^float (\w+)\(/, 'function $1(')
    .replace(/\bfloat\(([^)]+)\)/g, '($1)')
    .replace(/\bfloat (\w+)(?=[,)])/g, '$1')
    .replace(/\b(float|int) /g, 'let ');
}).join('\n');
const { travelDistance, speedRatio, shelfDepth } = new Function('mix', 'smoothstep', 'sqrt', 'tanh',
  `${source}; return {travelDistance,speedRatio,shelfDepth};`)(
  (a: number, b: number, t: number) => a + (b-a)*t,
  (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x-a)/(b-a)));
    return t*t*(3-2*t);
  }, Math.sqrt, Math.tanh,
) as { travelDistance: (y: number, wavelength: number) => number; speedRatio: (depth: number, wavelength: number) => number; shelfDepth: (y: number) => number };

test('wave travel slows and compresses toward shore without reversing or drifting', () => {
  for (const wavelength of [11.6, 15, 18.8]) {
    assert.equal(travelDistance(24, wavelength), 0);
    const velocity = (y: number) => 0.02 / (travelDistance(y-0.01, wavelength)-travelDistance(y+0.01, wavelength));
    assert.ok(velocity(-17) < velocity(-5));
    assert.ok(velocity(-5) < velocity(10));
    for (let y = -20; y < 20; y += 0.5) {
      const v = velocity(y);
      assert.ok(Number.isFinite(v) && v > 0 && v < 1.03, `Invalid propagation at ${y}`);
      assert.ok(Math.abs(v-speedRatio(shelfDepth(y),wavelength)) < 0.025);
    }
  }
});
