import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import RAPIER from '@dimforge/rapier3d-compat'
import { getBody, getMouseBall, getCoreBall } from "./getBodies.js"
import getLayer from "./getLayer.js";

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

// Renderer
const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.z = 5

// Controls
const controls = new OrbitControls(camera, renderer.domElement)

// Rapier Initialization
await RAPIER.init()
const gravity = { x: 0.0, y: 0, z: 0.0 }
const world = new RAPIER.World(gravity)

// Sprites Background
const gradientBackground = getLayer({
  hue: 0.6,
  numSprites: 8,
  opacity: 0.2,
  radius: 10,
  size: 24,
  z: -10.5,
});
scene.add(gradientBackground);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

const numBodies = 100;
const bodies = [];
for (let i = 0; i < numBodies; i++) {
  const body = getBody(RAPIER, world);
  bodies.push(body);
  scene.add(body.mesh);
}

const pointsGeo = new THREE.BufferGeometry();
const pointsMat = new THREE.PointsMaterial({ 
  size: 0.035, 
  vertexColors: true
});
const points = new THREE.Points(pointsGeo, pointsMat);
scene.add(points);

const mouseBall = getMouseBall(RAPIER, world);
scene.add(mouseBall.mesh);

const coreBall = getCoreBall(RAPIER, world);
scene.add(coreBall.mesh);

// Mouse Interactivity
const raycaster = new THREE.Raycaster();
const pointerPos = new THREE.Vector2(0, 0);
const mousePos = new THREE.Vector3(0, 0, 0);

const mousePlaneGeo = new THREE.PlaneGeometry(48, 48, 48, 48);
const mousePlaneMat = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x00ff00,
  transparent: true,
  opacity: 0.0
});
const mousePlane = new THREE.Mesh(mousePlaneGeo, mousePlaneMat);
mousePlane.position.set(0, 0, 0.2);
scene.add(mousePlane);


window.addEventListener('mousemove', (evt) => {
  pointerPos.set(
    (evt.clientX / window.innerWidth) * 2 - 1,
    -(evt.clientY / window.innerHeight) * 2 + 1
  );
});

let cameraDirection = new THREE.Vector3();
function handleRaycast() {
  // orient the mouse plane to the camera
  camera.getWorldDirection(cameraDirection);
  cameraDirection.multiplyScalar(-1);
  mousePlane.lookAt(cameraDirection);

  raycaster.setFromCamera(pointerPos, camera);
  const intersects = raycaster.intersectObjects(
    [mousePlane],
    false
  );
  if (intersects.length > 0) {
    mousePos.copy(intersects[0].point);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  world.step();
  handleRaycast();
  mouseBall.update(mousePos);
  controls.update();
  // renderDebugView();
  bodies.forEach(b => b.update());
  renderer.render(scene, camera);
}

animate();
