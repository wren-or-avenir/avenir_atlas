import type { LonLat } from './projection';

export interface Region {
  id: string;
  name: string;
  center: LonLat;
  children?: readonly Region[];
}

export const REGIONS: readonly Region[] = deepFreeze([
  {
    id: 'china',
    name: '中国',
    center: deepFreeze({ lon: 105, lat: 35 }),
    children: deepFreeze([
      deepFreeze({ id: 'shenzhen', name: '深圳', center: deepFreeze({ lon: 114.06, lat: 22.54 }) }),
      deepFreeze({ id: 'shangri-la', name: '香格里拉', center: deepFreeze({ lon: 99.7, lat: 27.83 }) }),
      deepFreeze({ id: 'huizhou', name: '惠州', center: deepFreeze({ lon: 114.42, lat: 23.11 }) }),
      deepFreeze({ id: 'guizhou', name: '贵州', center: deepFreeze({ lon: 106.63, lat: 26.6 }) }),
    ]),
  },
  deepFreeze({ id: 'new-york', name: '纽约', center: deepFreeze({ lon: -74.01, lat: 40.71 }) }),
  deepFreeze({ id: 'typhoon', name: '台风', center: deepFreeze({ lon: -165, lat: -28 }) }),
]);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export function findRegionById(id: string): Region | undefined {
  for (const region of REGIONS) {
    if (region.id === id) {
      return region;
    }
    if (region.children) {
      const found = findInChildren(region.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function findInChildren(children: readonly Region[], id: string): Region | undefined {
  for (const child of children) {
    if (child.id === id) {
      return child;
    }
    if (child.children) {
      const found = findInChildren(child.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function flattenRegions(): Region[] {
  const result: Region[] = [];
  const walk = (regions: readonly Region[]): void => {
    for (const region of regions) {
      result.push(region);
      if (region.children) {
        walk(region.children);
      }
    }
  };
  walk(REGIONS);
  return result;
}
