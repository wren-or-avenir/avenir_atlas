export interface OceanConfig {
  waveAmplitude: number;
  waveFrequency: number;
  waveSpeed: number;
  segmentCount: number;
  wakeLife: number;
  wakeWidth: number;
  wakeWaveLen: number;
  wakeMinStep: number;
  wakeMaxStrength: number;
}

export const DEFAULT_OCEAN_CONFIG: Readonly<OceanConfig> = {
  waveAmplitude: 0.2,
  waveFrequency: 4,
  waveSpeed: 1,
  segmentCount: 128,
  wakeLife: 2.5,
  wakeWidth: 0.07,
  wakeWaveLen: 0.16,
  wakeMinStep: 0.01,
  wakeMaxStrength: 1.2,
};
