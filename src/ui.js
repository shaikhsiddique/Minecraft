import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { blocks, resources } from "./blocks";

export const createUI = (world) => {
  const gui = new GUI();
  const widthController = gui.add(world.size, "width", 8, 128, 1).name("Width");
  const heightController = gui
    .add(world.size, "height", 8, 128, 1)
    .name("Height");

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.add(world.params, 'seed', 0, 10000, 1).name('Seed');
  terrainFolder.add(world.params.terrain, "scale", 10, 100).name("Scale");
  terrainFolder.add(world.params.terrain, "magnitude", 0, 1).name("Magnitude");
  terrainFolder.add(world.params.terrain, "offset", 0, 32, 1).name("Offset");

  
  for (const resource of resources) {
    const resourceFolder = gui.addFolder(resource.name);
    resourceFolder.add(resource, 'scarcity', 0, 1).name('Scarcity');
    resourceFolder.add(resource.scale, 'x', 10, 100).name('Scale X');
    resourceFolder.add(resource.scale, 'y', 10, 100).name('Scale Y');
    resourceFolder.add(resource.scale, 'z', 10, 100).name('Scale Z');
  }

 gui.onChange(()=>{
    world.generate()
 })
};
