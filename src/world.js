import * as THREE from "three";
import { WorldChunks } from "./worldChunks";
import { DataStore } from "./dataStore";
export class World extends THREE.Group {
  
  asyncLoading = true;
  
  params = {
    seed: 0,
    terrain: {
      scale: 100,
      magnitude: 8,
      offset: 6,
      waterOffset: 4
    },
    biomes: {
      scale: 500,
      variation: {
        amplitude: 0.2,
        scale: 50
      },
      tundraToTemperate: 0.25,
      temperateToJungle: 0.5,
      jungleToDesert: 0.75
    },
    trees: {
      trunk: {
        minHeight: 4,
        maxHeight: 7
      },
      canopy: {
        minRadius: 3,
        maxRadius: 3,
        density: 0.7 // Vary between 0.0 and 1.0
      },
      frequency: 0.005
    },
    clouds: {
      scale: 30,
      density: 0.3
    }
  };

  chunkSize = { width: 64, height: 42 };
  drawDistance = 1;
  dataStore = new DataStore()
  constructor(seed = 0) {
    super();
    this.seed = seed;

    document.addEventListener('keydown', (ev) => {
      switch (ev.code) {
        case 'KeyK': 
          this.save();
          break;
        case 'KeyL': 
          this.load();
          break;
        
      }
    });
    
  }

  save() {
    localStorage.setItem('minecraft_params', JSON.stringify(this.params));
    localStorage.setItem('minecraft_data', JSON.stringify(this.dataStore.data));
    document.getElementById('status').innerHTML = 'GAME SAVED';
    setTimeout(() => document.getElementById('status').innerHTML = '', 3000);
  }

   async load() {
    this.params = JSON.parse(localStorage.getItem('minecraft_params'));
    this.dataStore.data = JSON.parse(localStorage.getItem('minecraft_data'));
  
    await this.generate(); // Regenerate the world first
  
    
    setTimeout(() => {
      this.player.position.set(32, 16, 32);
      this.player.velocity.set(0, 0, 0);
    }, 2000);
  
    document.getElementById('status').innerHTML = 'GAME LOADED';
    setTimeout(() => document.getElementById('status').innerHTML = '', 3000);
  }
  

  generate(clearCache = true) {
    if (clearCache) {
      this.dataStore.clear();
    }

    this.disposeChunks();

    for (let x = -this.drawDistance; x <= this.drawDistance; x++) {
      for (let z = -this.drawDistance; z <= this.drawDistance; z++) {
        this.generateChunk(x, z);
      }
    }
  }
  update(player){
    const visibleChunks = this.getVisibleChunks(player);
    const chunksToAdd = this.getChunksToAdd(visibleChunks);
    this.removeUnusedChunks(visibleChunks);

    for (const chunk of chunksToAdd) {
      this.generateChunk(chunk.x, chunk.z);
    }
    
  }

  getVisibleChunks(player) {
    const visibleChunks = [];

    const coords = this.worldToChunkCoords(
      player.position.x,
      player.position.y,
      player.position.z
    );

    const chunkX = coords.chunk.x;
    const chunkZ = coords.chunk.z;

    for (let x = chunkX - this.drawDistance; x <= chunkX + this.drawDistance; x++) {
      for (let z = chunkZ - this.drawDistance; z <= chunkZ + this.drawDistance; z++) {
        visibleChunks.push({ x, z });
      }
    }

    return visibleChunks;
  }

  getChunksToAdd(visibleChunks) {
    // Filter down the visible chunks to those not already in the world
    return visibleChunks.filter((chunk) => {
      const chunkExists = this.children
        .map((obj) => obj.userData)
        .find(({ x, z }) => (
          chunk.x === x && chunk.z === z
        ));

      return !chunkExists;
    })
  }
  removeUnusedChunks(visibleChunks) {
    // Filter down the visible chunks to those not already in the world
    const chunksToRemove = this.children.filter((chunk) => {
      const { x, z } = chunk.userData;
      const chunkExists = visibleChunks
        .find((visibleChunk) => (
          visibleChunk.x === x && visibleChunk.z === z
        ));

      return !chunkExists;
    });

    for (const chunk of chunksToRemove) {
      chunk.disposeInstances();
      this.remove(chunk);
      console.log(`Removing chunk at X: ${chunk.userData.x} Z: ${chunk.userData.z}`);
    }
  }
  generateChunk(x, z) {
    const chunk = new WorldChunks(this.chunkSize, this.params, this.dataStore);
    chunk.position.set(
      x * this.chunkSize.width,
      0,
      z * this.chunkSize.width);
    chunk.userData = { x, z };

    if (this.asyncLoading) {
      requestIdleCallback(chunk.generate.bind(chunk), { timeout: 1500 });
    } else {
      chunk.generate();
    }

    this.add(chunk);
    console.log(`Adding chunk at X: ${x} Z: ${z}`);
  }
  
  getBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk && chunk.loaded) {
      return chunk.getBlock(
        coords.block.x,
        coords.block.y,
        coords.block.z
      );
    } else {
      return null;
    }
  }
  worldToChunkCoords(x, y, z) {
    const chunkCoords = {
      x: Math.floor(x / this.chunkSize.width),
      z: Math.floor(z / this.chunkSize.width)
    };

    const blockCoords = {
      x: x - this.chunkSize.width * chunkCoords.x,
      y,
      z: z - this.chunkSize.width * chunkCoords.z
    };
    return {
      chunk: chunkCoords,
      block: blockCoords
    }
  }
  getChunk(chunkX, chunkZ) {
    return this.children.find((chunk) => (
      chunk.userData.x === chunkX &&
      chunk.userData.z === chunkZ
    ));
  }

  disposeChunks() {
    this.traverse((chunk) => {
      if (chunk.disposeInstances) {
        chunk.disposeInstances();
      }
    });
    this.clear();
  }


  addBlock(x, y, z, blockId) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlock(
        coords.block.x,
        coords.block.y,
        coords.block.z,
        blockId
      );

      // Hide neighboring blocks if they are completely obscured
      this.hideBlock(x - 1, y, z);
      this.hideBlock(x + 1, y, z);
      this.hideBlock(x, y - 1, z);
      this.hideBlock(x, y + 1, z);
      this.hideBlock(x, y, z - 1);
      this.hideBlock(x, y, z + 1);
    }
  }

  removeBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (coords.block.y === 0) return;

    if (chunk) {
      chunk.removeBlock(
        coords.block.x,
        coords.block.y,
        coords.block.z
      );
      this.revealBlock(x - 1, y, z);
      this.revealBlock(x + 1, y, z);
      this.revealBlock(x, y - 1, z);
      this.revealBlock(x, y + 1, z);
      this.revealBlock(x, y, z - 1);
      this.revealBlock(x, y, z + 1);

      
    }
  }
  revealBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlockInstance(
        coords.block.x,
        coords.block.y,
        coords.block.z
      )
    }
  }
  hideBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk && chunk.isBlockObscured(coords.block.x, coords.block.y, coords.block.z)) {
      chunk.deleteBlockInstance(
        coords.block.x,
        coords.block.y,
        coords.block.z
      )
    }
  }
}
