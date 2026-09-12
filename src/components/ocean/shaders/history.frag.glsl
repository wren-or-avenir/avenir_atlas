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
  // Half-float history preserves the thin tail instead of draining it every frame.
  vec3 state=old*decay;
  state*=step(vec3(0.0001),state);
  state+=vec3(2.8,8.0,3.0)*source*uDt;
  gl_FragColor=vec4(clamp(state,0.0,1.0),1);
}
