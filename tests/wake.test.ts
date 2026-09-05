import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ageWakeEntries,
  MAX_WAKE_POINTS,
  pushWakePoint,
  type WakeEntry,
} from '../src/components/ocean/wake';

const LIFE = 2.5;

function entry(age: number): WakeEntry {
  return { x: 0, y: 0, dirX: 1, dirY: 0, strength: 1, age };
}

describe('pushWakePoint', () => {
  it('新点 age 从 0 开始追加', () => {
    const next = pushWakePoint([], { x: 1, y: 2, dirX: 0, dirY: 1, strength: 0.5 });
    assert.equal(next.length, 1);
    assert.equal(next[0].age, 0);
    assert.deepEqual(
      { x: next[0].x, y: next[0].y, dirX: next[0].dirX, dirY: next[0].dirY, strength: next[0].strength },
      { x: 1, y: 2, dirX: 0, dirY: 1, strength: 0.5 },
    );
  });

  it('超过上限时丢弃最旧的点', () => {
    let list: WakeEntry[] = [];
    for (let i = 0; i < MAX_WAKE_POINTS + 3; i++) {
      list = pushWakePoint(list, { x: i, y: 0, dirX: 1, dirY: 0, strength: 1 });
    }
    assert.equal(list.length, MAX_WAKE_POINTS);
    assert.equal(list[0].x, 3);
    assert.equal(list[list.length - 1].x, MAX_WAKE_POINTS + 2);
  });
});

describe('ageWakeEntries', () => {
  it('推进年龄并清除过期点', () => {
    const list: WakeEntry[] = [entry(0), entry(1), entry(LIFE + 1)];
    const next = ageWakeEntries(list, 1, LIFE);
    assert.equal(next.length, 2);
    assert.equal(next[0].age, 1);
    assert.equal(next[1].age, 2);
  });

  it('刚过生命周期的点被移除', () => {
    const next = ageWakeEntries([entry(LIFE - 0.01)], 0.5, LIFE);
    assert.equal(next.length, 0);
  });
});
