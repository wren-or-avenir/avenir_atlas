import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clientToLonLat,
  lonLatToXy2D,
  xy2DToLonLat,
  lonLatToXyz3D,
} from '../src/core/geo/projection';
import { isInsideWorldOutline, pointInPolygon } from '../src/core/geo/contour';
import { REGIONS, findRegionById, flattenRegions } from '../src/core/geo/regions';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be close to ${expected}`,
  );
}

describe('projection', () => {
  it('原点投影到 2D 中心', () => {
    assert.deepEqual(lonLatToXy2D(0, 0), { x: 0.5, y: 0.5 });
  });

  it('经纬边界映射到 2D 边界', () => {
    assertClose(lonLatToXy2D(180, 0).x, 1);
    assertClose(lonLatToXy2D(-180, 0).x, 0);
    assertClose(lonLatToXy2D(0, 90).y, 0);
    assertClose(lonLatToXy2D(0, -90).y, 1);
  });

  it('2D 坐标与经纬度互逆', () => {
    const samples = [
      { lon: 114.06, lat: 22.54 },
      { lon: -74.01, lat: 40.71 },
      { lon: 170, lat: -45 },
    ];
    for (const { lon, lat } of samples) {
      const { x, y } = lonLatToXy2D(lon, lat);
      const back = xy2DToLonLat(x, y);
      assertClose(back.lon, lon);
      assertClose(back.lat, lat);
    }
  });

  it('3D 投影：赤道与极点的轴对齐', () => {
    assertClose(lonLatToXyz3D(0, 0).x, 1);
    assertClose(lonLatToXyz3D(0, 0).y, 0);
    assertClose(lonLatToXyz3D(0, 0).z, 0);
    const north = lonLatToXyz3D(0, 90);
    assertClose(north.x, 0);
    assertClose(north.y, 1);
  });

  it('3D 投影落在单位球面上', () => {
    const samples = [
      { lon: 105, lat: 35 },
      { lon: -165, lat: -28 },
      { lon: 99.7, lat: 27.83 },
    ];
    for (const { lon, lat } of samples) {
      const { x, y, z } = lonLatToXyz3D(lon, lat);
      assertClose(x * x + y * y + z * z, 1);
    }
  });

  it('clientToLonLat 将屏幕坐标映射回经纬度', () => {
    const center = clientToLonLat(500, 400, 1000, 800);
    assertClose(center.lon, 0);
    assertClose(center.lat, 0);
    const northwest = clientToLonLat(0, 0, 1000, 800);
    assertClose(northwest.lon, -180);
    assertClose(northwest.lat, 90);
    const southeast = clientToLonLat(1000, 800, 1000, 800);
    assertClose(southeast.lon, 180);
    assertClose(southeast.lat, -90);
  });
});

describe('contour', () => {
  it('大陆内部判定为轮廓内', () => {
    const land = [
      { lon: 105, lat: 35 },       // 中国
      { lon: 20, lat: 15 },        // 非洲撒哈拉
      { lon: -100, lat: 40 },      // 北美内陆
      { lon: 134, lat: -25 },      // 澳大利亚
      { lon: -60, lat: -20 },      // 南美内陆
    ];
    for (const point of land) {
      assert.equal(isInsideWorldOutline(point.lon, point.lat), true, JSON.stringify(point));
    }
  });

  it('海洋判定为轮廓外', () => {
    const water = [
      { lon: -170, lat: 0 },       // 太平洋中部
      { lon: -28, lat: -165 },     // 台风所在南太平洋
      { lon: -30, lat: 5 },        // 大西洋
    ];
    for (const point of water) {
      assert.equal(isInsideWorldOutline(point.lon, point.lat), false, JSON.stringify(point));
    }
  });

  it('地区中心城市落在大陆轮廓内', () => {
    const centers = ['shenzhen', 'shangri-la', 'huizhou', 'guizhou'].map(
      (id) => findRegionById(id)?.center ?? { lon: 0, lat: 0 },
    );
    for (const { lon, lat } of centers) {
      assert.equal(isInsideWorldOutline(lon, lat), true, `${lon},${lat}`);
    }
  });

  it('多边形顶点不导致误判', () => {
    const polygon: readonly (readonly [number, number])[] = [
      [0, 0], [4, 0], [4, 4], [0, 4],
    ];
    assert.equal(pointInPolygon({ lon: 2, lat: 2 }, polygon), true);
    assert.equal(pointInPolygon({ lon: 0.5, lat: 0.5 }, polygon), true);
    assert.equal(pointInPolygon({ lon: 3.9, lat: 3.9 }, polygon), true);
    assert.equal(pointInPolygon({ lon: 5, lat: 2 }, polygon), false);
    assert.equal(pointInPolygon({ lon: -0.5, lat: 2 }, polygon), false);
  });
});

describe('regions', () => {
  it('注册表包含两级地区与装饰台风', () => {
    assert.equal(flattenRegions().length, 7);
    const typhoon = findRegionById('typhoon');
    assert.equal(typhoon?.name, '台风');
  });

  it('二级地区可查且中心坐标正确', () => {
    const shenzhen = findRegionById('shenzhen');
    assert.equal(shenzhen?.name, '深圳');
    assertClose(shenzhen?.center.lon ?? 0, 114.06);
    assertClose(shenzhen?.center.lat ?? 0, 22.54);
  });

  it('未知 id 返回 undefined', () => {
    assert.equal(findRegionById('atlantis'), undefined);
  });

  it('注册表运行时冻结', () => {
    assert.equal(Object.isFrozen(REGIONS), true);
    assert.equal(Object.isFrozen(REGIONS[0].children), true);
  });
});
