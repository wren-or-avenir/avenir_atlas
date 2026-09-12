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
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(random2(i).x, random2(i + vec2(1,0)).x, u.x),
    mix(random2(i + vec2(0,1)).x, random2(i + 1.0).x, u.x), u.y);
}
float fbm(vec2 p) {
  mat2 turn=mat2(0.8,-0.6,0.6,0.8);
  return noise(p)*0.57 + noise(turn*p*2.07+9.3)*0.28 + noise(turn*turn*p*4.13+21.7)*0.15;
}
// Stationary submerged relief in aspect-correct world coordinates.
float reef(vec2 p) {
  float shelf = 1.0 - smoothstep(-6.0, 5.0, p.y);
  float clusters = fbm(p*0.18 + vec2(8.0, 2.0));
  return shelf * smoothstep(0.47, 0.58, clusters + 0.09*noise(p*1.4));
}
float shelfDepth(float y) {
  return mix(1.4,13.0,smoothstep(-17.0,13.0,y));
}
float depthAt(vec2 p) {
  float base = shelfDepth(p.y);
  return max(0.45, base - 1.2*reef(p) + 0.5*(fbm(p*0.15)-0.5));
}
float speedRatio(float depth, float wavelength) {
  return sqrt(tanh(6.2831853*depth/wavelength));
}
// Integrate travel time, so slowing fronts compress without speed*time tearing.
// ponytail: parallel shelf rays, local reef bending below; full refraction needs a 2D travel-time field.
float travelDistance(float y, float wavelength) {
  float distance=24.0-y;
  float total=1.0/speedRatio(shelfDepth(y),wavelength)+1.0/speedRatio(shelfDepth(24.0),wavelength);
  for(int j=1;j<16;j++) {
    float sampleY=y+distance*float(j)/16.0;
    total+=(j%2==0?2.0:4.0)/speedRatio(shelfDepth(sampleY),wavelength);
  }
  return distance*total/48.0;
}
// height, d(height)/dx, d(height)/dy in the same units; no epsilon omission.
vec3 waves(vec2 p) {
  vec3 w = vec3(0.0);
  for (int i=0; i<10; i++) {
    float f = float(i);
    float k = 0.8*pow(1.72,f);
    vec2 dir = i<2 ? normalize(vec2(sin(f*2.4)*0.7,-1.0)) : vec2(sin(f*2.4),cos(f*2.4));
    vec2 drift=p*(0.12+f*0.027)+vec2(f*7.3,uTime*0.045);
    float modulation=noise(drift);
    vec2 grad=(vec2(noise(drift+vec2(0.025,0)),noise(drift+vec2(0,0.025)))-modulation)/0.025*(0.12+f*0.027);
    float phase = dot(p,dir)*k - uTime*sqrt(9.81*k)*0.42 + f*3.1+modulation*4.0;
    float a = 0.16*pow(0.48,f);
    a*=1.0-smoothstep(1.0,3.0,k*length(fwidth(p)));
    float amplitude=0.45+modulation;
    w += vec3(sin(phase)*amplitude, cos(phase)*(k*dir+grad*4.0)*amplitude+sin(phase)*grad) * a;
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
    float wavelength=8.0+e.z*8.0;
    float c=speedRatio(shelfDepth(p.y),wavelength);
    float lobes=fbm(vec2(x*0.38,seed+age*0.035));
    float bend=(lobes-0.5)*4.0+0.22*sin(x*1.7+seed)+0.65*relief;
    float q=(age*param.y-travelDistance(p.y,wavelength))*c-bend;
    float height=2.0*e.z*uSeaState/sqrt(c)*(0.65+lobes*0.65);
    float breaking=max(smoothstep(0.60,0.82,height/depth),
      smoothstep(0.13,0.17,height/(wavelength*c)));
    // Breakers release energy; the shallow face cannot grow without bound.
    height=min(height,0.78*depth);
    float width=mix(0.16,0.85,breaking)*mix(0.65,1.25,lobes)*sqrt(e.z);
    float jagged=(fbm(vec2(x*2.2,seed+age*0.12))-0.5)*width;
    float core=1.0-smoothstep(width*0.25,width,abs(q+jagged-width*0.25));
    float segments=smoothstep(0.24,0.57,lobes);
    float fade=1.0-smoothstep(param.w-4.0,param.w,age);
    envelope*=fade;
    result.x+=core*envelope*segments*breaking;
    float faceWidth=mix(0.95,0.32,breaking);
    float profile=exp(-pow(q/(q<0.0?faceWidth:1.8+e.z),2.0));
    result.y+=profile*envelope*height*breaking;
    result.z+=profile*envelope*height*0.35;
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
