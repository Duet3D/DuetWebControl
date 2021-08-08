/* eslint-disable */
import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scalar } from '@babylonjs/core/Maths/math.scalar';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PointerEventTypes, StandardMaterial, Material, Orientation, PointLight, Quaternion, Space, Mesh } from '@babylonjs/core';
import { HemisphericLight } from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'

import Axes from '../../plugins/GCodeViewer/viewer/axes'
import { _ } from 'core-js';
import { Color } from 'three';



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
        this.bedMesh;
        this.isDelta = false;
        this.axes;

        this.gridMaterial;
        this.ribbonMaterial;
        this.sphereMaterial;

        this.heightPointMeshes = [];
        this.observableControls;

        this.bedRendered;

        this.labelCallback = () => { };

        this.minZ = 0;
        this.maxZ = 0;

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

        this.axesLabelMeshes = [];
    }

    init() {
        return new Promise((resolve) => {
            //Init BabylonJS Engine
            this.engine = new Engine(this.canvas, true, { doNotHandleContextLost: true });
            this.engine.enableOfflineSupport = false;

            //Create BJS Scene
            this.scene = new Scene(this.engine);
            this.scene.clearColor = new Color3(0, 0, 0);

            //Setup camera control
            this.orbitCamera = new ArcRotateCamera('Camera', 0, 0, 250, new Vector3(0, 0, 0), this.scene);
            this.orbitCamera.invertRotation = false;
            this.orbitCamera.attachControl(this.canvas, false);
            this.orbitCamera.maxZ = 1000000;
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
            this.orbitCamera.wheelPrecision = 0.25;


            this.ribbonMaterial = new StandardMaterial("ribbonMaterial", this.scene);
            this.ribbonMaterial.diffuseColor = new Color3(1, 1, 1);
            this.ribbonMaterial.specularColor = new Color3(0, 0, 0);
            this.ribbonMaterial.emissiveColor = new Color3(1, 1, 1);
            this.ribbonMaterial.backFaceCulling = false;

            this.sphereMaterial = new StandardMaterial("sphereMaterial", this.scene);
            this.sphereMaterial.alpha = 0.5;
            this.sphereMaterial.diffuseColor = new Color3(1, 1, 1);
            this.sphereMaterial.specularColor = new Color3(0, 0, 0);
            this.sphereMaterial.emissiveColor = new Color3(1, 1, 1);

            this.highlightMaterial = new StandardMaterial("highlightMaterial", this.scene);
            this.highlightMaterial.alpha = 1;
            this.highlightMaterial.diffuseColor = new Color3(0, 1, 1);
            this.highlightMaterial.specularColor = new Color3(0, 0, 1);
            this.highlightMaterial.emissiveColor = new Color3(0, 1, 1);



            //      this.light1 = new PointLight('light1', new Vector3(0, 1, -1), this.scene);
            //       this.light1.diffuse = new Color3(1, 1, 1);
            //      this.light1.specular = new Color3(1, 1, 1);

            this.light1 = new HemisphericLight("light1", new Vector3(0, 1, 0), this.scene);
            this.light2 = new HemisphericLight("light1", new Vector3(0, -1, 0), this.scene);

            //build the render loop
            this.engine.runRenderLoop(() => {

                this.light1.position = this.scene.cameras[0].position;
                if (this.bedRendered)
                    this.scene.render();
            })

            this.buildObservables();

            resolve();
        });

    }

    /* wavy mess
      let points = [];
           for(let x = 0; x < bedPoints.length; x+=0.2){
               for(let y = 0; y < 100; y+=0.2){
                   pts.push(new Vector3(x,Math.sin(x) * Math.cos(y) * 2,y));
               }
               points.push(pts);
           }
      */

    clearHeightMapData() {
        if (this.ribbonMesh) {
            this.ribbonMesh.dispose(false, false);
        }
        this.heightPointMeshes.forEach(p => p.dispose());
    }


    createHeightPoint(vec, metadata) {
        let sphere = MeshBuilder.CreateSphere("sphere", { diameter: 10, segments: 8 }, this.scene);
        sphere.position = vec;
        sphere.material = this.sphereMaterial;
        sphere.metadata = metadata;
        sphere.isPickable = true;
        sphere.enablePointerMoveEvents = true;
        this.heightPointMeshes.push(sphere);
    }

    renderHeightMap(bedPoints) {
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

        console.log(bedPoints);
        let points = [];
        let color = [];
        for (let y = 0; y < bedPoints.length; y++) {
            let xpts = [];
            for (let x = 0; x < bedPoints[y].length; x++) {
                let pt = new Vector3(bedPoints[y][x][0], bedPoints[y][x][2] * 100, bedPoints[y][x][1])
                xpts.push(pt);
                color.push(this.getColor(bedPoints[y][x][2]));

                this.createHeightPoint(pt, {
                    x: bedPoints[y][x][0],
                    y: bedPoints[y][x][1],
                    z: bedPoints[y][x][2]
                });
            }
            points.push(xpts)
        }
        this.ribbonMesh = MeshBuilder.CreateRibbon("ribbon", { pathArray: points, colors: color, sideOrientation: Mesh.DoubleSide }, this.scene);
        this.ribbonMesh.material = this.ribbonMaterial;
        this.ribbonMesh.isPickable = false;
    }

    getColor(z) {
        let low = new Color4(0, 1, 0, 1);
        let mid = new Color4(1, 1, 0, 1);
        let high = new Color4(1, 0, 0, 1);
        if (z < 0) {
            return Color4.Lerp(low, mid, Scalar.RangeToPercent(z, this.minZ, 0))
        } else {
            return Color4.Lerp(mid, high, Scalar.RangeToPercent(z, 0, this.maxZ))
        }
    }

    resetCamera() {
        var bedCenter = this.getCenter();
        var bedSize = this.getSize();
        this.scene.activeCamera.alpha = 0;
        this.scene.activeCamera.beta = 0;
        if (this.isDelta) {
            this.scene.activeCamera.radius = bedCenter.x;
            this.scene.activeCamera.target = new Vector3(bedCenter.x, -2, bedCenter.y);
            this.scene.activeCamera.position = new Vector3(-bedSize.x, bedSize.z, -bedSize.x);
        } else {
            this.scene.activeCamera.radius = 250;
            this.scene.activeCamera.target = new Vector3(bedCenter.x, -2, bedCenter.y);
            this.scene.activeCamera.position = new Vector3(-bedSize.x / 2, bedSize.z, -bedSize.y / 2);
        }
    }

    renderBed() {

        if (this.gridMaterial) {
            this.gridMaterial.dispose();
        }
        if (this.bedMesh) {
            this.bedMesh.dispose(false, false);
        }
        this.resetCamera();

        if (this.axes) {
            this.axes.dispose();
        }

        this.gridMaterial = this.buildGridMaterial();
        this.axes = new Axes(this.scene);
        this.axes.render(new Vector3(-10, 0, -10));


        let bedCenter = this.getCenter();
        let bedSize = this.getSize();
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


        //build axes labels
        if (!this.isDelta) {
            this.axesLabelMeshes.forEach(mesh => mesh.dispose());
            for (let x = this.buildVolume.x.min; x <= this.buildVolume.x.max; x += this.gridSize) {
                let label = this.makeTextPlane(x, new Color3(1, 1, 1), 50);
                label.position = new Vector3(x, 0, this.buildVolume.y.min - 10);
                this.axesLabelMeshes.push(label);
            }
        }
        this.bedRendered = true;
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

    buildGridMaterial() {
        let gridMaterial = new GridMaterial('bedMaterial', this.scene);
        gridMaterial.mainColor = new Color4(1, 1, 1, 0.2);
        gridMaterial.lineColor = Color3.FromHexString("#FFFFFF");
        gridMaterial.gridRatio = 1;
        gridMaterial.opacity = 0.8;
        gridMaterial.majorUnitFrequency = this.gridSize;
        gridMaterial.minorUnitVisibility = 0.25;
        let bedSize = this.getSize();
        gridMaterial.gridOffset = new Vector3(0, 0, 0);
        gridMaterial.backFaceCulling = false;
        return gridMaterial;
    }

    resize() {
        this.engine.resize();
    }

    buildObservables() {
        if (this.observableControls) {
            return;
        }

        this.observableControls = this.scene.onPointerObservable.add((pointerInfo) => {
            let pickInfo = pointerInfo.pickInfo;
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERMOVE: {

                    this.handlePointerMove(pickInfo);
                }
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
        this.heightPointMeshes.forEach((mesh) => mesh.material = this.sphereMaterial);
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