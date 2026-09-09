uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoamColor;
uniform vec3 uGlint;
uniform float uGlintStrength;
uniform float uFoamThreshold;
uniform float uFoamSmoothness;
uniform float uFoamIntensity;
uniform float uFoamStyle;
uniform float uGlowStrength;
uniform float uTime;
uniform float uAmplitude;
uniform float uAlbedoStrength;
uniform float uSaturation;
uniform float uNight;
uniform float uSpeed;
uniform float uWaveScale;
uniform float uWaveIterations;
uniform float uDetailNormal;
uniform float uSlopeGain;
uniform vec3 uAlbedoMean;
uniform vec2 uWaveDir;
uniform sampler2D uTexAlbedo;

varying float vHeightN;
varying float vSlopeN;
varying vec2 vPos;
varying vec2 vUv;
varying vec3 vNormal;

const int MAX_WAVES = 8;
const float WAVE_SCALE_FACTOR = 1.0812;
const float FOAM_SCALE = 25.0;

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

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash22(vec2 p) {
  return vec2(hash21(p), hash21(p + vec2(17.17, 31.31)));
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

vec2 voronoiAnimated(vec2 x, float time) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int k = -1; k <= 1; k++) {
      vec2 g = vec2(float(k), float(j));
      vec2 o = hash22(i + g);
      o = 0.5 + 0.5 * sin(time + 6.2831 * o);
      vec2 r = g - f + o;
      float d = dot(r, r);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return vec2(sqrt(f1), sqrt(f2));
}

float turbulence(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p = p * 2.03 + vec2(7.1, 3.7);
    a *= 0.5;
  }
  return v;
}

vec2 calculate_ocean_gradient(vec2 uv, float time) {
  vec2 grad = vec2(0.0);
  float weight = 1.0;
  float speedMult = 1.0;
  float k = 10.0;
  for (int i = 0; i < MAX_WAVES; i++) {
    if (float(i) >= uWaveIterations) {
      break;
    }
    float rand = calculate_hash(float(i)) * 2.0 - 1.0;
    float phase = 0.2 + rand * 0.75 * 3.14159265;
    vec2 dir = vec2(sin(phase), cos(phase));
    float d = dot(uv, dir) * k * uWaveScale + time * (1.0 + speedMult * uSpeed);
    float s = sin(d);
    float c = cos(d);
    grad += dir * ((s + 1.0) * c * k * uWaveScale * weight);
    weight /= WAVE_SCALE_FACTOR;
    k *= WAVE_SCALE_FACTOR;
    speedMult *= WAVE_SCALE_FACTOR;
  }
  return grad * uAmplitude;
}

vec3 blend_real_textures() {
  vec3 water = mix(uDeep, uShallow, smoothstep(-0.55, 0.75, vHeightN));
  vec2 drift = vNormal.xy * uTime * 0.045;
  vec2 uvA = vPos * 0.75 + drift;
  const float ca = 0.7071;
  vec2 uvB = vec2(uvA.x * ca - uvA.y * ca, uvA.x * ca + uvA.y * ca) * 1.618 - drift * 0.7;
  vec3 albedo = (texture2D(uTexAlbedo, uvA).rgb + texture2D(uTexAlbedo, uvB).rgb) * 0.5;
  float detail = dot(albedo, vec3(0.299, 0.587, 0.114))
    / dot(uAlbedoMean, vec3(0.299, 0.587, 0.114));
  detail = 1.0 + (detail - 1.0) * uSaturation;
  water *= mix(1.0, detail, uAlbedoStrength);
  return water;
}

float calculate_foam_mask(vec2 uv, float slope) {
  float crest = smoothstep(uFoamThreshold, uFoamThreshold + uFoamSmoothness, slope);
  vec2 warp = vec2(
    turbulence(uv * 3.5 + uTime * 0.3),
    turbulence(uv * 3.5 - uTime * 0.24)
  );
  vec2 p = uv * FOAM_SCALE + (warp - 0.5) * 0.8;
  vec2 v = voronoiAnimated(p, uTime * 0.9);
  float borderNet = 1.0 - smoothstep(0.0, 0.14, (v.y - v.x) * FOAM_SCALE);
  float speckle = smoothstep(0.6, 0.8, 1.0 - v.x * FOAM_SCALE);
  float pattern = mix(borderNet, speckle, uFoamStyle);
  return crest * pattern;
}

float calc_glow(float crestMask, float slope, vec2 flow) {
  vec2 along = vec2(dot(uWaveDir, vPos), dot(vec2(-uWaveDir.y, uWaveDir.x), vPos));
  vec2 glowUV = vec2(along.x * 3.0, along.y * 1.2) + flow * 0.6;
  float n = turbulence(glowUV * 2.2 + uTime * 0.5);
  float dots = smoothstep(0.58, 0.8, n);
  float flicker = 0.6 + 0.4 * sin(uTime * 3.2 + hash21(floor(glowUV * 4.0)) * 6.28318);
  float glow = dots * flicker * (0.3 + 0.5 * min(slope, 1.5));
  return uNight * (crestMask * 0.7 + glow) * uGlowStrength;
}

void main() {
  vec3 color = blend_real_textures();

  vec2 flowUv = vUv + uWaveDir * uTime * 0.05;
  vec2 waveGrad = calculate_ocean_gradient(flowUv, uTime);
  vec3 n = normalize(vNormal + vec3(-waveGrad * uDetailNormal, 0.0));

  vec3 lightDir = normalize(vec3(0.4, 0.35, 0.85));
  float diffuse = clamp(dot(n, lightDir), 0.0, 1.0);
  color *= 0.5 + 0.5 * diffuse;

  vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, halfDir), 0.0, 1.0), 512.0);
  float sparkle = smoothstep(0.7, 0.9, turbulence(vPos * 6.0 + uTime * 0.12));
  color += uGlint * spec * uGlintStrength * sparkle;

  float slope = vSlopeN + length(waveGrad) * uSlopeGain;
  vec2 flow = uTime * 0.25 * uWaveDir;
  float crestMask = smoothstep(uFoamThreshold, uFoamThreshold + uFoamSmoothness, slope);
  float foam = calculate_foam_mask(vPos + flow, slope) * uFoamIntensity;
  color = mix(color, uFoamColor, clamp(foam, 0.0, 1.0));

  color += uGlint * calc_glow(crestMask, slope, flow);

  gl_FragColor = vec4(color, 1.0);
}
