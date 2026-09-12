uniform float uTime;
uniform vec2 uWorldSize;
uniform vec4 uEvents[8];
uniform vec4 uEventParams[8];
uniform float uSeaState;
uniform sampler2D uTravel;
uniform vec2 uTravelSize;
uniform vec2 uTravelRange;

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
// Reuse lattice corners for the same three forward-difference samples as before.
vec3 noiseSlope(vec2 p) {
  vec2 i=floor(p), f=fract(p), shifted=fract(p+0.025);
  vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 v=shifted*shifted*shifted*(shifted*(shifted*6.0-15.0)+10.0);
  float a=random2(i).x, b=random2(i+vec2(1,0)).x;
  float c=random2(i+vec2(0,1)).x, d=random2(i+1.0).x;
  float value=mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  float nx=mix(mix(a,b,v.x),mix(c,d,v.x),u.y);
  float ny=mix(mix(a,b,u.x),mix(c,d,u.x),v.y);
  if(shifted.x<f.x) nx=noise(p+vec2(0.025,0));
  if(shifted.y<f.y) ny=noise(p+vec2(0,0.025));
  return vec3(value,(vec2(nx,ny)-value)/0.025);
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
// Same integrated shelf rays, baked once when an event is spawned.
// ponytail: the fixed world-height range needs rebuilding if the camera gains zoom.
float travelDistance(float y, int eventIndex) {
  float index=clamp((y-uTravelRange.x)/(uTravelRange.y-uTravelRange.x),0.0,1.0)*(uTravelSize.x-1.0);
  float left=floor(index);
  float row=(float(eventIndex)+0.5)/uTravelSize.y;
  float a=texture2D(uTravel,vec2((left+0.5)/uTravelSize.x,row)).r;
  float b=texture2D(uTravel,vec2((min(left+1.0,uTravelSize.x-1.0)+0.5)/uTravelSize.x,row)).r;
  return mix(a,b,fract(index));
}
// height, d(height)/dx, d(height)/dy in the same units; no epsilon omission.
vec3 waves(vec2 p, out vec2 lightSlope) {
  vec3 w = vec3(0.0);
  lightSlope=vec2(0.0);
  for (int i=0; i<10; i++) {
    float f = float(i);
    float k = 0.8*pow(1.72,f);
    vec2 dir = i<2 ? normalize(vec2(sin(f*2.4)*0.7,-1.0)) : vec2(sin(f*2.4),cos(f*2.4));
    vec2 drift=p*(0.12+f*0.027)+vec2(f*7.3,uTime*0.045);
    vec3 sampleNoise=noiseSlope(drift);
    float modulation=sampleNoise.x;
    vec2 grad=sampleNoise.yz*(0.12+f*0.027);
    float phase = dot(p,dir)*k - uTime*sqrt(9.81*k)*0.42 + f*3.1+modulation*4.0;
    float a = 0.16*pow(0.48,f);
    a*=1.0-smoothstep(1.0,3.0,k*length(fwidth(p)));
    float amplitude=0.45+modulation;
    vec3 layer=vec3(sin(phase)*amplitude, cos(phase)*(k*dir+grad*4.0)*amplitude+sin(phase)*grad)*a;
    w+=layer;
    // Keep all base normals for flow/refraction, filter only reflected lighting.
    lightSlope+=layer.yz*(i<3?1.0:0.06);
  }
  lightSlope*=uSeaState;
  return w*uSeaState;
}
float crestCollapse(float phase) {
  return smoothstep(0.12,0.48,phase);
}
float crestImpact(float phase) {
  return smoothstep(0.38,0.72,phase);
}
// x: active breaking density, y: raised translucent face, z: crest height.
// ponytail: projected lip and collapse approximate an overhead breaker;
// side views with an occluded barrel require actual overturning geometry.
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
    if(envelope<=0.0) continue;
    float seed = e.w;
    float wavelength=8.0+e.z*8.0;
    float c=speedRatio(shelfDepth(p.y),wavelength);
    float lobes=fbm(vec2((x+age*0.22)*0.14,seed+age*0.015));
    float bend=(lobes-0.5)*5.0+x*(0.10+0.04*sin(seed))
      +0.35*(noise(vec2(x*0.65,seed))-0.5)+0.65*relief;
    float q=(age*param.y-travelDistance(p.y,i))*c-bend;
    float height=2.0*e.z*uSeaState/sqrt(c)*(0.95+lobes*0.2);
    float breaking=max(smoothstep(0.60,0.82,height/depth),
      smoothstep(0.13,0.17,height/(wavelength*c)));
    // A shoaling front keeps spilling; it does not switch off on an animation cycle.
    float collapse=crestCollapse(breaking);
    float impact=crestImpact(breaking);
    // Breakers release energy; the shallow face cannot grow without bound.
    height=min(height,0.78*depth);
    float width=mix(0.16,0.65,breaking)*mix(0.65,1.25,lobes)*sqrt(e.z);
    float jagged=(fbm(vec2(x*2.2,seed+age*0.12))-0.5)*width;
    // The lip reaches ahead of the crest, then spreads as the face loses height.
    float lipQ=q+collapse*height*0.38;
    float spread=width*(1.0+impact*0.65);
    float core=1.0-smoothstep(spread*0.2,spread,abs(lipQ+jagged));
    float segments=mix(0.65+lobes*0.35,0.2+0.8*smoothstep(0.30,0.65,lobes),smoothstep(4.0,10.0,depth));
    float fade=1.0-smoothstep(param.w-4.0,param.w,age);
    envelope*=fade;
    result.x+=core*envelope*segments*(collapse*0.35+impact*0.85);
    float faceWidth=mix(2.2,0.42,breaking);
    float profile=exp(-pow(q/(q<0.0?faceWidth:1.8+e.z),2.0));
    float lip=exp(-pow(lipQ/max(width*0.5,0.1),2.0))*collapse;
    result.y+=profile*envelope*height*breaking*(1.0-impact*0.8);
    result.z+=(profile*(1.0-impact*0.75)+lip*0.18)*envelope*height*0.30;
  }
  return result;
}
// Irregular connected foam walls enclosing water holes; stable in flow space.
vec2 foamCells(vec2 p) {
  p += vec2(fbm(p*0.47),fbm(p*0.47+12.0))*2.6;
  vec2 cell = floor(p), f = fract(p);
  float first = 10.0, second = 10.0;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++) {
    vec2 g=vec2(x,y);
    float d=length(g+random2(cell+g)*0.8+0.1-f);
    if(d<first) {second=first;first=d;} else second=min(second,d);
  }
  return vec2(second-first,first);
}
// Keep the accepted seabed caustic pattern unchanged.
vec2 foamPattern(vec2 p) {
  vec2 cells=foamCells(p);
  float aa=max(fwidth(cells.x),0.008);
  return vec2(1.0-smoothstep(0.045,0.045+aa,cells.x),cells.y);
}
