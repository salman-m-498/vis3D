import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MarchingCubes } from "three/examples/jsm/Addons.js";
const sceneMiddle = new THREE.Vector3(0, 0, 0);
// const colorPallete = [0x780000, 0xc1121f, 0xfdf0d5, 0x003049, 0x669bbc];
const colorPallete = [0x0067b1, 0x4e99ce, 0x9bcbeb, 0x55d7e2, 0xffffff, 0x9ca9b2, 0x4e6676, 0xf69230, 0xf5d81f];
// const colorPallete = [0xff6d00, 0xff7900, 0xff8500, 0xff9100, 0xff9e00, 0x240046, 0x3c096c, 0x5a189a, 0x7b2cbf, 0x9d4edd];

// Metaballs
// Ferrofluid shader material
function createFerrofluidMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uCoreScale: { value: 1.0 },
  };

  const vertexShader = `
    uniform float uTime;
    uniform float uCoreScale;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    
    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      // Spike displacement based on normal direction and noise
      vec3 pos = position;
      float noise = snoise(pos * 3.0 + uTime * 0.5);
      float spikeAmount = 0.02 * uCoreScale;
      pos += normal * noise * spikeAmount;
      
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // Fresnel effect for metallic look
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      
      // Base color - very dark with slight blue tint
      vec3 baseColor = vec3(0.02, 0.02, 0.03);
      
      // Reflection color
      vec3 reflectColor = vec3(0.4, 0.45, 0.5);
      
      // Mix based on fresnel
      vec3 finalColor = mix(baseColor, reflectColor, fresnel * 0.7);
      
      // Add subtle rim lighting
      float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
      finalColor += vec3(0.1, 0.15, 0.2) * rim;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });

  return material;
}

function getMetaballs() {
  // Ferrofluid material - metallic black with high reflectivity
  const metaMat = new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    metalness: 1.0,
    roughness: 0.05,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.5,
  });
   
  // Higher resolution for smoother blobs
  const resolution = 64;
  const metaballs = new MarchingCubes(resolution, metaMat, false, false, 100000);
  metaballs.position.set(0, 0, 0);
  metaballs.scale.set(5, 5, 5);
  metaballs.isolation = 90;
  metaballs.enableUvs = false;
  metaballs.enableColors = false;

  function update(bodies, mousePos, coreScale = 1) {
    metaballs.reset();
    
    const subtract = 12;
    const strength = 1.2;
    
    // Add core ball at center - scales with the pulsing core
    metaballs.addBall(0.5, 0.5, 0.5, strength * coreScale * 0.8, subtract);
    
    // Add body balls
    bodies.forEach((b) => {
      const { x, y, z } = b.mesh.position;
      // Normalize to 0-1 range (scale is 5, so world coords go from -2.5 to +2.5)
      const nx = (x / 5) + 0.5;
      const ny = (y / 5) + 0.5;
      const nz = (z / 5) + 0.5;
      // Clamp to valid range
      if (nx > 0.05 && nx < 0.95 && ny > 0.05 && ny < 0.95 && nz > 0.05 && nz < 0.95) {
        metaballs.addBall(nx, ny, nz, strength * 0.35, subtract);
      }
    });
    
    // Add mouse ball
    if (mousePos) {
      const mx = (mousePos.x / 5) + 0.5;
      const my = (mousePos.y / 5) + 0.5;
      const mz = (mousePos.z / 5) + 0.5;
      if (mx > 0.05 && mx < 0.95 && my > 0.05 && my < 0.95 && mz > 0.05 && mz < 0.95) {
        metaballs.addBall(mx, my, mz, strength * 0.5, subtract);
      }
    }
    
    // Update the geometry after adding balls
    metaballs.update();
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
  const size = 0.5;
  const range = 4;  // Reduced range to stay within metaballs bounds
  const density = size * 1.0;
  let x = Math.random() * range - range * 0.5;
  let y = Math.random() * range - range * 0.5;
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
    .setLinearDamping(2.0)
    .setAngularDamping(1.0);
  let rigid = world.createRigidBody(rigidBodyDesc);
  let points = geometry.attributes.position.array;
  let colliderDesc = RAPIER.ColliderDesc.convexHull(points).setDensity(density);
  world.createCollider(colliderDesc, rigid);

  function update(coreScale = 1) {
    rigid.resetForces(true);
    let { x, y, z } = rigid.translation();
    let pos = new THREE.Vector3(x, y, z);
    let dir = pos.clone().sub(sceneMiddle).normalize();
    let distance = pos.length();
    
    // Magnetic attraction - stronger when core expands, weaker when contracts
    // Creates the ferrofluid "breathing" effect
    const baseAttraction = 1.5;
    const coreInfluence = coreScale * 2.0; // Core scale affects attraction
    const attractionStrength = baseAttraction + coreInfluence;
    
    // Repulsion when too close (prevents clumping at center)
    const minDistance = coreScale * 1.2;
    let force;
    if (distance < minDistance) {
      // Push away from center
      force = dir.multiplyScalar(attractionStrength * 0.5);
    } else {
      // Pull toward center
      force = dir.multiplyScalar(-attractionStrength);
    }
    
    rigid.addForce(force, true);
    
    let q = rigid.rotation();
    let rote = new THREE.Quaternion(q.x, q.y, q.z, q.w);
    mesh.rotation.setFromQuaternion(rote);
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
  let currentScale = 1;
  function update(time) {
    currentScale = 0.8 + Math.sin(time * 0.002) * 0.6; // Range 0.2 to 1.4
    // Apply the same scale value to all axes for uniform pulsing
    coreMesh.scale.set(currentScale, currentScale, currentScale);
    // Update collider radius to match visual scale
    collider.setRadius(coreSize * currentScale * 1.1);
    coreRigid.setTranslation({ x: 0, y: 0, z: 0 });
    let { x, y, z } = coreRigid.translation();
    coreMesh.position.set(x, y, z);
  }
  function getScale() {
    return currentScale;
  }
  return { mesh: coreMesh, update, getScale };
}

export { getBody, getMouseBall, getCoreBall, getMetaballs };