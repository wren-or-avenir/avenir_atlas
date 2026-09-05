import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  moonPhase,
  moonPhaseName,
  scrollProgressToPhase,
  SYNODIC_MONTH_DAYS,
} from '../src/core/moon/moon';

const NEW_MOON_EPOCH = new Date('2000-01-06T18:14:00Z');
const HALF_MONTH_MS = (SYNODIC_MONTH_DAYS / 2) * 86_400_000;
const FULL_MONTH_MS = SYNODIC_MONTH_DAYS * 86_400_000;

function assertClose(actual: number, expected: number, epsilon = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be close to ${expected}`,
  );
}

describe('moonPhase', () => {
  it('基准新月日相位为 0', () => {
    assertClose(moonPhase(NEW_MOON_EPOCH), 0);
  });

  it('半个朔望月后为满月', () => {
    assertClose(moonPhase(new Date(NEW_MOON_EPOCH.getTime() + HALF_MONTH_MS)), 0.5);
  });

  it('一个朔望月后回到新月', () => {
    assertClose(moonPhase(new Date(NEW_MOON_EPOCH.getTime() + FULL_MONTH_MS)), 0);
  });

  it('相位始终落在 [0, 1)', () => {
    for (let day = 0; day < 365; day++) {
      const phase = moonPhase(new Date(NEW_MOON_EPOCH.getTime() + day * 86_400_000));
      assert.ok(phase >= 0 && phase < 1, `day ${day}: ${phase}`);
    }
  });
});

describe('moonPhaseName', () => {
  it('相位映射到八个月相名', () => {
    const cases: readonly (readonly [number, string])[] = [
      [0.01, '新月'],
      [0.1, '蛾眉月'],
      [0.25, '上弦月'],
      [0.4, '盈凸月'],
      [0.5, '满月'],
      [0.6, '亏凸月'],
      [0.75, '下弦月'],
      [0.9, '残月'],
    ];
    for (const [phase, expected] of cases) {
      assert.equal(moonPhaseName(phase), expected, `phase ${phase}`);
    }
  });

  it('非法相位抛错', () => {
    assert.throws(() => moonPhaseName(-0.1));
    assert.throws(() => moonPhaseName(1));
  });
});

describe('scrollProgressToPhase', () => {
  it('开头是残月，末尾是满月', () => {
    assertClose(scrollProgressToPhase(0), 0.9);
    assertClose(scrollProgressToPhase(1), 0.5);
    assertClose(scrollProgressToPhase(0.5), 0.7);
  });

  it('端点映射到正确的月相名', () => {
    assert.equal(moonPhaseName(scrollProgressToPhase(0)), '残月');
    assert.equal(moonPhaseName(scrollProgressToPhase(1)), '满月');
  });

  it('越界进度抛错', () => {
    assert.throws(() => scrollProgressToPhase(-0.01));
    assert.throws(() => scrollProgressToPhase(1.01));
  });
});
