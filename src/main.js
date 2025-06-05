import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { World } from "./world";
import { createUI } from "./ui";


const stats = new Stats();
document.body.append(stats.dom);

const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x88a8e8)
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight
);
camera.position.set(-31, 16, -31);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(16.0,16);
controls.update()

const scene = new THREE.Scene();


const world = new World();
world.generate()
scene.add(world)

const setUpLights = () => {
  const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1.0);
  light2.position.set(-1, 0.5, -0.5);
  scene.add(light2);

  const light3 = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(light3);
};


const animate = () => {
  stats.update()
  window.requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


setUpLights();
createUI(world)
animate();
