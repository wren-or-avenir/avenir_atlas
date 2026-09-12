import type { ClimateParams, DayNight } from '../../core/theme/theme';

export interface OceanLook {
  deep: readonly [number, number, number];
  shallow: readonly [number, number, number];
  crest: readonly [number, number, number];
  glint: readonly [number, number, number];
  glintStrength: number;
  foamIntensity: number;
  sparkleStrength: number;
}

// 深水向 day09 的饱和蓝青靠拢；浅岸保持青绿，均为 sRGB 艺术初值。
const DAY_LOOK: OceanLook = {
  deep: [0.008, 0.30, 0.46],
  shallow: [0.015, 0.76, 0.68],
  crest: [0.92, 0.96, 0.94],
  glint: [0.76, 0.93, 0.95],
  glintStrength: 0.28,
  foamIntensity: 1,
  sparkleStrength: 0.08,
};

// 参考 night05/night11：近黑水体与局部蓝眼泪。
const NIGHT_LOOK: OceanLook = {
  deep: [0.001, 0.004, 0.012],
  shallow: [0.008, 0.035, 0.11],
  crest: [0.71, 0.97, 1],
  glint: [0.02, 0.55, 0.94],
  glintStrength: 0.15,
  foamIntensity: 0.65,
  sparkleStrength: 1.2,
};

const GRAY_WEIGHTS: readonly [number, number, number] = [0.299, 0.587, 0.114];

export function resolveOceanLook(dayNight: DayNight, climate: ClimateParams): OceanLook {
  const base = dayNight === 'day' ? DAY_LOOK : NIGHT_LOOK;
  return {
    deep: shade(base.deep, climate),
    shallow: shade(base.shallow, climate),
    crest: shade(base.crest, climate),
    glint: shade(base.glint, climate),
    glintStrength: base.glintStrength * climate.brightness,
    foamIntensity: base.foamIntensity,
    sparkleStrength: base.sparkleStrength * climate.brightness,
  };
}

function shade(color: readonly [number, number, number], climate: ClimateParams): readonly [number, number, number] {
  const gray = color[0] * GRAY_WEIGHTS[0] + color[1] * GRAY_WEIGHTS[1] + color[2] * GRAY_WEIGHTS[2];
  return [
    ((color[0] - gray) * climate.saturation + gray) * climate.brightness,
    ((color[1] - gray) * climate.saturation + gray) * climate.brightness,
    ((color[2] - gray) * climate.saturation + gray) * climate.brightness,
  ];
}
