uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uCrest;
uniform vec3 uGlint;
uniform float uGlintStrength;
uniform float uFoamThreshold;
uniform float uFoamSmoothness;
uniform float uFoamIntensity;
uniform float uSparkleStrength;
uniform float uTime;

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

void main() {
  vec3 color = mix(uDeep, uShallow, smoothstep(-0.9, 1.2, vHeightN));

  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.4, 0.35, 0.85));
  float diffuse = clamp(dot(n, lightDir), 0.0, 1.0);
  color *= 0.5 + 0.5 * diffuse;

  vec3 halfDir = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, halfDir), 0.0, 1.0), 80.0);
  float shimmer = 0.75 + 0.25 * sin(uTime * 2.3 + vPos.x * 9.0);
  color += uGlint * spec * uGlintStrength * shimmer;

  vec2 swellDir = normalize(vec2(0.7071, 0.7071));
  vec2 aligned = vec2(
    dot(swellDir, vPos),
    dot(vec2(-swellDir.y, swellDir.x), vPos)
  );

  float foam = smoothstep(uFoamThreshold, uFoamThreshold + uFoamSmoothness, vHeightN);
  float stripePhase = valueNoise(aligned * vec2(4.0, 2.0)) * 6.28318;
  float stripe = smoothstep(0.3, 0.7, 0.5 + 0.5 * sin(aligned.x * 6.5 + stripePhase));
  float foamPatch = 0.45 + 0.55 * smoothstep(0.5, 0.85, valueNoise(aligned * vec2(2.6, 1.6)));
  foam *= stripe * foamPatch;
  color = mix(color, uCrest, clamp(foam * uFoamIntensity, 0.0, 1.0));

  vec2 cellPos = fract(vPos * 180.0) - 0.5;
  float dotShape = 1.0 - smoothstep(0.05, 0.5, length(cellPos));
  float spark = hash21(floor(vPos * 180.0));
  float twinkle = smoothstep(0.92, 1.0, spark)
    * (0.6 + 0.4 * sin(uTime * 4.0 + spark * 60.0));
  color += uGlint * dotShape * twinkle * uSparkleStrength;

  gl_FragColor = vec4(color, 1.0);
}
