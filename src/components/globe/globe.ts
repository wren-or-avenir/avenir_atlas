import {
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WireframeGeometry,
} from 'three';
import type { StageScene } from '../webgl/stage';
import { globeRect } from '../webgl/viewport';

const GOLD = 0xd4af37;
const GLOBE_TILT = 0.41;
const SPIN_SPEED = 0.15;

export function createGlobeScene(): StageScene {
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.z = 3.2;

  const spin = new Group();
  const tilted = new Group();
  tilted.rotation.z = GLOBE_TILT;

  const geometry = new IcosahedronGeometry(1, 2);
  const body = new Mesh(
    geometry,
    new MeshBasicMaterial({ color: 0x0b1e3a, transparent: true, opacity: 0.25 }),
  );
  const wire = new LineSegments(
    new WireframeGeometry(geometry),
    new LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 }),
  );
  tilted.add(body, wire);
  spin.add(tilted);
  scene.add(spin);

  return {
    scene,
    camera,
    rect: () => globeRect({ width: window.innerWidth, height: window.innerHeight }),
    update(dt) {
      spin.rotation.y += dt * SPIN_SPEED;
    },
  };
}
