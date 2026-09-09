uniform float uTime;
uniform float uAmplitude;
uniform float uSpeed;
uniform float uWaveScale;
uniform float uWaveIterations;
uniform vec2 uWaveDir;
uniform vec4 uWakePoints[8];
uniform vec2 uWakeDirs[8];
uniform float uWakeWidth;
uniform float uWakeWaveLen;
uniform float uWakeLife;

varying float vHeightN;
varying float vSlopeN;
varying vec2 vPos;
varying vec2 vUv;
varying vec3 vNormal;

const int MAX_WAVES = 8;
const float WAVE_SCALE_FACTOR = 1.0812;

uint murmur_hash(uint src) {
  const uint M = 0x5bd1e995u;
  uint h = 1190494759u;
  src *= M;
  src ^= src >> 24u;
  src *= M;
  h *= M;
  h ^= src;
  h ^= h >> 13u;
  h *= M;
  h ^= h >> 15u;
  return h;
}

float calculate_hash(float src) {
  uint h = murmur_hash(floatBitsToUint(src));
  return uintBitsToFloat((h & 0x007fffffu) | 0x3f800000u) - 1.0;
}

float calculate_ocean_elevation(vec2 uv, float time) {
  float elevation = 0.0;
  float weight = 1.0;
  float total = 0.0;
  float speedMult = 1.0;
  vec2 p = uv * uWaveScale;
  for (int i = 0; i < MAX_WAVES; i++) {
    if (float(i) >= uWaveIterations) {
      break;
    }
    float rand = calculate_hash(float(i)) * 2.0 - 1.0;
    float phase = 0.2 + rand * 0.75 * 3.14159265;
    vec2 dir = vec2(sin(phase), cos(phase));
    float d = dot(p, dir) * 10.0 + time * (1.0 + speedMult * uSpeed);
    float h = sin(d) * 0.5 + 0.5;
    h *= h;
    elevation += (h * 2.0 - 1.0) * weight;
    total += weight;
    weight /= WAVE_SCALE_FACTOR;
    p *= WAVE_SCALE_FACTOR;
    speedMult *= WAVE_SCALE_FACTOR;
  }
  return (elevation / total) * uAmplitude;
}

void addWakePoint(inout float height, inout float dhdx, inout float dhdy, vec4 wp, vec2 wd) {
  float age = wp.z;
  if (age >= 0.0 && age < uWakeLife) {
    vec2 rel = position.xy - wp.xy;
    float along = dot(rel, wd);
    float across = dot(rel, vec2(-wd.y, wd.x));
    float envelope = exp(-across * across / (2.0 * uWakeWidth * uWakeWidth));
    float fade = 1.0 - age / uWakeLife;
    float k = 6.28318 / uWakeWaveLen;
    float phase = along * k - age * uSpeed * 5.0;
    float amp = envelope * fade * uAmplitude * wp.w;
    height += sin(phase) * amp;
    dhdx += cos(phase) * k * wd.x * amp;
    dhdy += cos(phase) * k * wd.y * amp;
  }
}

void main() {
  vec3 pos = position;
  vec2 flowUv = uv + uWaveDir * uTime * 0.05;

  float elevation = calculate_ocean_elevation(flowUv, uTime);
  float dhdx = 0.0;
  float dhdy = 0.0;

  addWakePoint(elevation, dhdx, dhdy, uWakePoints[0], uWakeDirs[0]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[1], uWakeDirs[1]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[2], uWakeDirs[2]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[3], uWakeDirs[3]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[4], uWakeDirs[4]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[5], uWakeDirs[5]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[6], uWakeDirs[6]);
  addWakePoint(elevation, dhdx, dhdy, uWakePoints[7], uWakeDirs[7]);

  pos.z += elevation;
  vHeightN = elevation / max(uAmplitude, 0.0001);
  vSlopeN = length(vec2(dhdx, dhdy)) / max(uAmplitude * 8.0, 0.0001);
  vPos = pos.xy;
  vUv = uv;
  vNormal = normalize(vec3(-dhdx, -dhdy, 1.0));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
