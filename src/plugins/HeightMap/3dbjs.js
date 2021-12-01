'use strict';

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Axes } from '@sindarius/gcodeviewer';
import '@babylonjs/core/Culling';

import i18n from '../../i18n';

export default class {
  constructor(canvas) {
    this.gridSize = 25;
    this.canvas = canvas;
    this.engine;
    this.scene;
    this.orbitCamera;
    this.light1;
    this.light2;
    this.ribbonMesh;
    this.ribbonMeshReverse;
    this.bedMesh;
    this.isDelta = false;
    this.axes;

    this.gridMaterial;
    this.ribbonMaterial;
    this.sphereMaterial;

    this.heightPointMeshes = [];
    this.observableControls;

    this.bedRendered;
    this.advancedTexture;

    this.labelCallback = () => {};

    this.minZ = 0;
    this.maxZ = 0;
    this.maxVisualizationZ = 0.25;

    this.colorSet = 'terrain';

    this.updateScene = false;

    this.buildVolume = {
      x: {
        min: 0,
        max: 100
      },
      y: {
        min: 0,
        max: 100
      },
      z: {
        min: 0,
        max: 100
      }
    };

    this.axesLabelMeshes = [];
  }

  init() {
    return new Promise((resolve) => {
      //Init BabylonJS Engine
      this.engine = new Engine(this.canvas, true);

      //Create BJS Scene
      this.scene = new Scene(this.engine);
      this.scene.clearColor = new Color3(0, 0, 0);

      //Setup camera control
      this.orbitCamera = new ArcRotateCamera('Camera', 0, 0, 250, new Vector3(0, 0, 0), this.scene);
      this.orbitCamera.invertRotation = false;
      this.orbitCamera.attachControl(this.canvas, true);
      this.orbitCamera.maxZ = 100000;
      this.orbitCamera.lowerRadiusLimit = 10;

      //Motion Settings
      this.orbitCamera.speed = 500;
      this.orbitCamera.inertia = 0;
      this.orbitCamera.panningInertia = 0;
      this.orbitCamera.inputs.attached.keyboard.angularSpeed = 0.05;
      this.orbitCamera.inputs.attached.keyboard.zoomingSensibility = 0.5;
      this.orbitCamera.inputs.attached.keyboard.panningSensibility = 0.5;
      this.orbitCamera.angularSensibilityX = 200;
      this.orbitCamera.angularSensibilityY = 200;
      this.orbitCamera.panningSensibility = 2;
      this.orbitCamera.wheelPrecision = 0.1;

      this.ribbonMaterial = new StandardMaterial('ribbonMaterial', this.scene);
      this.ribbonMaterial.diffuseColor = new Color3(1, 1, 1);
      this.ribbonMaterial.specularColor = new Color3(0, 0, 0);
      this.ribbonMaterial.emissiveColor = new Color3(1, 1, 1);
      this.ribbonMaterial.ambientColor = new Color3(1, 1, 1);
      this.ribbonMaterial.backFaceCulling = false;

      this.sphereMaterial = new StandardMaterial('sphereMaterial', this.scene);
      this.sphereMaterial.alpha = 0.5;
      this.sphereMaterial.diffuseColor = new Color3(1, 1, 1);
      this.sphereMaterial.specularColor = new Color3(0, 0, 0);
      this.sphereMaterial.emissiveColor = new Color3(1, 1, 1);

      this.highlightMaterial = new StandardMaterial('highlightMaterial', this.scene);
      this.highlightMaterial.alpha = 1;
      this.highlightMaterial.diffuseColor = new Color3(0, 1, 1);
      this.highlightMaterial.specularColor = new Color3(0, 0, 1);
      this.highlightMaterial.emissiveColor = new Color3(0, 1, 1);

      this.light1 = new PointLight('light1', new Vector3(0, 1, -1), this.scene);
      this.light1.diffuse = new Color3(1, 1, 1);
      this.light1.specular = new Color3(1, 1, 1);

      this.buildObservables();

      this.scene.render();
      resolve();
    });
  }

  renderScene() {
    this.light1.position = this.scene.cameras[0].position;
    this.scene.render();
  }

  clearHeightMapData() {
    if (this.ribbonMesh) {
      this.ribbonMesh.dispose(false, false);
    }
    if (this.ribbonMeshReverse) {
      this.ribbonMeshReverse.dispose(false, false);
    }
    this.heightPointMeshes.forEach((p) => p.dispose());
    this.scene.render();
  }

  createHeightPoint(vec, metadata) {
    let sphere = MeshBuilder.CreateSphere('sphere', { diameter: 8, segments: 8 }, this.scene);
    sphere.position = vec;
    sphere.material = this.sphereMaterial;
    sphere.metadata = metadata;
    sphere.isPickable = true;
    sphere.enablePointerMoveEvents = true;
    this.heightPointMeshes.push(sphere);
  }

  renderHeightMap(bedPoints, invertZ, colorScheme = 'terrain', deviationColor = 'fixed') {
    this.clearHeightMapData();

    this.minZ = 999999999;
    this.maxZ = -999999999;

    //Need to prescan for min and max to properly get color range
    for (let y = 0; y < bedPoints.length; y++) {
      for (let x = 0; x < bedPoints[y].length; x++) {
        let z = bedPoints[y][x][2];
        if (z > this.maxZ) {
          this.maxZ = z;
        }
        if (z < this.minZ) {
          this.minZ = z;
        }
      }
    }

    if (deviationColor === 'deviation') {
      this.maxVisualizationZ = Math.abs(this.maxZ) > Math.abs(this.minZ) ? Math.abs(this.maxZ) : Math.abs(this.minZ);
    } else {
      this.maxVisualizationZ = 0.25;
    }

    let points = [];
    let colors = [];
    for (let y = 0; y < bedPoints.length; y++) {
      let xpts = [];
      let color = [];
      for (let x = 0; x < bedPoints[y].length; x++) {
        let zVal = invertZ ? -bedPoints[y][x][2] : bedPoints[y][x][2];
        let pt = new Vector3(bedPoints[y][x][0], zVal * 100, bedPoints[y][x][1]);
        xpts.push(pt);
        color.push(this.getColor(zVal, colorScheme));
        this.createHeightPoint(pt, {
          x: bedPoints[y][x][0],
          y: bedPoints[y][x][1],
          z: bedPoints[y][x][2]
        });
      }
      colors.push(color);
      points.push(xpts);
    }

    this.ribbonMesh = MeshBuilder.CreateRibbon(
      'ribbon',
      {
        pathArray: points,
        colors: [].concat(...colors),
        sideOrientation: Mesh.DoubleSide
      },
      this.scene
    );
    this.ribbonMesh.material = this.ribbonMaterial;
    this.ribbonMesh.isPickable = false;

    for (var idx = 0; idx < points.length; idx++) {
      points[idx] = points[idx].reverse();
      colors[idx] = colors[idx].reverse();
    }

    this.ribbonMeshReverse = MeshBuilder.CreateRibbon(
      'ribbon',
      {
        pathArray: points,
        colors: [].concat(...colors),
        sideOrientation: Mesh.DoubleSide
      },
      this.scene
    );
    this.ribbonMeshReverse.material = this.ribbonMaterial;
    this.ribbonMeshReverse.isPickable = false;
    this.renderScene();
  }

  getColor(z, colorScheme) {
    // Terrain color scheme (i.e. from blue to red, asymmetric)
    if (colorScheme === 'terrain') {
      z = Math.max(Math.min(z, this.maxVisualizationZ), -this.maxVisualizationZ);
      const hue = 240 - ((z + this.maxVisualizationZ) / this.maxVisualizationZ) * 120;
      return new Color3.FromHexString(this.hslToHex(hue, 100, 45));
    }

    // Default color scheme (i.e. the worse the redder, symmetric)
    const hue = 120 - (Math.min(Math.abs(z), this.maxVisualizationZ) / this.maxVisualizationZ) * 120;
    return new Color3.FromHexString(this.hslToHex(hue, 100, 45));
  }

  hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0'); // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  resetCamera() {
    var bedCenter = this.getCenter();
    var bedSize = this.getSize();
    if (this.isDelta) {
      this.scene.activeCamera.radius = bedCenter.x;
      this.scene.activeCamera.setTarget(new Vector3(bedCenter.x, -2, bedCenter.y));
      this.scene.activeCamera.setPosition(new Vector3(bedCenter.x, this.buildVolume.z.max, this.buildVolume.y.min - bedSize.y / 2));
    } else {
      this.scene.activeCamera.radius = 250;
      this.scene.activeCamera.setTarget(new Vector3(bedCenter.x, -2, bedCenter.y));
      this.scene.activeCamera.setPosition(new Vector3(bedCenter.x, this.buildVolume.z.max, this.buildVolume.y.min - bedSize.y / 2));
    }
    this.renderScene();
  }

  topView() {
    let center = this.getCenter();
    let bedSize = this.getSize();
    this.scene.activeCamera.setPosition(new Vector3(center.x, bedSize.y * 1.5, center.y));
    this.scene.activeCamera.setTarget(new Vector3(center.x, 0, center.y));
    this.scene.activeCamera.alpha = -Math.PI / 2;
    this.scene.activeCamera.beta = 0;
    this.renderScene();
  }

  renderBed() {
    if (this.gridMaterial) {
      this.gridMaterial.dispose();
    }
    if (this.bedMesh) {
      this.bedMesh.dispose(false, true);
    }

    if (this.axes) {
      this.axes.dispose();
    }

    if (this.advancedTexture) {
      this.advancedTexture.dispose();
    }

    this.axesLabelMeshes.forEach((m) => m.dispose());
    this.axesLabelMeshes = [];

    let bedCenter = this.getCenter();
    let bedSize = this.getSize();

    this.gridMaterial = this.buildGridMaterial();
    this.axes = new Axes(this.scene);

    this.axes.render(new Vector3(this.buildVolume.x.min - 10, 0, this.buildVolume.y.min - 10));

    if (this.isDelta) {
      let radius = Math.abs(this.buildVolume.x.max - this.buildVolume.x.min) / 2;
      this.bedMesh = MeshBuilder.CreateDisc('BuildPlate', { radius: radius, sideOrientation: Mesh.DoubleSide }, this.scene);
      this.bedMesh.rotationQuaternion = new Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI / 2);
      this.bedMesh.material = this.gridMaterial;
    } else {
      let width = bedSize.x;
      let depth = bedSize.y;
      this.bedMesh = MeshBuilder.CreatePlane('BuildPlate', { width: width, height: depth, sideOrientation: Mesh.DoubleSide }, this.scene);
      this.bedMesh.material = this.gridMaterial;
      this.bedMesh.rotationQuaternion = new Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI / 2);
      this.bedMesh.translate(new Vector3(bedCenter.x, 0, bedCenter.y), 1, Space.WORLD);
    }

    this.bedMesh.isPickable = false;

    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this.scene);
    //build axes labels
    this.axesLabelMeshes.forEach((mesh) => mesh.dispose());
    this.axesLabelMeshes = [];
    let xOff = this.buildVolume.x.min % 25;
    for (let x = this.buildVolume.x.min - xOff; x <= this.buildVolume.x.max; x += this.gridSize) {
      let anchor = new Mesh('anchor', this.scene);
      anchor.position = new Vector3(x, 0, this.buildVolume.y.min);
      this.buildAxesLabel(anchor, `${x}`);
    }

    let yOff = this.buildVolume.y.min % 25;

    for (let y = this.buildVolume.y.min - yOff; y <= this.buildVolume.y.max; y += this.gridSize) {
      let anchor = new Mesh('anchor', this.scene);
      anchor.position = new Vector3(this.buildVolume.x.min, 0, y);
      this.axesLabelMeshes.push(anchor);
      this.buildAxesLabel(anchor, `${y}`);
    }
    this.bedRendered = true;
    this.renderScene();
  }

  buildAxesLabel(anchor, text) {
    let block = new TextBlock('textBlock', text);
    block.color = 'Gray';
    this.advancedTexture.addControl(block);
    block.linkWithMesh(anchor);
    this.axesLabelMeshes.push(block);
  }

  getCenter() {
    try {
      return {
        x: (this.buildVolume.x.max + this.buildVolume.x.min) / 2,
        y: (this.buildVolume.y.max + this.buildVolume.y.min) / 2,
        z: (this.buildVolume.z.max + this.buildVolume.z.min) / 2
      };
    } catch {
      return {
        x: 0,
        y: 0,
        z: 0
      };
    }
  }
  getSize() {
    return {
      x: Math.abs(this.buildVolume.x.max - this.buildVolume.x.min),
      y: Math.abs(this.buildVolume.y.max - this.buildVolume.y.min),
      z: Math.abs(this.buildVolume.z.max - this.buildVolume.z.min)
    };
  }

  buildGridMaterial() {
    let gridMaterial = new GridMaterial('bedMaterial', this.scene);
    gridMaterial.mainColor = new Color4(1, 1, 1, 0.2);
    gridMaterial.lineColor = Color3.FromHexString('#FFFFFF');
    gridMaterial.gridRatio = 1;
    gridMaterial.opacity = 0.8;
    gridMaterial.majorUnitFrequency = this.gridSize;
    gridMaterial.minorUnitVisibility = 0.25;
    let bedCenter = this.getCenter();
    gridMaterial.gridOffset = new Vector3(bedCenter.x % 25, bedCenter.y % 25);
    gridMaterial.backFaceCulling = false;
    return gridMaterial;
  }

  resize() {
    this.engine.resize();
    this.renderBed();
    this.renderScene();
  }

  buildObservables() {
    if (this.observableControls) {
      return;
    }

    this.observableControls = this.scene.onPointerObservable.add((pointerInfo) => {
      let pickInfo = pointerInfo.pickInfo;
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERPICK:
        case PointerEventTypes.POINTERMOVE:
          {
            this.handlePointerMove(pickInfo);
          }
          break;
        case PointerEventTypes.POINTERWHEEL:
          {
            this.renderScene();
          }
          break;
      }
    });
  }

  clearObservables() {
    if (this.observableControls) {
      this.scene.onPointerObservable.remove(this.observableControls);
      this.observableControls = null;
    }
  }

  handlePointerMove(pickInfo) {
    this.heightPointMeshes.forEach((mesh) => (mesh.material = this.sphereMaterial));
    if (pickInfo.hit && pickInfo.pickedMesh) {
      pickInfo.pickedMesh.material = this.highlightMaterial;
      if (this.labelCallback) {
        this.labelCallback(pickInfo.pickedMesh.metadata);
      }
    } else {
      if (this.labelCallback) {
        this.labelCallback();
      }
    }
    this.renderScene();
  }

  // Draw scale+legend next to the 3D control
  drawLegend(canvas, colorScheme, invertZ, xLabel, yLabel) {
    // Clear background
    const context = canvas.getContext('2d');
    context.rect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.fill();

    // Put annotations above gradient
    context.font = '14px Roboto,sans-serif';
    context.textAlign = 'center';
    context.fillStyle = 'white';
    context.fillText(i18n.t('plugins.heightmap.scale'), canvas.width / 2, 21);
    context.fillText(`${invertZ ? -this.maxVisualizationZ : this.maxVisualizationZ} mm`, canvas.width / 2, 44);
    context.fillText(i18n.t(invertZ ? 'plugins.heightmap.orLess' : 'plugins.heightmap.orMore'), canvas.width / 2, 60);

    // Make scale gradient
    const showAxes = canvas.height > 180;
    let scaleHeight = showAxes ? canvas.height - 139 : canvas.height - 96;
    if (colorScheme === 'terrain') {
      scaleHeight -= 16;
    }

    const gradient = context.createLinearGradient(0, 66, 0, 66 + scaleHeight);
    if (colorScheme === 'terrain') {
      gradient.addColorStop(0.0, 'hsl(0,100%,45%)');
      gradient.addColorStop(0.25, 'hsl(60,100%,45%)');
      gradient.addColorStop(0.5, 'hsl(120,100%,45%)');
      gradient.addColorStop(0.75, 'hsl(180,100%,45%)');
      gradient.addColorStop(1.0, 'hsl(240,100%,45%)');
    } else {
      gradient.addColorStop(0.0, 'hsl(0,100%,45%)');
      gradient.addColorStop(0.5, 'hsl(60,100%,45%)');
      gradient.addColorStop(1.0, 'hsl(120,100%,45%)');
    }
    context.fillStyle = gradient;
    context.fillRect(canvas.width / 2 - 12, 66, 24, scaleHeight);

    // Put annotation below gradient
    context.fillStyle = 'white';
    if (colorScheme === 'terrain') {
      context.fillText(`${invertZ ? this.maxVisualizationZ : -this.maxVisualizationZ} mm`, canvas.width / 2, scaleHeight + 82);
      context.fillText(i18n.t(invertZ ? 'plugins.heightmap.orMore' : 'plugins.heightmap.orLess'), canvas.width / 2, scaleHeight + 98);
      scaleHeight += 16;
    } else {
      context.fillText('0.00 mm', canvas.width / 2, scaleHeight + 82);
    }

    // Add axes
    if (showAxes) {
      context.fillText(i18n.t('plugins.heightmap.axes'), canvas.width / 2, scaleHeight + 109);
      context.font = 'bold ' + context.font;
      context.fillStyle = 'rgb(255,0,0)';
      context.fillText(xLabel, canvas.width / 3, scaleHeight + 129);
      context.fillStyle = 'rgb(0,255,0)';
      context.fillText(yLabel, canvas.width / 2, scaleHeight + 129);
      context.fillStyle = 'rgb(0,0,255)';
      context.fillText('Z', (2 * canvas.width) / 3, scaleHeight + 129);
    }
  }

  dispose() {
    if (this.axes) {
      this.axes.dispose();
    }

    if (this.scene) {
      this.bedMesh.dispose(false, true);
      this.scene.dispose();
    }

    if (this.engine) {
      this.engine.dispose();
    }
  }
}
