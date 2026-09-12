import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { travelDistance, writeTravelProfile, TRAVEL_SAMPLES, TRAVEL_MIN_Y, TRAVEL_MAX_Y,
  shelfDepth as bakedShelfDepth } from '../src/components/ocean/propagation';

// Execute the shader's scalar travel functions, not a second copy of the model.
// Actual GLSL compilation and texture history are checked in check-ocean-browser.mjs.
const field = readFileSync(new URL('../src/components/ocean/shaders/field.glsl', import.meta.url), 'utf8');
const source = ['shelfDepth', 'speedRatio', 'crestCollapse', 'crestImpact'].map(name => {
  const match = field.match(new RegExp(`float ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing GLSL function ${name}`);
  return match[0]
    .replace(/^float (\w+)\(/, 'function $1(')
    .replace(/\bfloat\(([^)]+)\)/g, '($1)')
    .replace(/\bfloat (\w+)(?=[,)])/g, '$1')
    .replace(/\b(float|int) /g, 'let ');
}).join('\n');
const { speedRatio, shelfDepth, crestCollapse, crestImpact } = new Function('mix', 'smoothstep', 'sqrt', 'tanh',
  `${source}; return {speedRatio,shelfDepth,crestCollapse,crestImpact};`)(
  (a: number, b: number, t: number) => a + (b-a)*t,
  (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x-a)/(b-a)));
    return t*t*(3-2*t);
  }, Math.sqrt, Math.tanh,
) as { speedRatio: (depth: number, wavelength: number) => number; shelfDepth: (y: number) => number; crestCollapse: (phase: number) => number; crestImpact: (phase: number) => number };

test('baked travel profiles preserve the shader shelf and subpixel propagation accuracy', () => {
  const data = new Float32Array(TRAVEL_SAMPLES * 2);
  for (const wavelength of [11.6, 15, 18.8]) {
    writeTravelProfile(data, 1, wavelength);
    assert.ok(data.slice(0, TRAVEL_SAMPLES).every(value => value === 0), 'Other event rows must stay untouched');
    let previous = Infinity;
    for (let y = TRAVEL_MIN_Y; y <= TRAVEL_MAX_Y; y += 0.025) {
      assert.ok(Math.abs(shelfDepth(y) - bakedShelfDepth(y)) < 1e-12);
      const index = (y - TRAVEL_MIN_Y) / (TRAVEL_MAX_Y - TRAVEL_MIN_Y) * (TRAVEL_SAMPLES - 1);
      const left = Math.floor(index), fraction = index - left;
      const a = data[TRAVEL_SAMPLES + left];
      const b = data[TRAVEL_SAMPLES + Math.min(left + 1, TRAVEL_SAMPLES - 1)];
      const sampled = a + (b - a) * fraction;
      assert.ok(Math.abs(sampled - travelDistance(y, wavelength)) < 0.002, `Travel error at ${y}`);
      assert.ok(sampled < previous, 'Interpolated fronts must never reverse');
      previous = sampled;
    }
    assert.equal(data[data.length - 1], 0);
  }
});

test('crest leans before impact and keeps spilling as breaking increases', () => {
  assert.ok(crestCollapse(0.3) > 0);
  assert.equal(crestImpact(0.3), 0);
  assert.ok(crestImpact(0.75) > 0.9);
  for (const sample of [crestCollapse, crestImpact]) {
    assert.equal(sample(0), 0);
    assert.equal(sample(1), 1);
    for (let phase = 0; phase < 1; phase += 0.001) {
      assert.ok(sample(phase) >= 0 && sample(phase) <= 1);
      assert.ok(Math.abs(sample(phase + 0.001) - sample(phase)) < 0.01);
      assert.ok(sample(phase + 0.001) >= sample(phase));
    }
  }
});

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
