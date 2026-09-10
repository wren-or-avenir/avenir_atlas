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
  vec3 w=waves(p);
  vec3 b=breaker(p);
  vec2 slope=w.yz;
  vec2 rippleP=p*2.1+vec2(uTime*0.12,uTime*0.24);
  float ripple=fbm(rippleP);
  slope+=vec2(fbm(rippleP+vec2(0.05,0))-ripple,
              fbm(rippleP+vec2(0,0.05))-ripple)*2.2;
  // Crest face participates in the normal, not just an unrelated white overlay.
  slope += vec2(breaker(p+vec2(0.06,0)).z-b.z,
                breaker(p+vec2(0,0.06)).z-b.z)/0.06;
  vec3 normal=normalize(vec3(-slope,1.0));
  float depth=depthAt(p);
  vec2 bottomP=p+normal.xy*min(depth,4.0)*0.25;
  float rock=reef(bottomP);
  float grain=fbm(bottomP*1.5);
  vec3 bottom=linearColor(mix(vec3(0.53,0.55,0.36),vec3(0.23,0.22,0.12),rock));
  float crag=smoothstep(0.32,0.67,fbm(bottomP*3.0));
  bottom *= 0.55+0.75*crag;
  vec2 caustic=foamPattern(bottomP*1.8+normal.xy*2.0);
  bottom+=vec3(0.07,0.095,0.055)*caustic.x*(0.3+grain);
  // Exponential absorption hides the seabed in deep water.
  vec3 transmission=exp(-vec3(0.48,0.19,0.12)*depth);
  float shallow=exp(-depth*0.24);
  vec3 water=mix(linearColor(uDeep),linearColor(uShallow),shallow);
  water=water*(1.0-transmission*0.8)+bottom*transmission*0.8*(1.0-uNight);
  float fresnel=0.025+0.45*pow(1.0-max(dot(normal,normalize(vec3(0,-0.42,1))),0.0),2.0);
  water=mix(water,vec3(0.32,0.48,0.58)*(1.0-uNight*0.98),fresnel);
  float sun=pow(max(dot(normal,normalize(vec3(-0.18,0.25,1.0))),0.0),180.0);
  water+=linearColor(uGlint)*sun*uGlintStrength*(1.0-uNight)*0.38;
  water*=0.72+0.35*max(dot(normal,normalize(vec3(-0.4,0.3,0.9))),0.0);
  water*=1.0+(w.x*0.55+normal.y*0.16)*(1.0-uNight*0.6);

  vec3 history=texture2D(uHistory,vUv).rgb;
  vec2 flowP=p+vec2(0.08,0.48)*uTime;
  vec2 foamP=flowP+vec2(fbm(flowP*0.4),fbm(flowP*0.4+8.0))*1.4;
  vec2 lace=foamPattern(foamP*1.7);
  float speckle=noise(flowP*29.0);
  float density=clamp(history.r,0.0,1.0);
  // Fresh foam clumps, fine connected residual walls, and exposed water holes.
  float fresh=b.x*smoothstep(0.22,0.62,fbm(flowP*12.0));
  float fragments=smoothstep(0.28,0.62,fbm(flowP*4.0));
  float residual=density*mix(lace.x*fragments,smoothstep(0.16,0.42,lace.y),smoothstep(0.35,0.85,density));
  residual+=density*0.12*smoothstep(0.66,0.8,speckle);
  float foam=clamp(fresh*0.95+residual,0.0,0.97);
  float aeration=clamp(history.b*0.4+b.y*0.09,0.0,0.4);
  water=mix(water,linearColor(vec3(0.16,0.58,0.62)),aeration*(1.0-uNight));
  vec3 white=linearColor(uFoamColor)*(0.76+0.24*speckle);
  water=mix(water,white,foam*(1.0-uNight*0.98));

  float excited=clamp(history.g+b.x*0.65,0.0,1.0);
  float luminous=excited*clamp(fresh+residual*1.3,0.0,1.0);
  float halo=0.0;
  halo+=texture2D(uHistory,vUv+uHistoryTexel*vec2(3,0)).g;
  halo+=texture2D(uHistory,vUv-uHistoryTexel*vec2(3,0)).g;
  halo+=texture2D(uHistory,vUv+uHistoryTexel*vec2(0,3)).g;
  halo+=texture2D(uHistory,vUv-uHistoryTexel*vec2(0,3)).g;
  vec3 glow=linearColor(vec3(0.025,0.32,0.95))*halo*0.065
    +linearColor(vec3(0.015,0.8,1.0))*luminous*1.7
    +linearColor(vec3(0.7,0.98,1.0))*pow(luminous,3.0)*1.2;
  water+=glow*uNight*uSparkleStrength;
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
