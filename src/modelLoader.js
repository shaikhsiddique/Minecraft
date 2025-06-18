import { GLTFLoader } from "three/examples/jsm/Addons.js";

export class ModelLoader {
    loader = new GLTFLoader();

    models = {
        pickaxe: undefined,
    }

    constructor(onLoad) {
        // Use setTimeout to ensure this runs after the current execution context
        setTimeout(() => {
            this.loader.load('./models/pickaxe.glb', (model) => {
                const mesh = model.scene;
                this.models.pickaxe = mesh;
                onLoad(this.models);
            });
        }, 0);
    }
}