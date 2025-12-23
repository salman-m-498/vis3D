import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MarchingCubes } from "three/examples/jsm/Addons.js";
const sceneMiddle = new THREE.Vector3(0, 0, 0);
// const colorPallete = [0x780000, 0xc1121f, 0xfdf0d5, 0x003049, 0x669bbc];
const colorPallete = [0x0067b1, 0x4e99ce, 0x9bcbeb, 0x55d7e2, 0xffffff, 0x9ca9b2, 0x4e6676, 0xf69230, 0xf5d81f];
// const colorPallete = [0xff6d00, 0xff7900, 0xff8500, 0xff9100, 0xff9e00, 0x240046, 0x3c096c, 0x5a189a, 0x7b2cbf, 0x9d4edd];

// Metaballs
function getMetaballs() {
  const metaMat = new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    metalness: 1.0,
    roughness: 0.05,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
   
  const metaballs = new MarchingCubes(96, metaMat, true, true, 9000);
  metaballs.position.set(0, 0, 0);
  metaballs.scale.set(10, 10, 10);
  metaballs.isolation = 800;

  function update(bodies, mousePos) {
    metaballs.reset();
    const strength = 0.5;
    const subtract = 12;
    bodies.forEach((b) => {
      const { x, y, z } = b.mesh.position;
      // Normalize positions to 0-1 range for MarchingCubes
      metaballs.addBall(
        (x + 5) / 10,
        (y + 5) / 10,
        (z + 5) / 10,
        strength,
        subtract
      );
    });
    // Add mouse ball to metaballs
    if (mousePos) {
      metaballs.addBall(
        (mousePos.x + 5) / 10,
        (mousePos.y + 5) / 10,
        (mousePos.z + 5) / 10,
        strength * 1.5,
        subtract
      );
    }
  }

  return { mesh: metaballs, update };
}

// geos:
const geometries = [
  new THREE.SphereGeometry(0.65, 32, 32),
];

const glbLoader = new GLTFLoader();
const glbPaths = ["duck.glb"]; // Add more paths as needed

async function loadGLTFModels() {
  const promises = glbPaths.map((path) =>
    new Promise((resolve, reject) => {
      glbLoader.load(
        `glb/${path}`,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              geometries.push(child.geometry);
            }
          });
          resolve();
        },
        undefined,
        (error) => reject(error)
      );
    })
  );

  try {
    await Promise.all(promises);
    console.log("All GLTF models loaded successfully.");
  } catch (error) {
    console.error("Error loading GLTF models:", error);
  }
}

await loadGLTFModels();
function getGeometry(size) {
  const randomGeo = geometries[Math.floor(Math.random() * geometries.length)];
  const geo = randomGeo.clone();
  geo.scale(size, size, size);
  return geo;
}
    
function getBody(RAPIER, world) {
  const size = 0.5; // 0.1 + Math.random() * 0.25;
  const range = 12;
  const density = size * 1.0;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5 + 3;
  let z = Math.random() * range - range * 0.5;
  
  //let color = colorPallete[Math.floor(Math.random() * colorPallete.length)];
  let color = new THREE.Color(0x050505);
  const geometry = getGeometry(size);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1.0,
    roughness: 0.05,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // physics
  let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z)
    // .setLinearDamping(1)
    // .setAngularDamping(1);
  let rigid = world.createRigidBody(rigidBodyDesc);
  let points = geometry.attributes.position.array;
  let colliderDesc = RAPIER.ColliderDesc.convexHull(points).setDensity(density);
  world.createCollider(colliderDesc, rigid);

  function update() {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    let q = rigid.rotation();
    let rote = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    mesh.rotation.setFromQuaternion(rote);
    rigid.addForce(dir.multiplyScalar(-0.5), true);
    mesh.position.set(x, y, z);
  }
  return { mesh, rigid, update };
}

function getMouseBall(RAPIER, world) {
  const mouseSize = 0.25;
  const geometry = new THREE.IcosahedronGeometry(mouseSize, 8);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    metalness: 1.0,
    roughness: 0.05,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const mouseMesh = new THREE.Mesh(geometry, material);
  // RIGID BODY
  let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0)
  let mouseRigid = world.createRigidBody(bodyDesc);
  let dynamicCollider = RAPIER.ColliderDesc.ball(mouseSize * 3.0);
  world.createCollider(dynamicCollider, mouseRigid);
  function update(mousePos) {
    mouseRigid.setTranslation({ x: mousePos.x, y: mousePos.y, z: mousePos.z });
    let { x, y, z } = mouseRigid.translation();
    mouseMesh.position.set(x, y, z);
  }
  return { mesh: mouseMesh, update };
}

function getCoreBall(RAPIER, world) {
  const coreSize = 1;
  const geometry = new THREE.IcosahedronGeometry(coreSize, 8);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    metalness: 1.0,
    roughness: 0.05,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const coreMesh = new THREE.Mesh(geometry, material);
  // RIGID BODY
  let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0)
  let coreRigid = world.createRigidBody(bodyDesc);
  let dynamicCollider = RAPIER.ColliderDesc.ball(coreSize * 1.5);
  let collider = world.createCollider(dynamicCollider, coreRigid);
  function update(time) {
    const scale = (0.8 + Math.sin(time * 0.002) * 1); // Creates a range between 0.6 and 1.0
    // Apply the same scale value to all axes for uniform pulsing
    coreMesh.scale.set(scale, scale, scale);
    // Update collider radius to match visual scale
    collider.setRadius(coreSize * scale) *1.1;
    coreRigid.setTranslation({ x: 0, y: 0, z: 0 });
    let { x, y, z } = coreRigid.translation();
    coreMesh.position.set(x, y, z);
  }
  return { mesh: coreMesh, update };
}

export { getBody, getMouseBall, getCoreBall, getMetaballs };