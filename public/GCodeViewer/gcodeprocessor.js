/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
"use strict";


class gcodeProcessor {
    constructor() {
        this.currentPosition = new BABYLON.Vector3(0, 0, 0);
        this.color;
        this.absolute = true; //Track if we are in relative or absolute mode.
        this.lines = [];
        this.extrudedLines = [];
        this.travels = [];
        this.currentColor = new BABYLON.Color4(1, 1, 1, 1);
        this.sps;
        this.layerDictionary = {};
        this.maxHeight = 0;
        this.lineCount = 0;
        this.renderMode = "";

        this.extruderColors = [
            new BABYLON.Color4(0, 1, 1, 1), //c
            new BABYLON.Color4(1, 0, 1, 1), //m
            new BABYLON.Color4(1, 1, 0, 1), //y
            new BABYLON.Color4(0, 0, 0, 1), //k
            new BABYLON.Color4(1, 1, 1, 1) //w
        ];
    }

    setExtruderColors(colors) {
        if (colors === null || colors.length === 0) return;
        this.extruderColors = [];
        for (var idx = 0; idx < colors.length; idx++) {
            this.extruderColors.push(BABYLON.Color3.FromHexString(colors[idx]));
        }


    }

    getMaxHeight() {
        return this.maxHeight;
    }
    processGcodeFile(file) {
        var lines = file.split(/\r\n|\n/);
        for (var lineNo = 0; lineNo < lines.length; lineNo++) {
            var line = lines[lineNo];
            line.trim();
            if (!line.startsWith(";")) {
                this.processLine(line);
            }
        }
        file = {}; //Clear out the file.
    }

    processLine(tokenString) {
        var tokens = tokenString.toUpperCase().split(" ");
        if (tokens.length > 1) {
            switch (tokens[0]) {
                case "G0":
                case "G1":
                    var line = new gcodeLine();

                    line.start = this.currentPosition.clone();
                    for (var tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
                        var token = tokens[tokenIdx];
                        switch (token[0]) {
                            case "X":
                                this.currentPosition.x = this.absolute ?
                                    Number(token.substring(1)) :
                                    this.currentPosition.x + Number(token.substring(1));
                                break;
                            case "Y":
                                this.currentPosition.z = this.absolute ?
                                    Number(token.substring(1)) :
                                    this.currentPosition.z + Number(token.substring(1));
                                break;
                            case "Z":
                                this.currentPosition.y = this.absolute ?
                                    Number(token.substring(1)) :
                                    this.currentPosition.y + Number(token.substring(1));
                                this.maxHeight = this.currentPosition.y;
                                break;
                            case "E":
                                line.extruding = true;
                                break;
                        }
                    }
                    line.end = this.currentPosition.clone();

                    if (line.extruding && line.length() >= 0.01) {

                        line.color = this.currentColor.clone();
                        this.lines.push(line);
                    } else {
                        line.color = new BABYLON.Color4(1, 0, 0, 1);
                        this.travels.push(line);
                    }
                    break;
                case "G28":
                    //Home
                    this.currentPosition = new BABYLON.Vector3(0, 0, 0);
                    break;
                case "G90":
                    this.absolute = true;
                    break;
                case "G91":
                    this.absolute = false;
                    break;
                case "G92":
                    //this resets positioning, typically for extruder, probably won't need
                    break;
                case "M567":
                    for (var tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
                        var token = tokens[tokenIdx];
                        var finalColors = [1, 1, 1];
                        switch (token[0]) {
                            case "E":
                                this.extruderPercentage = token.substring(1).split(":");
                                break;
                        }
                    }
                    for (var extruderIdx = 0; extruderIdx < 4; extruderIdx++) {
                        finalColors[0] -=
                            (1 - this.extruderColors[extruderIdx].r) *
                            this.extruderPercentage[extruderIdx];
                        finalColors[1] -=
                            (1 - this.extruderColors[extruderIdx].g) *
                            this.extruderPercentage[extruderIdx];
                        finalColors[2] -=
                            (1 - this.extruderColors[extruderIdx].b) *
                            this.extruderPercentage[extruderIdx];
                    }
                    this.currentColor = new BABYLON.Color4(
                        finalColors[0],
                        finalColors[1],
                        finalColors[2],
                        1
                    );
                    break;
            }
        } else {
            if (tokenString.startsWith("T")) {
                var extruder = Number(tokenString.substring(1));
                if (extruder > 3) {
                    extruder = extruder % 4;
                }
                this.currentColor = this.extruderColors[extruder].clone();
            }
        }
    }

    createScene(scene) {
        var ver = 2;

        this.lineCount = this.lines.length; //rendered lines

        if (this.lines.length > 400000) {
            console.log("Switching to line rendering mode.");
            ver = 1;
        }

        if (ver === 1) {
            this.renderMode = "Line Rendering";
            var lineArray = [];
            var colorArray = [];
            for (var lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
                var line = this.lines[lineIdx];
                var data = line.getPoints(scene);
                lineArray.push(data.points);
                colorArray.push(data.colors);
            }
            var lineMesh = BABYLON.MeshBuilder.CreateLineSystem(
                "lines", {
                    lines: lineArray,
                    colors: colorArray,
                    updatable: false,
                    useVertexAlpha: false
                },
                scene
            );
            var travelArray = [];
            var travelColorArray = [];
            for (var travelIdx = 0; travelIdx < this.travels.length; travelIdx++) {
                var line = this.travels[travelIdx];
                var data = line.getPoints(scene);
                travelArray.push(data.points);
                travelColorArray.push(data.colors);
            }
            var travelMesh = BABYLON.MeshBuilder.CreateLineSystem(
                "travels", {
                    lines: travelArray,
                    colors: travelColorArray,
                    updatable: false,
                    useVertexAlpha: false
                },
                scene
            );
            travelMesh.isVisible = false;
        }



        if (ver === 2) {
            this.renderMode = "Mesh Rendering";
            var box = BABYLON.MeshBuilder.CreateBox(
                "box", { width: 1, height: 0.3, depth: 0.6 },
                scene
            );

            var l = this.lines;

            var particleBuilder = function(particle, i, s) {
                l[s].renderLineV3(particle);
            };

            var sps = new BABYLON.SolidParticleSystem("sps", scene, { updatable: false });

            sps.addShape(box, this.lines.length, {
                positionFunction: particleBuilder
            });
            sps.buildMesh();
            sps.mesh.freezeWorldMatrix(); // prevents from re-computing the World Matrix each frame
            sps.mesh.freezeNormals();
        }

        this.lines = []; //get rid of the line data.
    }
}

//export default processor;