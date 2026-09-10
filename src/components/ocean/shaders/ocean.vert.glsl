uniform vec2 uWorldSize;

varying vec2 vUv;
varying vec2 vWorld;

void main() {
  vUv = uv;
  vWorld = (uv - 0.5) * uWorldSize;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
