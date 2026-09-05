import type { LonLat } from './projection';

type LonLatTuple = readonly [lon: number, lat: number];

// 粗轮廓占位数据，真实地图轮廓待 menu 模块的 SVG 路径落地后回填。
const NORTH_AMERICA: readonly LonLatTuple[] = [
  [-165, 65], [-145, 70], [-125, 72], [-110, 73], [-95, 72], [-80, 70],
  [-60, 60], [-55, 52], [-60, 45], [-70, 41], [-74, 40], [-76, 35],
  [-80, 30], [-81, 25], [-84, 28], [-88, 30], [-92, 29], [-95, 28],
  [-97, 26], [-98, 22], [-97, 18], [-93, 16], [-88, 14], [-83, 10],
  [-86, 12], [-95, 16], [-105, 20], [-112, 24], [-118, 30], [-124, 36],
  [-125, 43], [-124, 48], [-128, 52], [-135, 56], [-145, 59], [-152, 58],
  [-158, 57], [-163, 60],
];

const SOUTH_AMERICA: readonly LonLatTuple[] = [
  [-80, 8], [-75, 10], [-70, 12], [-60, 10], [-50, 5], [-40, -5], [-35, -10],
  [-38, -18], [-40, -25], [-48, -30], [-55, -35], [-65, -40], [-70, -45],
  [-72, -50], [-75, -45], [-73, -35], [-72, -25], [-75, -15], [-80, -5], [-81, 2],
];

const AFRICA: readonly LonLatTuple[] = [
  [-6, 35], [10, 37], [20, 32], [32, 31], [40, 28], [43, 20], [48, 11], [51, 10],
  [45, 2], [40, -5], [38, -12], [36, -20], [32, -28], [25, -34], [20, -35],
  [15, -28], [12, -18], [9, -10], [8, 0], [5, 5], [-5, 5], [-12, 8], [-17, 15],
  [-16, 22], [-13, 28], [-8, 33],
];

const EURASIA: readonly LonLatTuple[] = [
  [-10, 38], [2, 47], [12, 52], [20, 58], [32, 64], [50, 68], [70, 72], [90, 73],
  [110, 72], [125, 70], [140, 66], [155, 60], [168, 58], [175, 62], [162, 55],
  [150, 50], [142, 44], [135, 38], [125, 34], [120, 28], [115, 22], [110, 18],
  [104, 12], [98, 8], [88, 14], [80, 8], [74, 12], [68, 18], [62, 23], [55, 26],
  [48, 28], [42, 30], [36, 32], [30, 34], [22, 35], [14, 36], [6, 36], [-4, 36],
];

const AUSTRALIA: readonly LonLatTuple[] = [
  [114, -22], [122, -18], [130, -12], [138, -12], [143, -15], [146, -19],
  [150, -24], [153, -28], [150, -37], [146, -39], [140, -38], [135, -35],
  [130, -32], [125, -32], [118, -34], [113, -32], [114, -26],
];

const GREENLAND: readonly LonLatTuple[] = [
  [-45, 60], [-53, 65], [-58, 72], [-45, 78], [-30, 80], [-20, 75], [-22, 70],
  [-30, 65], [-40, 60],
];

const ANTARCTICA: readonly LonLatTuple[] = [
  [-180, -70], [-120, -75], [-60, -72], [0, -70], [60, -68], [120, -66],
  [180, -70], [120, -74], [0, -75], [-120, -76],
];

export const WORLD_OUTLINE: readonly (readonly LonLatTuple[])[] = [
  NORTH_AMERICA,
  SOUTH_AMERICA,
  AFRICA,
  EURASIA,
  AUSTRALIA,
  GREENLAND,
  ANTARCTICA,
];

export function pointInPolygon(point: LonLat, polygon: readonly LonLatTuple[]): boolean {
  const { lon: px, lat: py } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py) {
      const xCross = xi + ((py - yi) * (xj - xi)) / (yj - yi);
      if (xCross > px) {
        inside = !inside;
      }
    }
  }
  return inside;
}

export function isInsideWorldOutline(lon: number, lat: number): boolean {
  const point: LonLat = { lon, lat };
  return WORLD_OUTLINE.some((polygon) => pointInPolygon(point, polygon));
}
