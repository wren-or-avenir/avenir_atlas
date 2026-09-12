// FIELD
uniform float uNight;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoamColor;
uniform vec3 uGlint;
uniform float uGlintStrength;
uniform float uSparkleStrength;
uniform float uBrightness;
uniform float uSaturation;
uniform float uDebug;
uniform sampler2D uHistory;
uniform vec2 uHistoryTexel;
varying vec2 vUv;
varying vec2 vWorld;

vec3 linearColor(vec3 c) {
  return mix(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),c));
}
void main() {
  vec2 p=vWorld;
  vec2 lightSlope;
  vec3 w=waves(p,lightSlope);
  vec3 b=breaker(p);
  vec2 slope=w.yz;
  // Crest face participates in the normal, not just an unrelated white overlay.
  // Screen derivatives reuse adjacent fragments instead of evaluating 8 waves twice more.
  vec2 crestSlope=vec2(dFdx(b.z)/dFdx(p.x),dFdy(b.z)/dFdy(p.y));
  slope+=crestSlope;
  vec3 normal=normalize(vec3(-slope,1.0));
  vec3 lightNormal=normalize(vec3(-lightSlope-crestSlope,1.0));
  float depth=depthAt(p);
  vec2 bottomP=p+normal.xy*min(depth,4.0)*0.25;
  vec3 bottom=vec3(0.0);
  // Night never displays the seabed; skip its procedural rock and caustic work.
  if(uNight<1.0) {
  float rock=reef(bottomP);
  float grain=fbm(bottomP*1.5);
  float mineral=smoothstep(0.25,0.75,fbm(bottomP*0.55+17.0));
  vec3 stone=mix(vec3(0.19,0.27,0.22),vec3(0.48,0.31,0.16),mineral);
  bottom=linearColor(mix(vec3(0.53,0.55,0.36),stone,rock));
  float crag=smoothstep(0.32,0.67,fbm(bottomP*3.0));
  bottom *= 0.55+0.75*crag;
  vec2 caustic=foamPattern(bottomP*1.8+normal.xy*2.0);
  bottom+=vec3(0.07,0.095,0.055)*caustic.x*(0.3+grain);
  }
  // Exponential absorption hides the seabed in deep water.
  vec3 transmission=exp(-vec3(0.48,0.19,0.12)*depth*mix(0.78,1.0,smoothstep(1.0,5.0,depth)));
  float shallow=exp(-depth*0.24);
  vec3 water=mix(linearColor(uDeep),linearColor(uShallow),shallow);
  water=water*(1.0-transmission*0.8)+bottom*transmission*0.8*(1.0-uNight);
  float fresnel=0.025+0.45*pow(1.0-max(dot(lightNormal,normalize(vec3(0,-0.42,1))),0.0),2.0);
  vec3 sky=mix(linearColor(vec3(0.12,0.48,0.72)),vec3(0.32,0.48,0.58)*0.02,uNight);
  water=mix(water,sky,fresnel);
  // A broad sun reflection avoids turning every short-wave peak into a white dot.
  float sun=pow(max(dot(lightNormal,normalize(vec3(-0.18,0.25,1.0))),0.0),22.0);
  // Broad illumination keeps the water's hue; only the small highlight adds white.
  water*=1.0+sun*0.55*(1.0-uNight);
  water+=linearColor(uGlint)*pow(sun,4.0)*uGlintStrength*(1.0-uNight)*0.022;
  water*=0.72+0.35*max(dot(normal,normalize(vec3(-0.4,0.3,0.9))),0.0);
  water*=1.0+(w.x*0.55+normal.y*0.16)*(1.0-uNight*0.6);
  // The steep shore-facing wall occludes light; the long back slope stays softer.
  float faceShade=smoothstep(0.08,0.9,slope.y)*clamp(b.z,0.0,1.0);
  water*=1.0-faceShade*0.32;
  float crestLight=(1.0-exp(-b.y*0.9))*(0.35+0.65*max(-normal.y,0.0));
  water+=linearColor(vec3(0.12,0.72,0.66))*crestLight*(1.0-uNight)*0.48;

  vec3 history=texture2D(uHistory,vUv).rgb;
  float aeration=clamp(history.b*0.4+b.y*0.09,0.0,0.4);
  water=mix(water,linearColor(vec3(0.16,0.58,0.62)),aeration*(1.0-uNight));
  // Expand occupancy across the derivative quad so foam's fwidth/dFdx stay defined.
  float foamPresence=max(history.r,b.x);
  foamPresence+=abs(dFdx(foamPresence));
  foamPresence+=abs(dFdy(foamPresence));
  if(foamPresence>0.0) {
  vec2 flowP=p+vec2(0.08,0.48)*uTime;
  vec2 foamP=flowP*vec2(1.0,0.82)+vec2(fbm(flowP*0.4),fbm(flowP*0.4+8.0))*0.7;
  vec2 cells=foamCells(foamP*2.2);
  float speckle=noise(flowP*29.0);
  float density=clamp(history.r,0.0,1.0);
  // Fresh foam clumps, fine connected residual walls, and exposed water holes.
  float clumps=fbm(foamP*5.0);
  float fresh=b.x*mix(0.55,1.0,smoothstep(0.18,0.65,clumps));
  float fragments=smoothstep(0.28,0.62,fbm(flowP*4.0));
  // Holes open as deposited foam thins; old patches lose branches as well as opacity.
  float erosion=smoothstep(0.025,0.3,density);
  float thickness=mix(0.003,0.075,density*density);
  float lace=1.0-smoothstep(thickness,thickness+max(fwidth(cells.x),0.004),cells.x);
  float film=smoothstep(mix(0.72,0.20,density),mix(0.85,0.38,density),clumps);
  float residual=pow(density,0.8)*mix(lace*fragments*erosion,film,smoothstep(0.45,0.85,density));
  float foam=clamp(fresh*0.95+residual,0.0,0.97);
  vec2 foamSlope=vec2(dFdx(clumps),dFdy(clumps))*18.0;
  float foamLight=0.65+0.35*max(dot(normalize(vec3(-foamSlope,1.0)),normalize(vec3(-0.4,0.3,0.9))),0.0);
  vec3 white=mix(linearColor(vec3(0.34,0.53,0.57)),linearColor(uFoamColor),foamLight);
  white*=0.9+0.1*speckle;
  water=mix(water,white,foam*(1.0-uNight*0.98));

  float excited=clamp(history.g+b.x*0.65,0.0,1.0);
  float luminous=excited*clamp(fresh+residual*1.3,0.0,1.0)*foamLight;
  vec3 glow=linearColor(vec3(0.015,0.8,1.0))*luminous*1.7
    +linearColor(vec3(0.7,0.98,1.0))*pow(luminous,3.0)*1.2;
  water+=glow*uNight*uSparkleStrength;
  }
  // Keep neighboring glow outside the foam mask, but omit it entirely by day.
  if(uNight>0.0) {
  float halo=0.0;
  halo+=texture2D(uHistory,vUv+uHistoryTexel*vec2(3,0)).g;
  halo+=texture2D(uHistory,vUv-uHistoryTexel*vec2(3,0)).g;
  halo+=texture2D(uHistory,vUv+uHistoryTexel*vec2(0,3)).g;
  halo+=texture2D(uHistory,vUv-uHistoryTexel*vec2(0,3)).g;
  water+=linearColor(vec3(0.025,0.32,0.95))*halo*0.065*uNight*uSparkleStrength;
  }
  water*=uBrightness;
  water=mix(vec3(dot(water,vec3(0.2126,0.7152,0.0722))),water,uSaturation);
  if(uDebug==1.0) water=vec3(depth/14.0);
  if(uDebug==2.0) water=normal*0.5+0.5;
  if(uDebug==3.0) water=vec3(b.x);
  if(uDebug==4.0) water=history;
  gl_FragColor=vec4(max(water,vec3(0)),1);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
