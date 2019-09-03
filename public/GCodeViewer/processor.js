/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
"use strict";


class processor {
  constructor() {
    this.currentPosition = new BABYLON.Vector3(0, 0, 0);
    this.color;
    this.absolute = true; //Track if we are in relative or absolute mode.
    this.lines = [];
    this.extrudedLines = [];
    this.travels = [];
    this.currentColor = new BABYLON.Color4(1, 1, 1, 1);
    this.sps;
    this.extruderColors = [
      new BABYLON.Color4(0, 1, 1, 1), //c
      new BABYLON.Color4(1, 0, 1, 1), //m
      new BABYLON.Color4(1, 1, 0, 1), //y
      new BABYLON.Color4(0, 0, 0, 1) //k
    ];
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
                this.currentPosition.x = this.absolute
                  ? Number(token.substring(1))
                  : this.currentPosition.x + Number(token.substring(1));
                break;
              case "Y":
                this.currentPosition.z = this.absolute
                  ? Number(token.substring(1))
                  : this.currentPosition.z + Number(token.substring(1));
                break;
              case "Z":
                this.currentPosition.y = this.absolute
                  ? Number(token.substring(1))
                  : this.currentPosition.y + Number(token.substring(1));
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
    var ver = 6;

    //If there are more than 500k lines of gcode then we need to switch to line rendering to avoid an out of memory exception.
    if (this.lines.length > 500000) {
      console.log(this.lines.length);
      console.log("Switching to line rendering mode.");
      ver = 2;
    }

    if (ver === 1) {
      for (var lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
        var line = this.lines[lineIdx];
        line.renderLine(scene);
      }
    }

    if (ver === 2) {
      var lineArray = [];
      var colorArray = [];
      for (var lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
        var line = this.lines[lineIdx];
        var data = line.getPoints(scene);
        lineArray.push(data.points);
        colorArray.push(data.colors);
      }
      var lineMesh = BABYLON.MeshBuilder.CreateLineSystem(
        "lines",
        {
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
        "travels",
        {
          lines: travelArray,
          colors: travelColorArray,
          updatable: false,
          useVertexAlpha: false
        },
        scene
      );
      travelMesh.isVisible = false;
    }

    if (ver === 3) {
      scene.useGeometryIdsMap = true;
      var meshes = [];
      for (var lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
        if (lineIdx % 1000 === 0) {
          $("#LoadStatus").html(lineIdx + "/" + this.lines.length);
          var percent = lineIdx / this.lines.length;
          $("#FileProgressBar").attr("aria-valuenow", percent);
          $("#FileProgressBar").css("width", percent + "%");
          //console.log(lineIdx + " / " + this.lines.length);
        }
        var line = this.lines[lineIdx];
        //line.renderLineV2(scene);
        meshes.push(line.renderLineV2(scene));
        if (lineIdx % 500 === 0) {
          BABYLON.Mesh.MergeMeshes(meshes, true, true);
          meshes = [];
        }
      }
    }

    if (ver === 4) {
      var sps = new BABYLON.SolidParticleSystem("sps", scene);

      for (var lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
        if (lineIdx % 1000 === 0) {
          $("#LoadStatus").html(lineIdx + "/" + this.lines.length);
        }
        var line = this.lines[lineIdx];
        line.renderLineV3(sps);
      }
      sps.buildMesh();
      sps.isAlwaysVisible = true;
    }

    if (ver === 5) {
      var cylinder = BABYLON.MeshBuilder.CreateBox(
        "box",
        { width: 1, height: 0.3, depth: 0.6 },
        scene
      );
      var sps = new BABYLON.SolidParticleSystem("sps", scene);
      sps.addShape(cylinder, this.lines.length);
      sps.buildMesh();
    
      var length = this.lines.length;
      var lines = this.lines;
      sps.initParticles = function() {
        for (var idx = 0; idx < length; idx++) {
          lines[idx].renderLineV3(this.particles[idx]);
        }
      };
      sps.initParticles();
      sps.computeParticleVertex = true;
      sps.isAlwaysVisible = true;
      sps.setParticles();
    }

    if (ver === 6) {
      var box = BABYLON.MeshBuilder.CreateBox(
        "box",
        { width: 1, height: 0.3, depth: 0.6 },
        scene
      );

      var l = this.lines;

      var particleBuilder = function(particle, i, s) {
        l[s].renderLineV3(particle);
      };

      var sps = new BABYLON.SolidParticleSystem("sps", scene, {updatable : false});

      sps.addShape(box, this.lines.length, {
        positionFunction: particleBuilder
      });
      sps.buildMesh();
      sps.mesh.freezeWorldMatrix(); // prevents from re-computing the World Matrix each frame
      sps.mesh.freezeNormals();
    }
  }
}

//export default processor;
