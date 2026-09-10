export interface OceanConfig {
  eventIntervalMin: number;
  eventIntervalMax: number;
  largeEventIntervalMin: number;
  largeEventIntervalMax: number;
  historyFoamTau: number;
  historyGlowTau: number;
  historyAerationTau: number;
  maxHistorySteps: number;
}

export const DEFAULT_OCEAN_CONFIG: Readonly<OceanConfig> = {
  eventIntervalMin: 4,
  eventIntervalMax: 7,
  largeEventIntervalMin: 20,
  largeEventIntervalMax: 40,
  historyFoamTau: 4,
  historyGlowTau: 1,
  historyAerationTau: 2,
  maxHistorySteps: 3,
};
