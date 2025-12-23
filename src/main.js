import * as THREE from 'three'
import RAPIER from 'rapier';

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.z = 5

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

//Physics
await RAPIER.init();
const gravity = { x: 0.0, y: 0, z: 0.0 };
const world = new RAPIER.World(gravity);

// Renderer
const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// Geometry
const geometry = new THREE.IcosahedronGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ 
  color: 0x6c63ff,
  metalness: 0.3,
  roughness: 0.4
})
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  cube.rotation.y += 0.01

  renderer.render(scene, camera)
}

animate()
