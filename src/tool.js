import * as THREE from "three";

export class Tool extends THREE.Group {
  animate = false;
  animationStart = 0;
  animationSpeed = 0.025;
  animateAmplitude = 0.5
  animationDuration = 500;

  animations = undefined;
  toolMesh = undefined;

  setMesh(mesh) {
   
    this.clear();
    this.toolMesh = mesh
    this.add(this.toolMesh);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    this.position.set(0.6, -0.3, -0.5);
    this.scale.set(0.5, 0.5, 0.5);
    this.rotation.z = Math.PI / 2;
    this.rotation.y = Math.PI + 0.2;
  }

  get animationTime(){
    return performance.now() - this.animationStart;
  }

  update() {
    if (this.animate && this.toolMesh) {
      const t = this.animationTime;
      const angle = this.animateAmplitude * Math.sin(t * this.animationSpeed);  
      this.toolMesh.rotation.y = angle;
  
      // Optional: Apply scale pulse for visibility test
      const scaleFactor = 1 + 0.2 * Math.sin(t * this.animationSpeed);
      this.toolMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  
      // Force matrix update
      this.toolMesh.updateMatrixWorld(true);
    }
  }
  
  startAnimation(){

    this.animate = true;
    this.animationStart = performance.now()
    clearTimeout(this.animation);
    this.animation = setTimeout(() => {
        this.animate = false;
        this.toolMesh.rotation.y =0
      }, this.animationDuration);
  }
}
