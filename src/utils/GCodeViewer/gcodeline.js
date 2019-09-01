/* eslint-disable no-unused-vars */
"use strict";

import BABYLON from "babylonjs";

class gcodeLine {
  constructor() {
    this.start; //babylon vector3
    this.end; //babylon vector3
    this.extruding = false;
    this.gcodeString;
    this.moveType;
    this.babylonLine;
    this.color;
    this.material;
  }

length (){
  return this.distanceVector(this.start,this.end);
}

 renderLine (scene) {
    var points = [this.start, this.end];
    this.babylonLine = BABYLON.Mesh.CreateLines("lines", points, scene);
  
    this.babylonLine.enableEdgesRendering();
    this.babylonLine.edgesWidth = 10;
    this.babylonLine.edgesColor = new BABYLON.Color4(1, 1, 0, 1);
  }
  
  renderLineV2 (scene) {
    var points = [this.start, this.end];
    
    var tube = BABYLON.MeshBuilder.CreateTube("tube", {
      path: points,
      radius: 0.2,
      tesselation: 4,
      sideOrientation: BABYLON.Mesh.FRONTSIDE,
      updatable: false
    });
    tube.doNotSyncBoundingInfo = true;
    return tube;
  }
  
  distanceVector(v1, v2) {
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;
 
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  renderLineV3(p) {
    var length = this.distanceVector(this.start, this.end);
    var rot2 = Math.atan2(this.end.z - this.start.z, this.end.x - this.start.x);
    p.scaling.x = length;
    p.rotation.y = -rot2;
  
    p.position.x = this.start.x + (length / 2) * Math.cos(rot2);
    p.position.y = this.start.y;
    p.position.z = this.start.z + (length / 2) * Math.sin(rot2);
    p.color = this.color;
  }
  
  getPoints(){
    return {
      points: [this.start, this.end],
      colors: [this.color, this.color]
    };
  }
  
  getColor() {
    if (this.extruding) {
      return new BABYLON.Color4(1, 1, 1, 1);
    }
    return new BABYLON.Color4(1, 0, 0, 1);
  }

}

export default gcodeLine