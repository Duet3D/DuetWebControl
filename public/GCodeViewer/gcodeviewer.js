/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
'use strict'


class gcodeViewer {



    constructor(canvas) {
        let that = this;
        this.gcodeProcessor = new processor();
        this.maxHeight = 0;
        if (canvas === undefined || canvas === null) {
            $('body').append(
                '<div id="GCodeViewer" style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:#FF0000;z-index:3">' +
                '<canvas style="position:absolute;width:100%;height:100%" id="3DCanvas"></canvas>' +
                '<button id="CloseViewer" style="position:absolute;top:100px;right:50px">Close</button>' +
                '</div>' +
                '</div>');
            this.canvas = $('#3DCanvas')[0];
            $('#CloseViewer').click(function() {
                $('#GCodeViewer').remove();
                console.log(that.scene);
                that.scene.dispose(); //Clean up when the window is closed.
            });
        } else {
            this.canvas = canvas;
        }
    }
    getMaxHeight() {
        return this.maxHeight;
    }
    setProgress(percent) {
        $('#FileProgressBar').attr('aria-valuenow', percent);
        $('#FileProgressBar').css('width', percent + "%");
    }

    hideProgress() {
        $("#FileProgress").hide();
    }

    setCameraType(arcRotate) {
        if (arcRotate) {
            this.scene.activeCamera = this.orbitCamera;
        } else {
            this.scene.activeCamera = this.flyCamera;
        }
    }

    setZClipPlane(value) {
        this.scene.clipPlane = new BABYLON.Plane(0, 1, 0, -value);
    }

    init() {
        this.engine = new BABYLON.Engine(this.canvas, true); //, {doNotHandleContextLost: true})
        this.engine.enableOfflineSupport = false;
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = BABYLON.Color3.Black();

        // Add a camera to the scene and attach it to the canvas
        this.orbitCamera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, 2.356194, -250, new BABYLON.Vector3(117.5, 0, 117.5), this.scene);
        this.flyCamera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, -10), this.scene);
        this.orbitCamera.attachControl(this.canvas, true);
        this.scene.activeCamera.panningSensibility = 10;

        // Add lights to the scene
        //var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
        var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), this.scene);
        light2.diffuse = new BABYLON.Color3(1, 1, 1);
        light2.specular = new BABYLON.Color3(1, 1, 1);
        var that = this;
        this.engine.runRenderLoop(function() {
            that.scene.render();

            //Update light 2 position
            light2.position = that.scene.cameras[0].position;

        });

        //Render the corner axis
        this.showWorldAxis(50);

        var planeMaterial = new BABYLON.StandardMaterial(this.scene);
        planeMaterial.alpha = 0.5;
        planeMaterial.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.25);

        var buildPlatePlane = BABYLON.MeshBuilder.CreatePlane("BuildPlate", { width: 235, height: 235 }, this.scene);
        buildPlatePlane.material = planeMaterial;
        buildPlatePlane.rotationQuaternion = new BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI / 2);
        buildPlatePlane.translate(new BABYLON.Vector3(117.5, 0, 117.5), 1, BABYLON.Space.WORLD);

        window.addEventListener("resize", function() {
            that.engine.resize();
        });
    }

    resetCamera(){
        this.scene.activeCamera.alpha = Math.PI / 2, 
        this.scene.activeCamera.beta = 2.356194 
        this.scene.activeCamera.radius = -250
        this.scene.activeCamera.target = new BABYLON.Vector3(117.5, 0, 117.5)
    }

    processFile(fileContents) {
        this.gcodeProcessor.processGcodeFile(fileContents);
        this.gcodeProcessor.createScene(this.scene);
        this.maxHeight = this.gcodeProcessor.getMaxHeight();
    }


    toggleTravels() {
        var mesh = this.scene.getMeshByName("travels");
        if (mesh !== undefined) {
            mesh.isVisible = !mesh.isVisible;
        }
    }

    showWorldAxis(size) {
        var scene = this.scene;
        var makeTextPlane = function(text, color, size) {
            var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
            dynamicTexture.hasAlpha = true;
            dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color, "transparent", true);
            var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
            plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
            plane.material.backFaceCulling = false;
            plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
            plane.material.diffuseTexture = dynamicTexture;
            return plane;
        };
        var axisX = BABYLON.Mesh.CreateLines("axisX", [
            BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
            new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
        ], this.scene);
        axisX.color = new BABYLON.Color3(1, 0, 0);
        var xChar = makeTextPlane("X", "red", size / 10);
        xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
        var axisY = BABYLON.Mesh.CreateLines("axisY", [
            BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
            new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
        ], this.scene);
        axisY.color = new BABYLON.Color3(0, 1, 0);
        var yChar = makeTextPlane("Z", "green", size / 10);
        yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
        var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
            BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
            new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
        ], this.scene);
        axisZ.color = new BABYLON.Color3(0, 0, 1);
        var zChar = makeTextPlane("Y", "blue", size / 10);
        zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
    }

}


//export default gcodeViewer