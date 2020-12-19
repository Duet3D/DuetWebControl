'use strict';

import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'

export default class {
  constructor() {
    this.start;
    this.end;
    this.extruding = false;
    this.gcodeLineNumber = 0;
    this.color;
    this.feedRate = 0;
  }

  length() {
    return this.distanceVector(this.start, this.end);
  }

  renderLine(scene) {
    var points = [this.start, this.end];
    let lineMesh = Mesh.CreateLines('lines', points, scene);
    lineMesh.enableEdgesRendering();
    lineMesh.edgesWidth = 10;
    lineMesh.edgesColor = new Color4(1, 1, 0, 1);
  }

  renderLineV2() {
    var tube = MeshBuilder.CreateTube('tube', {
      path: [this.start, this.end],
      radius: 0.2,
      tesselation: 4,
      sideOrientation: Mesh.FRONTSIDE,
      updatable: false,
    });
    tube.doNotSyncBoundingInfo = true;
    return tube;
  }

  distanceVector(v1, v2) {
    let dx = v1.x - v2.x;
    let dy = v1.y - v2.y;
    let dz = v1.z - v2.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  renderLineV3(p, invisible) {
    let length = this.distanceVector(this.start, this.end);
    let rot2 = Math.atan2(this.end.z - this.start.z, this.end.x - this.start.x);
    p.scaling.x = length;
    p.rotation.y = -rot2;

    p.position.x = this.start.x + (length / 2) * Math.cos(rot2);
    p.position.y = this.start.y;
    p.position.z = this.start.z + (length / 2) * Math.sin(rot2);
    p.color = this.color;
    if (invisible) {
      p.materialIndex = 1;
    } else {
      p.materialIndex = 0;
    }

    p.props = {
      gcodeLineNumber: this.gcodeLineNumber,
      originalColor: this.color,
    };
  }

  renderParticle(p) {
    p.position.x = this.start.x;
    p.position.y = this.start.y;
    p.position.z = this.start.z;
    p.color = this.color;
  }

  getPoints() {
    return {
      points: [this.start, this.end],
      colors: [this.color, this.color],
    };
  }

  getColor() {
    if (this.extruding) {
      return new Color4(1, 1, 1, 1);
    }
    return new Color4(1, 0, 0, 1);
  }
}
