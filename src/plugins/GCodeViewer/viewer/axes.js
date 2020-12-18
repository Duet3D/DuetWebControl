'use strict';
import * as BABYLON from 'babylonjs';

export default class {
  constructor(scene) {
    this.visible = localStorage.getItem('axesVisible');
    if (this.visible === null) {
      this.visible = true;
    } else {
      this.visible = JSON.parse(this.visible);
    }

    this.scene = scene;
    this.registerClipIgnore = () => {};
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
    var dynamicTexture = new BABYLON.DynamicTexture('DynamicTexture', 50, this.scene, true);
    dynamicTexture.hasAlpha = true;
    dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);
    var plane = BABYLON.Mesh.CreatePlane('TextPlane', size, this.scene, true);
    plane.material = new BABYLON.StandardMaterial('TextPlaneMaterial', this.scene);
    plane.material.backFaceCulling = false;
    plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
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

    this.axesMesh = new BABYLON.Mesh('axis');
    this.registerClipIgnore(this.axesMesh);

    var axisX = BABYLON.Mesh.CreateLines('axisX', [BABYLON.Vector3.Zero(), new BABYLON.Vector3(this.size, 0, 0), new BABYLON.Vector3(this.size * 0.95, 0.05 * this.size, 0), new BABYLON.Vector3(this.size, 0, 0), new BABYLON.Vector3(this.size * 0.95, -0.05 * this.size, 0)], this.scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    axisX.parent = this.axesMesh;
    var xChar = this.makeTextPlane('X', 'red', this.size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * this.size, 0.05 * this.size, 0);
    xChar.parent = this.axesMesh;

    var axisY = BABYLON.Mesh.CreateLines('axisY', [BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, this.size, 0), new BABYLON.Vector3(-0.05 * this.size, this.size * 0.95, 0), new BABYLON.Vector3(0, this.size, 0), new BABYLON.Vector3(0.05 * this.size, this.size * 0.95, 0)], this.scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    axisY.parent = this.axesMesh;

    var yChar = this.makeTextPlane('Z', 'green', this.size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * this.size, -0.05 * this.size);
    yChar.parent = this.axesMesh;

    var axisZ = BABYLON.Mesh.CreateLines('axisZ', [BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, this.size), new BABYLON.Vector3(0, -0.05 * this.size, this.size * 0.95), new BABYLON.Vector3(0, 0, this.size), new BABYLON.Vector3(0, 0.05 * this.size, this.size * 0.95)], this.scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    axisZ.parent = this.axesMesh;

    var zChar = this.makeTextPlane('Y', 'blue', this.size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * this.size, 0.9 * this.size);
    zChar.parent = this.axesMesh;

    this.axesMesh.setEnabled(this.visible);
    this.axesMesh.getChildren().forEach((mesh) => this.registerClipIgnore(mesh));
  }
}
