'use strict';

import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'


export default class {
  constructor(scene) {
    this.visible = localStorage.getItem('axesVisible');
    if (this.visible === null) {
      this.visible = true;
    } else {
      this.visible = JSON.parse(this.visible);
    }

    this.scene = scene;
    this.registerClipIgnore = () => { };
    this.axesMesh;
    this.size = 50;
    this.debug = false;
  }

  show(visible) {
    localStorage.setItem('axesVisible', visible);
    if (this.axesMesh) {
      this.axesMesh.setEnabled(visible);
    }
  }

  makeTextPlane(text, color, size) {
    var dynamicTexture = new DynamicTexture('DynamicTexture', 50, this.scene, true);
    dynamicTexture.hasAlpha = true;
    dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);
    var plane = Mesh.CreatePlane('TextPlane', size, this.scene, true);
    plane.material = new StandardMaterial('TextPlaneMaterial', this.scene);
    plane.material.backFaceCulling = false;
    plane.material.specularColor = new Color3(0, 0, 0);
    plane.material.diffuseTexture = dynamicTexture;
    return plane;
  }

  resize(size) {
    this.size = size;
    this.axesMesh.dispose(false, true);
    this.render();
  }

  render() {
    if (this.debug) return;
    if (this.axesMesh && !this.axesMesh.isDisposed()) {
      return;
    }

    this.axesMesh = new Mesh('axis');
    this.registerClipIgnore(this.axesMesh);

    var axisX = Mesh.CreateLines('axisX', [Vector3.Zero(), new Vector3(this.size, 0, 0), new Vector3(this.size * 0.95, 0.05 * this.size, 0), new Vector3(this.size, 0, 0), new Vector3(this.size * 0.95, -0.05 * this.size, 0)], this.scene);
    axisX.color = new Color3(1, 0, 0);
    axisX.parent = this.axesMesh;
    var xChar = this.makeTextPlane('X', 'red', this.size / 10);
    xChar.position = new Vector3(0.9 * this.size, 0.05 * this.size, 0);
    xChar.parent = this.axesMesh;

    var axisY = Mesh.CreateLines('axisZ', [Vector3.Zero(), new Vector3(0, 0, this.size), new Vector3(0, -0.05 * this.size, this.size * 0.95), new Vector3(0, 0, this.size), new Vector3(0, 0.05 * this.size, this.size * 0.95)], this.scene);
    axisY.color = new Color3(0, 1, 0);
    axisY.parent = this.axesMesh;
    var yChar = this.makeTextPlane('Y', 'green', this.size / 10);
    yChar.position = new Vector3(0, 0.05 * this.size, 0.9 * this.size);
    yChar.parent = this.axesMesh;

    var axisZ = Mesh.CreateLines('axisY', [Vector3.Zero(), new Vector3(0, this.size, 0), new Vector3(-0.05 * this.size, this.size * 0.95, 0), new Vector3(0, this.size, 0), new Vector3(0.05 * this.size, this.size * 0.95, 0)], this.scene);    axisZ.color = new Color3(0, 0, 1);
    axisZ.parent = this.axesMesh;
    var zChar = this.makeTextPlane('Z', 'blue', this.size / 10);
    zChar.position = new Vector3(0, 0.9 * this.size, -0.05 * this.size);
    zChar.parent = this.axesMesh;


    this.axesMesh.setEnabled(this.visible);
    this.axesMesh.getChildren().forEach((mesh) => this.registerClipIgnore(mesh));
  }
}
