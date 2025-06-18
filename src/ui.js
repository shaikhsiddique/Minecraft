import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { blocks, resources } from "./blocks";

export const createUI = (world, player, physics, scene) => {
  const gui = new GUI();

  // ========== World Settings ==========
  const worldFolder = gui.addFolder("World");
  worldFolder.add(world, "drawDistance", 0, 5, 1).name("Draw Distance");
  worldFolder.add(world, "asyncLoading").name("Async Loading");
  worldFolder.add(scene.fog, "near", 1, 200, 1).name("Fog Near");
  worldFolder.add(scene.fog, "far", 1, 200, 1).name("Fog Far");

  // ----- Terrain Settings -----
  const terrainFolder = worldFolder.addFolder("Terrain").close();
  terrainFolder.add(world.params, "seed", 0, 10000, 1).name("Seed");
  terrainFolder.add(world.params.terrain, "scale", 10, 100).name("Scale");
  terrainFolder.add(world.params.terrain, "magnitude", 0, 1).name("Magnitude");
  terrainFolder.add(world.params.terrain, "offset", 0, 32, 1).name("Offset");
  terrainFolder
    .add(world.params.terrain, "waterOffset", 0, 32, 1)
    .name("Water Offset");

  // ----- Trees Settings -----
  const treesFolder = terrainFolder.addFolder("Trees").close();
  treesFolder
    .add(world.params.trees, "frequency", 0, 0.1)
    .name("Frequency");
  treesFolder
    .add(world.params.trees.trunk, "minHeight", 0, 10, 1)
    .name("Min Trunk Height");
  treesFolder
    .add(world.params.trees.trunk, "maxHeight", 0, 10, 1)
    .name("Max Trunk Height");
  treesFolder
    .add(world.params.trees.canopy, "minRadius", 0, 10, 1)
    .name("Min Canopy Size");
  treesFolder
    .add(world.params.trees.canopy, "maxRadius", 0, 10, 1)
    .name("Max Canopy Size");
  treesFolder
    .add(world.params.trees.canopy, "density", 0, 1)
    .name("Canopy Density");

  // ----- Clouds Settings -----
  const cloudsFolder = worldFolder.addFolder("Clouds").close();
  cloudsFolder
    .add(world.params.clouds, "density", 0, 1)
    .name("Density");
  cloudsFolder
    .add(world.params.clouds, "scale", 1, 100, 1)
    .name("Scale");

  // ========== Player Settings ==========
  const playerFolder = gui.addFolder("Player");
  playerFolder
    .add(player, "maxSpeed", 1, 20, 0.1)
    .name("Max Speed");
  playerFolder
    .add(player.cameraHelper, "visible")
    .name("Show Camera Helper");

  // ========== Resource Settings ==========
  for (const resource of resources) {
    const resourceFolder = gui.addFolder(resource.name);
    resourceFolder
      .add(resource, "scarcity", 0, 1)
      .name("Scarcity");
    resourceFolder
      .add(resource.scale, "x", 10, 100)
      .name("Scale X");
    resourceFolder
      .add(resource.scale, "y", 10, 100)
      .name("Scale Y");
    resourceFolder
      .add(resource.scale, "z", 10, 100)
      .name("Scale Z");
  }

  // ========== Regenerate World on Change ==========
  gui.onChange(() => {
    world.generate();
  });
};
