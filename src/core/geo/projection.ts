export interface LonLat {
  lon: number;
  lat: number;
}

export interface Xy2D {
  x: number;
  y: number;
}

export interface Xyz3D {
  x: number;
  y: number;
  z: number;
}

const DEG_TO_RAD = Math.PI / 180;

export function lonLatToXy2D(lon: number, lat: number): Xy2D {
  const x = (lon + 180) / 360;
  const y = 0.5 - lat / 180;
  return { x, y };
}

export function xy2DToLonLat(x: number, y: number): LonLat {
  const lon = x * 360 - 180;
  const lat = (0.5 - y) * 180;
  return { lon, lat };
}

export function lonLatToXyz3D(lon: number, lat: number, radius = 1): Xyz3D {
  const phi = lat * DEG_TO_RAD;
  const lambda = lon * DEG_TO_RAD;
  return {
    x: radius * Math.cos(phi) * Math.cos(lambda),
    y: radius * Math.sin(phi),
    z: radius * Math.cos(phi) * Math.sin(lambda),
  };
}

export function clientToLonLat(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): LonLat {
  return xy2DToLonLat(clientX / width, clientY / height);
}
