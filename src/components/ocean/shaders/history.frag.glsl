// FIELD
uniform sampler2D uHistory;
uniform float uDt;
uniform float uFoamTau;
uniform float uGlowTau;
uniform float uAerationTau;
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  vec2 previous=vUv+vec2(0.08,0.48)*uDt/uWorldSize;
  vec3 old=vec3(0);
  if(all(greaterThanEqual(previous,vec2(0))) && all(lessThanEqual(previous,vec2(1))))
    old=texture2D(uHistory,previous).rgb;
  vec3 decay=exp(-uDt/vec3(uFoamTau,uGlowTau,uAerationTau));
  float source=breaker(vWorld).x;
  // Only the narrow breaking front injects state: no broad moving light curtain.
  vec3 state=max(old*decay-vec3(1.0/255.0),vec3(0));
  state+=vec3(7.0,11.0,4.5)*source*uDt;
  gl_FragColor=vec4(clamp(state,0.0,1.0),1);
}
