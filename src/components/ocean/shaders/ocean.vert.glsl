uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uSpeed;
uniform vec4 uWakePoints[8];
uniform vec2 uWakeDirs[8];
uniform float uWakeWidth;
uniform float uWakeWaveLen;
uniform float uWakeLife;

varying float vHeightN;
varying vec2 vPos;
varying vec3 vNormal;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void addSwell(
  vec2 dir,
  float freq,
  float speed,
  float amp,
  float phaseNoise,
  inout float height,
  inout float dhdx,
  inout float dhdy
) {
  float d = dot(dir, position.xy);
  float phase = d * freq + uTime * uSpeed * speed + phaseNoise;
  float s = sin(phase);
  float c = cos(phase);
  height += s * amp;
  dhdx += c * amp * dir.x * freq;
  dhdy += c * amp * dir.y * freq;
}

void addWakePoint(inout float height, vec4 wp, vec2 wd) {
  float age = wp.z;
  if (age >= 0.0 && age < uWakeLife) {
    vec2 rel = position.xy - wp.xy;
    float along = dot(rel, wd);
    float across = dot(rel, vec2(-wd.y, wd.x));
    float envelope = exp(-across * across / (2.0 * uWakeWidth * uWakeWidth));
    float fade = 1.0 - age / uWakeLife;
    float w = sin(along * 6.28318 / uWakeWaveLen - age * uSpeed * 5.0);
    height += w * envelope * fade * uAmplitude * wp.w;
  }
}

void main() {
  vec3 pos = position;
  float h = 0.0;
  float dhdx = 0.0;
  float dhdy = 0.0;

  float noise = (valueNoise(position.xy * 2.2) - 0.5) * 2.0;

  addSwell(normalize(vec2(0.7071, 0.7071)), uFrequency, 1.0, uAmplitude, noise, h, dhdx, dhdy);
  addSwell(normalize(vec2(0.92, 0.39)), uFrequency * 1.35, 1.5, uAmplitude * 0.5, noise * 0.7, h, dhdx, dhdy);
  addSwell(normalize(vec2(0.2425, 0.9701)), uFrequency * 0.4, 0.35, uAmplitude * 0.45, noise * 1.3, h, dhdx, dhdy);
  addSwell(normalize(vec2(0.7071, 0.7071)), uFrequency * 3.2, 2.1, uAmplitude * 0.1, 0.0, h, dhdx, dhdy);

  addWakePoint(h, uWakePoints[0], uWakeDirs[0]);
  addWakePoint(h, uWakePoints[1], uWakeDirs[1]);
  addWakePoint(h, uWakePoints[2], uWakeDirs[2]);
  addWakePoint(h, uWakePoints[3], uWakeDirs[3]);
  addWakePoint(h, uWakePoints[4], uWakeDirs[4]);
  addWakePoint(h, uWakePoints[5], uWakeDirs[5]);
  addWakePoint(h, uWakePoints[6], uWakeDirs[6]);
  addWakePoint(h, uWakePoints[7], uWakeDirs[7]);

  pos.z += h;
  vHeightN = h / max(uAmplitude, 0.0001);
  vPos = pos.xy;
  vNormal = normalize(vec3(-dhdx, -dhdy, 1.0));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
