uniform float uTime;
uniform vec2 uWorldSize;
uniform vec4 uEvents[8];
uniform vec4 uEventParams[8];
uniform float uSeaState;

// Integer hashing avoids the rectangular precision artifacts of sin()*43758.
vec2 random2(vec2 p) {
  uvec2 q = uvec2(ivec2(p));
  q = q * uvec2(1597334677u, 3812015801u);
  uint h = (q.x ^ q.y) * 1597334677u;
  h ^= h >> 16u;
  h *= 2246822519u;
  h ^= h >> 13u;
  h *= 3266489917u;
  h ^= h >> 16u;
  return vec2(h & 65535u, (h >> 16u) & 65535u) / 65535.0;
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(random2(i).x, random2(i + vec2(1,0)).x, u.x),
    mix(random2(i + vec2(0,1)).x, random2(i + 1.0).x, u.x), u.y);
}
float fbm(vec2 p) {
  return noise(p)*0.57 + noise(p*2.07+9.3)*0.28 + noise(p*4.13+21.7)*0.15;
}
// Stationary submerged relief in aspect-correct world coordinates.
float reef(vec2 p) {
  float shelf = 1.0 - smoothstep(-6.0, 5.0, p.y);
  float clusters = fbm(p*0.18 + vec2(8.0, 2.0));
  return shelf * smoothstep(0.47, 0.58, clusters + 0.09*noise(p*1.4));
}
float depthAt(vec2 p) {
  float base = mix(1.4, 13.0, smoothstep(-17.0, 13.0, p.y));
  return max(0.45, base - 1.2*reef(p) + 0.5*(fbm(p*0.15)-0.5));
}
// height, d(height)/dx, d(height)/dy in the same units; no epsilon omission.
vec3 waves(vec2 p) {
  vec3 w = vec3(0.0);
  vec2 drift=p*0.65+vec2(uTime*0.035,uTime*0.075);
  float warp=fbm(drift)*3.5;
  vec2 warpGrad=vec2(fbm(drift+vec2(0.03,0)),fbm(drift+vec2(0,0.03)));
  warpGrad=(warpGrad*3.5-warp)/0.03*0.65;
  for (int i=0; i<8; i++) {
    float f = float(i);
    float k = 0.8*pow(1.72,f);
    vec2 dir = i<2 ? normalize(vec2(sin(f*2.4)*0.7,-1.0)) : vec2(sin(f*2.4),cos(f*2.4));
    float phase = dot(p,dir)*k - uTime*sqrt(9.81*k)*0.42 + f*3.1+warp;
    float a = 0.16*pow(0.48,f);
    w += vec3(sin(phase), cos(phase)*(k*dir+warpGrad)) * a;
  }
  return w*uSeaState;
}
// x: active breaking density, y: raised translucent face, z: crest height.
// ponytail: an overhead height field cannot overturn; add local crest geometry
// only if the accepted overhead composition needs visible curling silhouettes.
vec3 breaker(vec2 p) {
  vec3 result = vec3(0.0);
  float relief = reef(p);
  float depth=depthAt(p);
  for (int i=0; i<8; i++) {
    vec4 e = uEvents[i], param = uEventParams[i];
    float age = uTime-param.x;
    if (age<0.0 || age>param.w || e.z<=0.0) continue;
    float x = p.x-e.x;
    float envelope = 1.0-smoothstep(param.z*0.55,param.z,abs(x));
    float seed = e.w;
    float front = e.y-age*param.y + 0.9*sin(x*0.32+seed)
      + 0.32*sin(x*1.2+seed*3.0) + 0.14*sin(x*3.7+seed)
      + 0.85*relief;
    float q = p.y-front;
    float jagged = (fbm(vec2(x*2.2,seed+age*0.12))-0.5)*0.24;
    float width = mix(0.14,0.38,smoothstep(0.7,1.5,e.z));
    float core = 1.0-smoothstep(width*0.2,width,abs(q+jagged));
    float segments = smoothstep(0.25,0.53,fbm(vec2(x*0.55,seed+age*0.10)));
    float breaking = clamp(e.z*0.6 + relief*0.8 + (6.0-depth)*0.07,0.0,1.3);
    result.x += core*envelope*segments*breaking*uSeaState;
    result.y += exp(-pow((q+0.36)/0.6,2.0))*envelope*e.z;
    result.z += exp(-pow(q/0.65,2.0))*envelope*0.18*e.z;
  }
  return result;
}
// Irregular connected foam walls enclosing water holes; stable in flow space.
vec2 foamPattern(vec2 p) {
  p += vec2(fbm(p*0.47),fbm(p*0.47+12.0))*2.6;
  vec2 cell = floor(p), f = fract(p);
  float first = 10.0, second = 10.0;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++) {
    vec2 g=vec2(x,y);
    float d=length(g+random2(cell+g)*0.8+0.1-f);
    if(d<first) {second=first;first=d;} else second=min(second,d);
  }
  float aa=max(fwidth(second-first),0.008);
  float wall=1.0-smoothstep(0.045,0.045+aa,second-first);
  return vec2(wall,first);
}
