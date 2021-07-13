'use strict';

import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from "@babylonjs/core/scene"
import { Plane } from '@babylonjs/core/Maths/math.plane'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Space } from '@babylonjs/core/Maths/math.axis'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode} from '@babylonjs/core/Meshes/transformNode'
import '@babylonjs/core/Rendering/edgesRenderer'
import { ArcRotateCamera }  from '@babylonjs/core/Cameras/arcRotateCamera'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { Axis } from '@babylonjs/core/Maths/math.axis'


//import '@babylonjs/core/Debug/debugLayer'
//import '@babylonjs/inspector'

import gcodeProcessor from './gcodeprocessor.js';
import Bed from './bed.js';
import BuildObjects from './buildobjects.js';
import Axes from './axes.js';


export default class {
  constructor(canvas) {
    this.lastLoadKey = 'lastLoadFailed';
    this.fileData;
    this.gcodeProcessor = new gcodeProcessor();
    this.maxHeight = 0;
    this.minHeight = 0;
    this.sceneBackgroundColor = '#000000';
    this.canvas = canvas;
    this.scene = {};
    this.loading = false;
    this.toolVisible = false;
    this.toolCursor;
    this.toolCursorMesh;
    this.toolCursorVisible = true;
    this.travelVisible = false;
    this.debug = false;
    this.zTopClipValue;
    this.zBottomClipValue;
    this.cancelHitTimer = 0;
    this.pause = false;


    this.cameraInertia = localStorage.getItem('cameraInertia') === 'true';

    //objects
    this.bed;
    this.buildObjects;
    this.axes;

    this.renderQuality = Number(localStorage.getItem('renderQuality'));
    if (this.renderQuality === undefined || this.renderQuality === null) {
      this.renderQuality = 1;
    }

    this.hasCacheSupport = false;
    /*if (this.hasCacheSupport) {
      window.caches
        .open('gcode-viewer')
        .then(() => {
          console.info('Cache support enabled');
        })
        .catch(() => {
          //Chrome and safari hide caches when not available. Firefox exposes it regardless so we have to force a fail to see if it is supported
          this.hasCacheSupport = false;
        });
    }*/
  }
  getMaxHeight() {
    return this.maxHeight;
  }
  getMinHeight() {
    return this.minHeight;
  }  
  
  setCameraType(arcRotate) {
    if (arcRotate) {
      this.scene.activeCamera = this.orbitCamera;
    } else {
      this.scene.activeCamera = this.flyCamera;
    }
  }
  setZClipPlane(top, bottom) {
    this.zTopClipValue = -top;
    this.zBottomClipValue = bottom;
    if (bottom > top) {
      this.zTopClipValue = bottom + 1;
    }
    this.scene.clipPlane = new Plane(0, 1, 0, this.zTopClipValue);
    this.scene.clipPlane2 = new Plane(0, -1, 0, this.zBottomClipValue);
  }
  init() {
    this.engine = new Engine(this.canvas, true, { doNotHandleContextLost: true });
    this.engine.enableOfflineSupport = false;
    this.scene = new Scene(this.engine);
    if (this.debug) {
      this.scene.debugLayer.show();
    }
    this.scene.clearColor = Color3.FromHexString(this.getBackgroundColor());

    this.bed = new Bed(this.scene);
    this.bed.registerClipIgnore = (mesh) => {
      this.registerClipIgnore(mesh);
    };
    var bedCenter = this.bed.getCenter();

    // Add a camera to the scene and attach it to the canvas
    this.orbitCamera = new ArcRotateCamera('Camera', Math.PI / 2, 2.356194, 250, new Vector3(bedCenter.x, -2, bedCenter.y), this.scene);
    this.orbitCamera.invertRotation = false;
    this.orbitCamera.attachControl(this.canvas, false);
    this.orbitCamera.maxZ = 100000000;
    this.orbitCamera.lowerRadiusLimit = 10;
    this.updateCameraInertiaProperties()
    //    this.orbitCamera.wheelDeltaPercentage = 0.02;
    //    this.orbitCamera.pinchDeltaPercentage = 0.02;
    //Disabled at the moment
    //this.flyCamera = new UniversalCamera('UniversalCamera', new Vector3(0, 0, -10), this.scene);

    // Add lights to the scene

    //var light1 = new HemisphericLight("light1", new Vector3(1, 1, 0), this.scene);
    var light2 = new PointLight('light2', new Vector3(0, 1, -1), this.scene);
    light2.diffuse = new Color3(1, 1, 1);
    light2.specular = new Color3(1, 1, 1);
    var that = this;
    this.engine.runRenderLoop(function () {
      
      if(that.pause){
        return;
      }
      that.scene.render();
      //Update light 2 position
      light2.position = that.scene.cameras[0].position;

    });

    this.buildObjects = new BuildObjects(this.scene);
    this.buildObjects.getMaxHeight = () => {
      return this.gcodeProcessor.getMaxHeight();
    };
    this.buildObjects.registerClipIgnore = (mesh) => {
      this.registerClipIgnore(mesh);
    };
    this.bed.buildBed();

    this.axes = new Axes(this.scene);
    this.axes.registerClipIgnore = (mesh) => {
      this.registerClipIgnore(mesh);
    };
    this.axes.render(50);

    this.resetCamera();
  }

  resize() {
    this.engine.resize();
  }

  refreshUI() {
    setTimeout(function () { }, 0);
  }

  setFileName(path) {
    if (this.hasCacheSupport) {
      window.caches.open('gcode-viewer').then(function (cache) {
        var pathData = new Blob([path], { type: 'text/plain' });
        cache.put('gcodeFileName', new Response(pathData));
      });
    }
  }

  getFileName() {
    if (this.hasCacheSupport) {
      window.caches.open('gcode-viewer').then(function (cache) {
        cache.match('gcodeData').then(function (response) {
          response.text().then(function (text) {
            return text;
          });
        });
      });
    } else {
      return '';
    }
  }

  resetCamera() {
    var bedCenter = this.bed.getCenter();
    var bedSize = this.bed.getSize();
    (this.scene.activeCamera.alpha = Math.PI / 2), (this.scene.activeCamera.beta = 2.356194);
    if (this.bed.isDelta) {
      this.scene.activeCamera.radius = bedCenter.x;
      this.scene.activeCamera.target = new Vector3(bedCenter.x, -2, bedCenter.y);
      this.scene.activeCamera.position = new Vector3(-bedSize.x, bedSize.z, -bedSize.x);
    } else {
      this.scene.activeCamera.radius = 250;
      this.scene.activeCamera.target = new Vector3(bedCenter.x, -2, bedCenter.y);
      this.scene.activeCamera.position = new Vector3(-bedSize.x / 2, bedSize.z, -bedSize.y / 2);
    }
  }

  lastLoadFailed() {
    if (!localStorage) return false;
    return localStorage.getItem(this.lastLoadKey) === 'true';
  }
  setLoadFlag() {
    if (localStorage) {
      localStorage.setItem(this.lastLoadKey, 'true');
    }
  }

  clearLoadFlag() {
    if (localStorage) {
      localStorage.setItem(this.lastLoadKey, '');
      localStorage.removeItem(this.lastLoadKey);
    }
  }

  async processFile(fileContents) {
    this.clearScene();
    this.refreshUI();

    let that = this;
    if (this.hasCacheSupport) {
      window.caches.open('gcode-viewer').then(function (cache) {
        var gcodeData = new Blob([fileContents], { type: 'text/plain' });
        cache.put('gcodeData', new Response(gcodeData));
      });
    }

    this.fileData = fileContents;
    this.gcodeProcessor.setExtruderColors(this.getExtruderColors());
    this.gcodeProcessor.setProgressColor(this.getProgressColor());
    this.gcodeProcessor.scene = this.scene;

    if (this.lastLoadFailed()) {
      console.error('Last rendering failed dropping to SBC quality');
      this.updateRenderQuality(1);
      this.clearLoadFlag();
    }
    this.setLoadFlag();
    await this.gcodeProcessor.processGcodeFile(fileContents, this.renderQuality, function () {
      if (that.hasCacheSupport) {
        that.fileData = ''; //free resourcs sooner
      }
    });
    this.clearLoadFlag();

    this.gcodeProcessor.createScene(this.scene);
    this.maxHeight = this.gcodeProcessor.getMaxHeight();
    this.minHeight = this.gcodeProcessor.getMinHeight();
    this.toggleTravels(this.travelVisible);
    this.setCursorVisiblity(this.toolCursorVisible);
  }

  toggleTravels(visible) {
    var mesh = this.scene.getMeshByName('travels');
    if (mesh !== undefined) {
      try {
        mesh.isVisible = visible;
        this.travelVisible = visible;
      } catch {
        //console.log('Travel Mesh Error');
      }
    }
  }

  getExtruderColors() {
    let colors = localStorage.getItem('extruderColors');
    if (colors === null) {
      colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#FFFFFF'];
      this.saveExtruderColors(colors);
    } else {
      colors = colors.split(',');
    }
    return colors;
  }
  saveExtruderColors(colors) {
    localStorage.setItem('extruderColors', colors);
  }
  resetExtruderColors() {
    localStorage.removeItem('extruderColors');
    this.getExtruderColors();
  }
  getProgressColor() {
    let progressColor = localStorage.getItem('progressColor');
    if (progressColor === null) {
      progressColor = '#FFFFFF';
    }
    return progressColor;
  }
  setProgressColor(value) {
    localStorage.setItem('progressColor', value);
    this.gcodeProcessor.setProgressColor(value);
  }

  getBackgroundColor() {
    let color = localStorage.getItem('sceneBackgroundColor');
    if (color === null) {
      color = '#000000';
    }
    return color;
  }
  setBackgroundColor(color) {
    if (this.scene !== null && this.scene !== undefined) {
      if (color.length > 7) {
        color = color.substring(0, 7);
      }
      this.scene.clearColor = Color3.FromHexString(color);
    }
    localStorage.setItem('sceneBackgroundColor', color);
  }
  clearScene(clearFileData) {
    if (this.fileData && clearFileData) {
      this.fileData = '';
    }
    this.gcodeProcessor.unregisterEvents();

    for (let idx = this.scene.meshes.length - 1; idx >= 0; idx--) {
      let sceneEntity = this.scene.meshes[idx];
      if (sceneEntity && this.debug) {
        console.log(`Disposing ${sceneEntity.name}`);
      }
      this.scene.removeMesh(sceneEntity);
      if (sceneEntity && typeof sceneEntity.dispose === 'function') {
        sceneEntity.dispose(false, true);
      }
    }

    for (let idx = this.scene.materials.length - 1; idx >= 0; idx--) {
      let sceneEntity = this.scene.materials[idx];
      if (sceneEntity.name !== 'solidMaterial') continue;
      if (sceneEntity && this.debug) {
        console.log(`Disposing ${sceneEntity.name}`);
      }
      this.scene.removeMaterial(sceneEntity);
      if (sceneEntity && typeof sceneEntity.dispose === 'function') {
        sceneEntity.dispose(false, true);
      }
    }

    if (this.toolCursor) {
      this.toolCursor.dispose(false, true);
      this.toolCursor = undefined;
    }

    this.buildtoolCursor();
    this.bed.buildBed();
    this.axes.render();
  }
  reload() {
    return new Promise((resolve) => {
      this.clearScene();

      if (this.hasCacheSupport) {
        let that = this;
        window.caches.open('gcode-viewer').then(function (cache) {
          cache.match('gcodeData').then(function (response) {
            response.text().then(function (text) {
              that.processFile(text).then(() => {
                resolve();
              });
            });
          });
        });
      } else {
        this.processFile(this.fileData).then(() => {
          resolve();
        });
      }
    });
  }
  getRenderMode() {
    return this.gcodeProcessor.renderMode;
  }
  setCursorVisiblity(visible) {
    if (this.scene === undefined) return;
    if (this.toolCursor === undefined) {
      this.buildtoolCursor();
    }
    this.toolCursorMesh.isVisible = visible;
    this.toolCursorVisible = visible;
  }
  updateToolPosition(position) {
    let x = 0;
    let y = 0;
    let z = 0;
    this.buildtoolCursor();
    for (var index = 0; index < position.length; index++) {
      switch (position[index].axes) {
        case 'X':
          {
            x = position[index].position;
          }
          break;
        case 'Y':
          {
            y = position[index].position;
          }
          break;
        case 'Z':
          {
            z = position[index].position * (this.gcodeProcessor.spreadLines ? this.gcodeProcessor.spreadLineAmount : 1);
          }
          break;
      }

      this.toolCursor.setAbsolutePosition(new Vector3(x, z, y));
    }
  }
  buildtoolCursor() {
    if (this.toolCursor !== undefined) return;
    this.toolCursor = new TransformNode('toolCursorContainer');
    this.toolCursorMesh = MeshBuilder.CreateCylinder('toolCursorMesh', { diameterTop: 0, diameterBottom: 1 }, this.scene);
    this.toolCursorMesh.parent = this.toolCursor;
    this.toolCursorMesh.position = new Vector3(0, 3, 0);
    this.toolCursorMesh.rotate(Axis.X, Math.PI, Space.LOCAL);
    this.toolCursorMesh.scaling = new Vector3(3, 3, 3);
    this.toolCursorMesh.isVisible = this.toolCursorVisible;
    this.registerClipIgnore(this.toolCursorMesh);
  }
  updateRenderQuality(renderQuality) {
    this.renderQuality = renderQuality;
    if (localStorage) {
      localStorage.setItem('renderQuality', renderQuality);
    }
  }
  registerClipIgnore(mesh) {
    if (mesh === undefined || mesh === null) return;
    mesh.onBeforeRenderObservable.add(() => {
      this.scene.clipPlane = null;
      this.scene.clipPlane2 = null;
    });
    mesh.onAfterRenderObservable.add(() => {
      this.scene.clipPlane = new Plane(0, 1, 0, this.zTopClipValue);
      this.scene.clipPlane2 = new Plane(0, -1, 0, this.zBottomClipValue);
    });
  }
  updateCameraInertiaProperties() {

    if (this.cameraInertia) {
      this.orbitCamera.speed = 2;
      this.orbitCamera.inertia = 0.9;
      this.orbitCamera.panningInertia = 0.9;
      this.orbitCamera.inputs.attached.keyboard.angularSpeed = 0.005;
      this.orbitCamera.inputs.attached.keyboard.zoomingSensibility = 2;
      this.orbitCamera.inputs.attached.keyboard.panningSensibility = 2;
      this.orbitCamera.angularSensibilityX = 1000;
      this.orbitCamera.angularSensibilityY = 1000;
      this.orbitCamera.panningSensibility = 10;
      this.orbitCamera.wheelPrecision  = 1;
      
    }
    else {
      this.orbitCamera.speed = 500;
      this.orbitCamera.inertia = 0;
      this.orbitCamera.panningInertia = 0;
      this.orbitCamera.inputs.attached.keyboard.angularSpeed = 0.05;
      this.orbitCamera.inputs.attached.keyboard.zoomingSensibility =0.5;
      this.orbitCamera.inputs.attached.keyboard.panningSensibility = 0.5;
      this.orbitCamera.angularSensibilityX = 200;
      this.orbitCamera.angularSensibilityY = 200;
      this.orbitCamera.panningSensibility = 2;
      this.orbitCamera.wheelPrecision = 0.25;
    }

  }
  setCameraInertia(enabled) {
    this.cameraInertia = enabled;
    localStorage.setItem('cameraInertia', enabled);
    this.updateCameraInertiaProperties()
  }
}
