import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "./rng";
import { blocks, resources } from "./blocks";

const geometry = new THREE.BoxGeometry();

export class WorldChunks extends THREE.Group {
  data = [];

  constructor(size, params, dataStore) {
    super();
    this.loaded = false;
    this.size = size;
    this.params = params;
    this.dataStore = dataStore;
  }

  getBlock(x, y, z) {
    if (this.inBounds(x, y, z)) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].id = id;
    }
  }

  setBlockInstanceId(x, y, z, instanceId) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  inBounds(x, y, z) {
    return (
      x >= 0 &&
      x < this.size.width &&
      y >= 0 &&
      y < this.size.height &&
      z >= 0 &&
      z < this.size.width
    );
  }

  generate() {
    const rng = new RNG(this.params.seed);
    this.initializeTerrain(rng);
    this.generateResource(rng);
    this.generateTerrain(rng);
    this.generateTrees(rng);
    this.generateClouds(rng);
    this.loadPlayerChanges();
    this.generateMesh();
    this.loaded = true;
  }

  loadPlayerChanges() {
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          if (
            this.dataStore.contains(this.position.x, this.position.z, x, y, z)
          ) {
            const blockId = this.dataStore.get(
              this.position.x,
              this.position.z,
              x,
              y,
              z
            );
            this.setBlockId(x, y, z, blockId);
          }
        }
      }
    }
  }

  initializeTerrain() {
    this.data = [];
    for (let x = 0; x < this.size.width; x++) {
      const slice = [];
      for (let y = 0; y < this.size.height; y++) {
        const row = [];
        for (let z = 0; z < this.size.width; z++) {
          row.push({
            id: blocks.empty.id,
            instanceId: null,
          });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  generateResource(rng) {
    const simplex = new SimplexNoise(rng);
    resources.forEach((resource) => {
      for (let x = 0; x < this.size.width; x++) {
        for (let y = 0; y < this.size.height; y++) {
          for (let z = 0; z < this.size.width; z++) {
            const value = simplex.noise3d(
              (this.position.x + x) / resource.scale.x,
              (this.position.y + y) / resource.scale.y,
              (this.position.z + z) / resource.scale.z
            );
            if (value > resource.scarcity) {
              this.setBlockId(x, y, z, resource.id);
            }
          }
        }
      }
    });
  }

  generateTerrain(rng) {
    const simplex = new SimplexNoise(rng);
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const values = simplex.noise(
          (this.position.x + x) / this.params.terrain.scale,
          (this.position.z + z) / this.params.terrain.scale
        );

        const scaledNoise =
          this.params.terrain.offset + this.params.terrain.magnitude * values;

        let height = Math.floor(scaledNoise * this.size.height);
        height = Math.max(0, Math.min(height, this.size.height - 1));

        for (let y = 0; y <= this.size.height; y++) {
          const currentBlock = this.getBlock(x, y, z);
          if (!currentBlock) continue;

          if (y < height && currentBlock.id === blocks.empty.id) {
            this.setBlockId(x, y, z, blocks.dirt.id);
          } else if (y === height && currentBlock.id === blocks.empty.id) {
            this.setBlockId(x, y, z, blocks.grass.id);
          } else if (y > height) {
            this.setBlockId(x, y, z, blocks.empty.id);
          }
          // Else leave existing block (like stone) untouched
        }
      }
    }
  }

  generateMesh() {
    this.clear();

    const maxCount = this.size.width * this.size.width * this.size.height;
    const meshes = {};

    Object.values(blocks)
      .filter((blockType) => blockType.id !== blocks.empty.id)
      .forEach((block) => {
        const mesh = new THREE.InstancedMesh(
          geometry,
          block.material,
          maxCount
        );
        mesh.name = block.name;
        mesh.count = 0;
        (mesh.castShadow = true),
          (mesh.receiveShadow = true),
          (meshes[block.id] = mesh); // <-- Corrected this line
      });

    const matrix = new THREE.Matrix4();

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const block = this.getBlock(x, y, z);
          if (!block || block.id === blocks.empty.id) continue;

          const mesh = meshes[block.id];
          if (!mesh) continue; // Safety check

          if (!this.isBlockObscured(x, y, z)) {
            const instanceId = mesh.count;
            matrix.setPosition(x, y, z);
            mesh.setMatrixAt(instanceId, matrix);
            this.setBlockInstanceId(x, y, z, instanceId);
            mesh.count++;
          }
        }
      }
    }

    this.add(...Object.values(meshes));
  }

  generateTrees(rng) {
    const generateTreeTrunk = (x, z, rng)=> {
      const minH = this.params.trees.trunk.minHeight;
      const maxH = this.params.trees.trunk.maxHeight;
      const h = Math.round(minH + (maxH - minH) * rng.random());

      for(let y =0 ; y < this.size.height;y++){
        const block = this.getBlock(x,y,z);
        if(block.id === blocks.grass.id){
          for(let treeY = y+1;treeY < y+h;treeY++){
            this.setBlockId(x,treeY,z,blocks.tree.id)
            generateTreeCanopy(x,y+h,z,rng)
          }
        }
      }
    }
    const generateTreeCanopy = ( centerX, centerY, centerZ, rng)=> {
      const minR = this.params.trees.canopy.minRadius;
      const maxR = this.params.trees.canopy.maxRadius;
      const r = Math.round(minR + (maxR - minR) * rng.random());
      for (let x = -r; x <= r; x++) {
        for (let y = -r; y <= r; y++) {
          for (let z = -r; z <= r; z++) {
            const n = rng.random();
            if (x * x + y * y + z * z > r * r) continue;
            const block = this.getBlock(centerX + x, centerY + y, centerZ + z);
            if(block && block.id !== blocks.empty.id) continue;

            if (n < this.params.trees.canopy.density) {
              this.setBlockId(centerX + x, centerY + y, centerZ + z, blocks.leaves.id)
            }
          }
        }
      }

    }
    let offset = this.params.trees.canopy.maxRadius;
    for (let x = offset; x < this.size.width - offset; x++) {
      for (let z = offset; z < this.size.width - offset; z++) {
        if (rng.random() < this.params.trees.frequency) {
          generateTreeTrunk(x, z, rng);
        }
      }
    }
  }

  generateClouds(rng) {
    const simplex = new SimplexNoise(rng);
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const value = (simplex.noise(
          (this.position.x + x) / this.params.clouds.scale,
          (this.position.z + z) / this.params.clouds.scale
        ) + 1) * 0.5;

        if (value < this.params.clouds.density) {
          this.setBlockId(x, this.size.height - 1, z, blocks.cloud.id);
        }
      }
    }
  }

  isBlockObscured(x, y, z) {
    const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
    const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
    const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
    const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
    const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
    const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

    if (
      up === blocks.empty.id ||
      down === blocks.empty.id ||
      left === blocks.empty.id ||
      right === blocks.empty.id ||
      forward === blocks.empty.id ||
      back === blocks.empty.id
    ) {
      return false;
    } else {
      return true;
    }
  }
  addBlock(x, y, z, blockId) {
    if (this.getBlock(x, y, z).id === blocks.empty.id) {
      this.setBlockId(x, y, z, blockId);
      this.addBlockInstance(x, y, z);
      this.dataStore.set(this.position.x, this.position.z, x, y, z, blockId);
    }
  }
  removeBlock(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (block && block.id !== blocks.empty.id) {
      this.deleteBlockInstance(x, y, z);
      this.setBlockId(x, y, z, blocks.empty.id);
      this.dataStore.set(
        this.position.x,
        this.position.z,
        x,
        y,
        z,
        blocks.empty.id
      );
    }
  }
  deleteBlockInstance(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (block.id === blocks.empty.id || block.instanceId === null) return;

    const blockType = Object.values(blocks).find((b) => b.id === block.id);
    if (!blockType) return;

    const mesh = this.children.find(
      (instanceMesh) => instanceMesh.name === blockType.name
    );
    if (!mesh) return;

    const instanceId = block.instanceId;

    const lastMatrix = new THREE.Matrix4();
    mesh.getMatrixAt(mesh.count - 1, lastMatrix);

    const v = new THREE.Vector3();
    v.setFromMatrixPosition(lastMatrix); // safer than applyMatrix4
    this.setBlockInstanceId(v.x, v.y, v.z, instanceId);

    mesh.setMatrixAt(instanceId, lastMatrix);
    mesh.count--;

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();

    this.setBlockInstanceId(x, y, z, null);
  }

  addBlockInstance(x, y, z) {
    const block = this.getBlock(x, y, z);

    if (block && block.id !== blocks.empty.id && block.instanceId === null) {
      const blockType = Object.values(blocks).find((b) => b.id === block.id);
      if (!blockType) return;

      const mesh = this.children.find(
        (instanceMesh) => instanceMesh.name === blockType.name
      );
      if (!mesh) return;

      const instanceId = mesh.count++;
      this.setBlockInstanceId(x, y, z, instanceId);

      const matrix = new THREE.Matrix4();
      matrix.setPosition(x, y, z);
      mesh.setMatrixAt(instanceId, matrix);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  disposeInstances() {
    this.traverse((obj) => {
      if (obj.dispose) obj.dispose();
    });
    this.clear();
  }
}
