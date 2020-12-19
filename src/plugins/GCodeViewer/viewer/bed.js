'use strict';

import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector'
import { Space } from '@babylonjs/core/Maths/math.axis'
import {StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer'
import { MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'

import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';

export const RenderBedMode = {
  bed: 0,
  box: 1,
};

export default class {
  constructor(scene) {
    this.buildVolume = {
      x: {
        min: 0,
        max: 100,
      },
      y: {
        min: 0,
        max: 100,
      },
      z: {
        min: 0,
        max: 100,
      },
    };

    var buildVol = localStorage.getItem('buildVolume');
    if (buildVol !== null) {
      this.buildVolume = JSON.parse(buildVol);
    }

    this.renderMode = Number.parseInt(localStorage.getItem('renderBedMode')); //0 plane 1 cube extents
    if (!this.renderMode) {
      this.renderMode = RenderBedMode.bed;
    }

    this.bedMesh;
    this.isDelta = false;
    this.scene = scene;
    this.registerClipIgnore = () => {};
    this.bedLineColor = '#0000FF';

    /*
    this.planeMaterial = new StandardMaterial('planeMaterial', this.scene);
    this.planeMaterial.alpha = 1;
    this.planeMaterial.diffuseColor = new Color3(0.25, 0.25, 0.25);
    this.planeMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    */

    if (!this.getBedColor()) {
      this.setBedColor('#0000FF');
    }

    this.planeMaterial = this.buildGridMaterial();
    this.boxMaterial = new StandardMaterial('bedBoxMaterial', this.scene);
    this.boxMaterial.alpha = 0;
    this.debug = false;
  }

  setRenderMode(renderBedMode) {
    this.renderMode = renderBedMode;
    localStorage.setItem('renderBedMode', this.renderMode);
    if (this.bedMesh) {
      this.scene.removeMesh(this.bedMesh);
      this.bedMesh.dispose(false, true);
    }
    this.buildBed();
  }
  buildBed() {
    if (this.debug) return;
    if (this.bedMesh && this.bedMesh.isDisposed()) {
      this.bedMesh = null;
    }
    if (this.bedMesh) return this.bedMesh;

    switch (this.renderMode) {
      case RenderBedMode.bed:
        this.buildFlatBed();
        break;
      case RenderBedMode.box:
        this.buildBox();
        break;
    }
    return this.bedMesh;
  }
  setDelta(isDelta) {
    this.isDelta = isDelta;
    this.setRenderMode(this.renderMode);
  }
  buildFlatBed() {
    let bedCenter = this.getCenter();
    let bedSize = this.getSize();
    if (this.isDelta) {
      let radius = Math.abs(this.buildVolume.x.max - this.buildVolume.x.min) / 2;
      this.bedMesh = MeshBuilder.CreateDisc('BuildPlate', { radius: radius }, this.scene);
      this.bedMesh.rotationQuaternion = new Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI / 2);
      this.bedMesh.material = this.planeMaterial;
    } else {
      let width = bedSize.x;
      let depth = bedSize.y;
      this.bedMesh = MeshBuilder.CreatePlane('BuildPlate', { width: width, height: depth }, this.scene);
      this.bedMesh.material = this.planeMaterial;
      this.bedMesh.rotationQuaternion = new Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI / 2);
      this.bedMesh.translate(new Vector3(bedCenter.x, 0, bedCenter.y), 1, Space.WORLD);
    }
    this.registerClipIgnore(this.bedMesh);
  }
  getCenter() {
    return {
      x: (this.buildVolume.x.max + this.buildVolume.x.min) / 2,
      y: (this.buildVolume.y.max + this.buildVolume.y.min) / 2,
      z: (this.buildVolume.z.max + this.buildVolume.z.min) / 2,
    };
  }
  getSize() {
    return {
      x: Math.abs(this.buildVolume.x.max - this.buildVolume.x.min),
      y: Math.abs(this.buildVolume.y.max - this.buildVolume.y.min),
      z: Math.abs(this.buildVolume.z.max - this.buildVolume.z.min),
    };
  }
  buildBox() {
    let bedSize = this.getSize();
    let bedCenter = this.getCenter();
    if (this.isDelta) {
      this.bedMesh = MeshBuilder.CreateCylinder(
        'bed',
        {
          diameterTop: bedSize.x,
          diameterBottom: bedSize.x,
          height: bedSize.z,
        },
        this.scene
      );
      this.bedMesh.position.x = bedCenter.x;
      this.bedMesh.position.y = bedCenter.z;
      this.bedMesh.position.z = bedCenter.x;
      this.bedMesh.alpha = 0;
      this.bedMesh.diffuseColor = new Color4(0, 0, 0, 0);
      this.bedMesh.isPickable = false;
      this.bedMesh.enableEdgesRendering(undefined, true);

      this.bedMesh.renderingGroupId = 2;
      this.scene.setRenderingAutoClearDepthStencil(2, false, false, false);

      var hl = new HighlightLayer('hl', this.scene, { isStroke: true, blurTextureSizeRatio: 3 });
      hl.addMesh(this.bedMesh,this.getBedColor4());

      this.bedMesh.onBeforeRenderObservable.add(() => {
        this.scene.getEngine().setColorWrite(false);
      });

      this.bedMesh.onAfterRenderObservable.add(() => {
        this.scene.getEngine().setColorWrite(true);
      });

      this.registerClipIgnore(this.bedMesh);
    } else {
      this.bedMesh = MeshBuilder.CreateBox(
        'bed',
        {
          width: bedSize.x,
          depth: bedSize.y,
          height: bedSize.z,
        },
        this.scene
      );
      let center = this.getCenter();
      this.bedMesh.position.x = center.x - this.buildVolume.x.min;
      this.bedMesh.position.y = center.z - this.buildVolume.z.min;
      this.bedMesh.position.z = center.y - this.buildVolume.y.min;
      this.bedMesh.diffuseColor = new Color4(0, 0, 0, 0);
      this.bedMesh.enableEdgesRendering();
      this.bedMesh.edgesWidth = 100;
      this.bedMesh.material = this.boxMaterial;
      this.bedMesh.isPickable = false;
      this.bedMesh.edgesColor = this.getBedColor4();
     
      this.registerClipIgnore(this.bedMesh);
    }
  }
  setVisibility(visibility) {
    if (this.bedMesh) {
      this.bedMesh.setEnabled(visibility);
    }
  }
  commitBedSize() {
    localStorage.setItem('buildVolume', JSON.stringify(this.buildVolume));
    this.setRenderMode(this.renderMode);
  }
  buildGridMaterial() {
    let gridMaterial = new GridMaterial('bedMaterial', this.scene);
    gridMaterial.mainColor = new Color4(0, 0, 0, 0);
    gridMaterial.lineColor = Color3.FromHexString(this.getBedColor());
    gridMaterial.gridRatio = 5;
    gridMaterial.opacity = 0.8;
    gridMaterial.majorUnitFrequency = 10;
    gridMaterial.minorUnitVisibility = 0.6;
    gridMaterial.gridOffset = new Vector3(0, 0, 0);
    return gridMaterial;
  }
  getBedColor() {
    return localStorage.getItem('bedLineColor');
  }
  setBedColor(color) {
    localStorage.setItem('bedLineColor', color);
    if (this.planeMaterial) {
      this.planeMaterial = this.buildGridMaterial();
      this.dispose();
      this.buildBed();
    }
  }
  getBedColor4(){
   return Color4.FromHexString(this.getBedColor().padEnd(9,'F'));
  }
  dispose() {
    this.bedMesh.dispose(false, true);
  }
}
