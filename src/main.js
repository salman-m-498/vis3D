import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import RAPIER from '@dimforge/rapier3d-compat'
import { getBody, getMouseBall, getCoreBall, getMetaballs } from "./getBodies.js"
import getLayer from "./getLayer.js";

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a15)

// Renderer
const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Create a simple procedural environment map for reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

// Create gradient environment texture
const envScene = new THREE.Scene()
const envCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const gradientMaterial = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      vec3 top = vec3(0.1, 0.15, 0.3);
      vec3 bottom = vec3(0.02, 0.02, 0.05);
      vec3 color = mix(bottom, top, vUv.y);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide
})
const gradientMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gradientMaterial)
envScene.add(gradientMesh)

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget)
cubeCamera.update(renderer, envScene)
const envMap = pmremGenerator.fromCubemap(cubeRenderTarget.texture).texture
scene.environment = envMap

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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// Additional lights for better metallic reflections
const light2 = new THREE.DirectionalLight(0x4488ff, 0.8)
light2.position.set(-5, 3, -5)
scene.add(light2)

const light3 = new THREE.DirectionalLight(0xff8844, 0.5)
light3.position.set(0, -5, 5)
scene.add(light3)

const numBodies = 100;
const bodies = [];
for (let i = 0; i < numBodies; i++) {
  const body = getBody(RAPIER, world);
  bodies.push(body);
  // Don't add meshes - metaballs will visualize them
}

const pointsGeo = new THREE.BufferGeometry();
const pointsMat = new THREE.PointsMaterial({ 
  size: 0.035, 
  vertexColors: true
});
const points = new THREE.Points(pointsGeo, pointsMat);
scene.add(points);

const mouseBall = getMouseBall(RAPIER, world);
// Don't add mesh - metaballs will render it

const coreBall = getCoreBall(RAPIER, world);
// Don't add mesh - metaballs will render it

const metaballs = getMetaballs();
scene.add(metaballs.mesh);

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
function animate(time) {
  requestAnimationFrame(animate);
  world.step();
  handleRaycast();
  mouseBall.update(mousePos);
  coreBall.update(time);
  const coreScale = coreBall.getScale();
  controls.update();
  // renderDebugView();
  bodies.forEach(b => b.update(coreScale));
  metaballs.update(bodies, mousePos, coreScale);
  renderer.render(scene, camera);
}

animate(0);
