import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { World } from "./world";
import { createUI } from "./ui";
import { Player } from "./player";
import { Physics } from "./physics";
import { ModelLoader } from "./modelLoader";


const stats = new Stats();
document.body.append(stats.dom);

const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x88a8e8)
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const orbitCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight
);
orbitCamera.position.set(32, 16, 32);
orbitCamera.layers.enable(1);
orbitCamera.lookAt(0, 0, 0);
const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.target.set(16.0,16);
controls.update()

const scene = new THREE.Scene();

scene.fog = new THREE.Fog(0x80a0e0, 50, 75);
const world = new World();
world.generate()
scene.add(world)

const player = new Player(scene,world);
const physics = new Physics(scene);

// Set initial player position high up to ensure falling
player.position.set(32, 40, 32);
player.velocity.set(0, 0, 0);
player.control.lock();

world.player = player;

// Initialize model loader after player is fully set up
const modelLoader = new ModelLoader((models) => {
  if (player && player.tool) {
    player.tool.setMesh(models.pickaxe);
  } else {
    console.error('Player or player.tool is not initialized');
  }
});

const sun = new THREE.DirectionalLight(0xffffff, 1.5);
const setUpLights = () => {
 
  sun.position.set(50, 30, 50);
  sun.shadow.camera
  sun.castShadow = true
  scene.add(sun);

  
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0001;
  sun.shadow.mapSize = new THREE.Vector2(2048, 2048);
  scene.add(sun);
  scene.add(sun.target);

  const ambient = new THREE.AmbientLight();
  ambient.intensity = 0.2;
  scene.add(ambient);
};

let previousTime = performance.now();
const animate = () => {
  let currentTime = performance.now();
  const dt = (currentTime-previousTime)/1000;
  previousTime = currentTime;
  stats.update();
  player.update(world)
  physics.update(dt,player,world)
  world.update(player)
  sun.position.copy(player.position)
  sun.position.sub(new THREE.Vector3(-50,-50,-50))
  sun.target.position.copy(player.position)
  window.requestAnimationFrame(animate);
  renderer.render(scene,player.control.isLocked ? player.camera : orbitCamera);
};

window.addEventListener("resize", () => {
  orbitCamera.aspect = window.innerWidth / window.innerHeight;
  orbitCamera.updateProjectionMatrix();
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


setUpLights();
createUI(world,player,physics,scene)
animate();
