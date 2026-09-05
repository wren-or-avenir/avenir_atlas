import type { ClimateParams, DayNight } from '../../core/theme/theme';

export interface OceanLook {
  deep: readonly [number, number, number];
  shallow: readonly [number, number, number];
  crest: readonly [number, number, number];
  glint: readonly [number, number, number];
  glintStrength: number;
  foamThreshold: number;
  foamSmoothness: number;
  foamIntensity: number;
  sparkleStrength: number;
}

// 参考 docs/design/reference/ocean/ocean_day_07.jpg（青绿海面 + 稀疏白绿波光）
const DAY_LOOK: OceanLook = {
  deep: [0.19, 0.33, 0.33],
  shallow: [0.22, 0.45, 0.47],
  crest: [0.76, 0.84, 0.83],
  glint: [0.8, 0.87, 0.86],
  glintStrength: 0.5,
  foamThreshold: 1.15,
  foamSmoothness: 0.5,
  foamIntensity: 0.85,
  sparkleStrength: 0.12,
};

// 参考 docs/design/reference/ocean/ocean_night_12.jpg（蓝眼泪：近黑海水 + 青色荧光）
const NIGHT_LOOK: OceanLook = {
  deep: [0.004, 0.02, 0.03],
  shallow: [0.03, 0.07, 0.16],
  crest: [0.18, 0.65, 0.9],
  glint: [0.24, 0.73, 0.95],
  glintStrength: 0.4,
  foamThreshold: 0.45,
  foamSmoothness: 0.9,
  foamIntensity: 1,
  sparkleStrength: 0.8,
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
    foamThreshold: base.foamThreshold,
    foamSmoothness: base.foamSmoothness,
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
