import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { blocks } from "./blocks";
import { Tool } from "./tool";

const CENTER_SCREEN = new THREE.Vector2();

export class Player {
  radius = 0.5;
  height = 1.75;
  maxSpeed = 10;
  jumpSpeed = 10;
  sprinting = false;
  onGround = false;
  input = new THREE.Vector3();
  velocity = new THREE.Vector3();
  #worldVelocity = new THREE.Vector3();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  cameraHelper = new THREE.CameraHelper(this.camera);
  control = new PointerLockControls(this.camera, document.body);

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(),
    0,
    3
  );
  selectedCoords = null;
  activeBlockId = blocks.empty.id;

  tool = new Tool();

  constructor(scene, world) {
    this.world = world;
    this.camera.position.set(32, 40, 32);
    this.camera.layers.enable(1);
    scene.add(this.camera);
    scene.add(this.cameraHelper);
    this.camera.add(this.tool);

    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("mousedown", this.onMouseDown.bind(this));

    this.boundsHelper = new THREE.Mesh(
      new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16),
      new THREE.MeshBasicMaterial({ wireframe: true })
    );
    scene.add(this.boundsHelper);

    const selectionMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.3,
      color: 0xffffaa,
    });
    const selectionGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    this.selectionHelper = new THREE.Mesh(selectionGeometry, selectionMaterial);
    scene.add(this.selectionHelper);

    this.raycaster.layers.set(0);
    this.onGround = false;
  }

  get position() {
    return this.camera.position;
  }

  update(world) {
    this.updateRaycaster(world);
    this.tool.update();
  }

  updateRaycaster(world) {
    this.raycaster.setFromCamera(CENTER_SCREEN, this.camera);
    const intersections = this.raycaster.intersectObject(world, true);

    if (intersections.length > 0) {
      const intersection = intersections[0];

      // Get the chunk associated with the selected block
      const chunk = intersection.object.parent;

      // Get the transformation matrix for the selected block
      const blockMatrix = new THREE.Matrix4();
      intersection.object.getMatrixAt(intersection.instanceId, blockMatrix);

      // Set the selected coordinates to the origin of the chunk,
      // then apply the transformation matrix of the block to get
      // the block coordinates
      this.selectedCoords = chunk.position.clone();
      this.selectedCoords.applyMatrix4(blockMatrix);

      if (this.activeBlockId !== blocks.empty.id) {
        // If we are adding a block, move it 1 block over in the direction
        // of where the ray intersected the cube
        this.selectedCoords.add(intersection.normal);
      }

      this.selectionHelper.position.copy(this.selectedCoords);
      this.selectionHelper.visible = true;
    } else {
      this.selectedCoords = null;
      this.selectionHelper.visible = false;
    }
  }

  updateBoundsHelper() {
    this.boundsHelper.position.copy(this.camera.position);
    this.boundsHelper.position.y -= this.height / 2;
  }
  get worldVelocity() {
    this.#worldVelocity.copy(this.velocity);
    this.#worldVelocity.applyEuler(
      new THREE.Euler(0, this.camera.rotation.y, 0)
    );
    return this.#worldVelocity;
  }

  applyWorldDeltaVelocity(dv) {
    dv.applyEuler(new THREE.Euler(0, -this.camera.rotation.y, 0));
    this.velocity.add(dv);
  }

  applyInputs(dt) {
    if (this.control.isLocked) {
      this.velocity.x = this.input.x * (this.sprinting ? 2 : 1);
      this.velocity.z = this.input.z * (this.sprinting ? 2 : 1);
      this.control.moveRight(this.velocity.x * dt);
      this.control.moveForward(this.velocity.z * dt);
      this.position.y += this.velocity.y * dt;

      document.getElementById("info-player-position").innerHTML =
        this.toString();
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case "KeyW":
        this.input.z = 0;
        break;
      case "KeyA":
        this.input.x = 0;
        break;
      case "KeyS":
        this.input.z = 0;
        break;
      case "KeyD":
        this.input.x = 0;
        break;
      case "Space":
        if (this.onGround) {
          this.velocity.y += this.jumpSpeed;
        }
        break;
        case 'ShiftLeft':
      case 'ShiftRight':
        this.sprinting = false;
        break;
    }
  }
  onKeyDown(event) {
    if (document.getElementById("overlay")) {
      document.getElementById("overlay").remove();
    }
    if (!this.control.isLocked) {
      this.position.set(32, 40, 32);
      this.control.lock();
    }
    switch (event.code) {
      case "Digit0":
      case "Digit1":
      case "Digit2":
      case "Digit3":
      case "Digit4":
      case "Digit5":
      case "Digit6":
      case "Digit7":
      case "Digit8":
        document
          .getElementById(`toolbar-${this.activeBlockId}`)
          ?.classList.remove("selected");
        document
          .getElementById(`toolbar-${event.key}`)
          ?.classList.add("selected");

        this.activeBlockId = Number(event.key);
        this.tool.visible = this.activeBlockId === 0;
        break;
      case "KeyW":
        this.input.z = this.maxSpeed;
        break;
      case "KeyA":
        this.input.x = -this.maxSpeed;
        break;
      case "KeyS":
        this.input.z = -this.maxSpeed;
        break;
      case "KeyD":
        this.input.x = this.maxSpeed;
        break;
      case "KeyR":
        this.position.set(32, 40, 32);
        this.velocity.set(0, 0, 0);
        break;
      case "KeyK":
        this.world.save();
        break;
      case "KeyL":
        this.world.load();
        this.position.set(32, 40, 32);
        this.velocity.set(0, 0, 0);
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.sprinting = true;
        break;
    }
  }
  onMouseDown(event) {
    if (this.control.isLocked) {
      // Is a block selected?
      if (this.selectedCoords) {
        if (this.activeBlockId === blocks.empty.id) {
          this.world.removeBlock(
            this.selectedCoords.x,
            this.selectedCoords.y,
            this.selectedCoords.z
          );
          this.tool.startAnimation();
        } else {
          this.world.addBlock(
            this.selectedCoords.x,
            this.selectedCoords.y,
            this.selectedCoords.z,
            this.activeBlockId
          );
        }
      }
    }
  }

  toString() {
    let str = "";
    str += `X: ${this.position.x.toFixed(3)} `;
    str += `Y: ${this.position.y.toFixed(3)} `;
    str += `Z: ${this.position.z.toFixed(3)}`;
    return str;
  }
}
