import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { RNG } from "./rng";
import { blocks, resources } from "./blocks";

const geometry = new THREE.BoxGeometry();


export class World extends THREE.Group {
  data = [];
  params = {
    seed : 0,
    terrain: {
      scale: 30,
      magnitude: 0.5,
      offset: 0.2
    }
  };

  constructor(size = { width: 64, height: 32 }) {
    super();
    this.size = size;
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
    this.generateMesh();
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
            instanceId: null
          });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }
  
  generateResource(rng) {
    const simplex = new SimplexNoise(rng);
    resources.forEach((resource)=>{
      for (let x = 0; x < this.size.width; x++) {
        for (let y = 0; y < this.size.height; y++) {
          for (let z = 0; z < this.size.width; z++) {
            const value = simplex.noise3d(
              x / resource.scale.x,
              y / resource.scale.y,
              z / resource.scale.z
            );
            if (value > resource.scarcity) {
              this.setBlockId(x, y, z, resource.id);
            }
          }
        }
      }
    })
    
  }
  

  generateTerrain(rng) {
    const simplex = new SimplexNoise(rng);
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const values = simplex.noise(
          x / this.params.terrain.scale,
          z / this.params.terrain.scale
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
          }
          else if ( y > height){
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
      .filter(blockType => blockType.id !== blocks.empty.id)
      .forEach((block) => {
        const mesh = new THREE.InstancedMesh(geometry, block.material, maxCount);
        mesh.name = block.name;
        mesh.count = 0;
        mesh.castShadow = true,
        mesh.receiveShadow = true,
        meshes[block.id] = mesh; // <-- Corrected this line
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
            matrix.setPosition(x , y , z );
            mesh.setMatrixAt(instanceId, matrix);
            this.setBlockInstanceId(x, y, z, instanceId);
            mesh.count++;
          }
        }
      }
    }
  
    this.add(...Object.values(meshes));
  }
  

  isBlockObscured(x, y, z) {
    const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
    const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
    const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
    const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
    const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
    const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;


    if (up === blocks.empty.id ||
      down === blocks.empty.id ||
      left === blocks.empty.id ||
      right === blocks.empty.id ||
      forward === blocks.empty.id ||
      back === blocks.empty.id) {
      return false;
    } else {
      return true;
    }
  }
}
