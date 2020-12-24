'use strict';

import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem'
import { PointsCloudSystem } from '@babylonjs/core/Particles/pointsCloudSystem'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'

import gcodeLine from './gcodeline';
import { doArc } from './utils.js'

export const RenderMode = {
  Block: 1,
  Line: 2,
  Point: 3,
  Max: 4,
};

export const ColorMode = {
  Color: 0,
  Feed: 1,
};

export default class {
  constructor() {
    this.currentPosition = new Vector3(0, 0, 0);
    this.currentColor = new Color4(0.25, 0.25, 0.25, 1);
    this.renderVersion = RenderMode.Line;
    this.absolute = true; //Track if we are in relative or absolute mode.
    this.lines = [];
    this.travels = [];
    this.sps;
    this.maxHeight = 0;
    this.lineCount = 0;
    this.renderMode = '';
    this.extruderCount = 5;
    this.layerDictionary = {};

    //We'll look at the last 2 layer heights for now to determine layer height.
    this.previousLayerHeight = 0;
    this.currentLayerHeight = 0;

    //Live Rendering
    this.liveTracking = false; //Tracks if we loaded the current job to enable live rendering
    this.liveTrackingShowSolid = localStorage.getItem('showSolid') === 'true'; //Flag if we want to continue showing the whole model while rendering


    this.materialTransparency = 0.3;
    this.gcodeLineIndex = [];
    this.gcodeFilePosition = 0;

    this.refreshTime = 200;
    this.timeStamp;

    this.lineLengthTolerance = 0.05;

    this.extruderColors = [
      new Color4(0, 1, 1, 1), //c
      new Color4(1, 0, 1, 1), //m
      new Color4(1, 1, 0, 1), //y
      new Color4(0, 0, 0, 1), //k
      new Color4(1, 1, 1, 1), //w
    ];

    this.progressColor = new Color4(0, 1, 0, 1);

    //scene data
    this.lineMeshIndex = 0;
    this.scene;
    this.renderFuncs = [];

    //Mesh Breaking
    this.meshBreakPoint = 20000;

    //average feed rate trimming
    this.feedRateTrimming = false;
    this.currentFeedRate = 0;
    this.feedValues = 0;
    this.numChanges = 0;
    this.avgFeed = 0;
    this.maxFeedRate = 0;
    this.minFeedRate = Number.MAX_VALUE;
    this.underspeedPercent = 1;

    this.colorMode = Number.parseInt(localStorage.getItem('processorColorMode'));
    if (!this.colorMode) {
      this.setColorMode(ColorMode.Color);
    }

    this.minColorRate = Number.parseInt(localStorage.getItem('minColorRate'));
    if (!this.minColorRate) {
      this.minColorRate = 1200;
      localStorage.setItem('minColorRate', this.minColorRate);
    }

    this.maxColorRate = Number.parseInt(localStorage.getItem('maxColorRate'));
    if (!this.maxColorRate) {
      this.maxColorRate = 3600;
      localStorage.setItem('maxColorRate', this.maxColorRate);
    }

    this.minFeedColorString = localStorage.getItem('minFeedColor');
    if (!this.minFeedColorString) {
      this.minFeedColorString = '#0000FF';
    }
    this.minFeedColor = Color4.FromHexString(this.minFeedColorString.padEnd(9, 'F'));

    this.maxFeedColorString = localStorage.getItem('maxFeedColor');
    if (!this.maxFeedColorString) {
      this.maxFeedColorString = '#FF0000';
    }
    this.maxFeedColor = Color4.FromHexString(this.maxFeedColorString.padEnd(9, 'F'));

    //render every nth row
    this.everyNthRow = 0;
    this.currentRowIdx = -1;
    this.currentZ = 0;
    this.renderTravels = true;
    this.lineVertexAlpha = false;

    this.forceWireMode = localStorage.getItem('forceWireMode') === "true";

    this.spreadLines = false;
    this.spreadLineAmount = 10;
    this.debug = false;
    this.specularColor = new Color4(0.1, 0.1, 0.1, 0.1);

    this.lookAheadLength = 500;
    this.cancelLoad = false;

    this.loadingProgressCallback;

    this.hasSpindle = false;
  }

  setExtruderColors(colors) {
    if (colors === null || colors.length === 0) return;
    this.extruderColors = [];
    for (var idx = 0; idx < colors.length; idx++) {
      var color = colors[idx];

      var extruderColor = Color4.FromHexString(color.padEnd(9, 'F'));
      this.extruderColors.push(extruderColor);
    }
  }

  setProgressColor(color) {
    this.progressColor = Color4.FromHexString(color.padEnd(9, 'F'));
  }

  getMaxHeight() {
    return this.maxHeight;
  }

  setRenderQualitySettings(numberOfLines, renderQuality) {
    if (renderQuality === undefined) {
      renderQuality = 1;
    }

    let maxLines = 0;
    let renderStartIndex = this.forceWireMode ? 2 : 1;
    let maxNRow = 2;

    this.refreshTime = 5000;
    this.everyNthRow = 1;
    this.renderTravels = true;

    //Render Mode Multipliers
    // 12x - 3d
    // 2x - line
    // 1x - point

    switch (renderQuality) {
      //SBC Quality - Pi 3B+
      case 1:
        {
          renderStartIndex = 2;
          this.refreshTime = 30000;
          maxLines = 25000;
          maxNRow = 50;
          this.renderTravels = false;
        }
        break;
      //Low Quality
      case 2:
        {
          renderStartIndex = 2;
          this.refreshTime = 30000;
          maxLines = 500000;
          maxNRow = 10;
          this.renderTravels = false;
        }
        break;
      //Medium Quality
      case 3:
        {
          maxLines = 1000000;
          maxNRow = 3;
        }
        break;
      //High Quality
      case 4:
        {
          maxLines = 15000000;
          maxNRow = 2;
        }
        break;
      //Ultra
      case 5:
        {
          maxLines = 25000000;
        }
        break;
      //Max
      default: {
        this.renderVersion = RenderMode.Block;
        this.everyNthRow = 1;
        return;
      }
    }

    for (let renderModeIdx = renderStartIndex; renderModeIdx < 4; renderModeIdx++) {
      let vertextMultiplier;
      switch (renderModeIdx) {
        case 1:
          vertextMultiplier = 24;
          break;
        case 2:
          vertextMultiplier = 2;
          break;
        case 3:
          vertextMultiplier = 1;
          break;
      }

      for (let idx = this.everyNthRow; idx <= maxNRow; idx++) {
        if (this.debug) {
          console.log('Mode: ' + renderModeIdx + '  NRow: ' + idx + '   vertexcount: ' + (numberOfLines * vertextMultiplier) / idx);
        }
        if ((numberOfLines * vertextMultiplier) / idx < maxLines) {
          this.renderVersion = renderModeIdx;
          this.everyNthRow = idx;
          return;
        }
      }
    }

    //we couldn't find a working case so we'll set a triage value
    console.log('Worst Case');
    this.renderVersion = 2;
    this.everyNthRow = 20;
  }

  initVariables() {
    this.currentPosition = new Vector3(0, 0, 0);
    this.cancelLoad = false;
    this.absolute = true;
    this.currentZ = 0;
    this.currentRowIdx = -1;
    this.gcodeLineIndex = [];
    this.lineMeshIndex = 0;
    this.lastExtrudedZHeight = 0;
    this.previousLayerHeight = 0;
    this.currentLayerHeight = 0;
    this.minFeedRate = Number.MAX_VALUE;
    this.maxFeedRate = 0;
    this.hasSpindle = false;
    this.currentColor = this.extruderColors[0].clone();
  }

  async processGcodeFile(file, renderQuality, clearCache) {
    this.initVariables();

    if (renderQuality === undefined || renderQuality === null) {
      renderQuality = 4;
    }

    if (file === undefined || file === null || file.length === 0) {
      return;
    }

    var lines = file.split('\n'); //file.split(/\r\n|\n/);
    //Get an opportunity to free memory before we strt generating 3d model
    if (typeof clearCache === 'function') {
      clearCache();
    }

    this.lineCount = lines.length;

    if (this.debug) {
      console.info(`Line Count : ${this.lineCount}`);
    }

    this.setRenderQualitySettings(this.lineCount, renderQuality);

    //set initial color to extruder 0
    this.currentColor = this.extruderColors[0].clone();

    lines.reverse();
    let filePosition = 0; //going to make this file position
    this.timeStamp = Date.now();
    while (lines.length) {
      if (this.cancelLoad) {
        this.cancelLoad = false;
        return;
      }
      var line = lines.pop();
      filePosition += line.length + 1;
      line.trim();
      if (!line.startsWith(';')) {

        this.processLine(line, filePosition);
        // this.processLineV2(line, filePosition);

        if (this.loadingProgressCallback) {
          this.loadingProgressCallback(filePosition / line.length);
        }
      }
      if (Date.now() - this.timeStamp > 10) {
        await this.pauseProcessing();
      }
    }

    //build the travel mesh
    if (this.renderTravels) {
      this.createTravelLines(this.scene)
    }

    file = {}; //Clear out the file.
  }

  pauseProcessing() {
    return new Promise((resolve) => setTimeout(resolve)).then(() => {
      this.timeStamp = Date.now();
    });
  }

  async processLine(tokenString, lineNumber) {
    //Remove the comments in the line
    let commentIndex = tokenString.indexOf(';');
    if (commentIndex > -1) {
      tokenString = tokenString.substring(0, commentIndex - 1).trim();
    }
    let tokens;

    tokenString = tokenString.toUpperCase();

    let command = tokenString.match(/[GM]+[0-9.]+/); //|S+

    if (command != null) {
      command = command.filter(c => c.startsWith('G') || c.startsWith('M'));
      switch (command[0]) {
        case 'G0':
        case 'G1':
          {
            tokens = tokenString.split(/(?=[GXYZEF])/);
            var line = new gcodeLine();
            line.gcodeLineNumber = lineNumber;
            line.start = this.currentPosition.clone();
            for (let tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
              let token = tokens[tokenIdx];
              switch (token[0]) {
                case 'X':
                  this.currentPosition.x = this.absolute ? Number(token.substring(1)) : this.currentPosition.x + Number(token.substring(1));
                  break;
                case 'Y':
                  this.currentPosition.z = this.absolute ? Number(token.substring(1)) : this.currentPosition.z + Number(token.substring(1));
                  break;
                case 'Z':
                  this.currentPosition.y = this.absolute ? Number(token.substring(1)) : this.currentPosition.y + Number(token.substring(1));
                  if (this.spreadLines) {
                    this.currentPosition.y *= this.spreadLineAmount;
                  }
                  // this.maxHeight = this.currentPosition.y;
                  break;
                case 'E':
                  line.extruding = true;
                  this.maxHeight = this.currentPosition.y; //trying to get the max height of the model.
                  break;
                case 'F':
                  this.currentFeedRate = Number(token.substring(1));
                  if (this.currentFeedRate > this.maxFeedRate) {
                    this.maxFeedRate = this.currentFeedRate;
                  }
                  if (this.currentFeedRate < this.minFeedRate) {
                    this.minFeedRate = this.currentFeedRate;
                  }

                  if (this.colorMode === ColorMode.Feed) {
                    let ratio = (this.currentFeedRate - this.minColorRate) / (this.maxColorRate - this.minColorRate);
                    if (ratio >= 1) {
                      this.currentColor = this.maxFeedColor;
                    } else if (ratio <= 0) {
                      this.currentColor = this.minFeedColor;
                    } else {
                      this.currentColor = Color4.Lerp(this.minFeedColor, this.maxFeedColor, ratio);
                    }
                  }

                  break;
              }
            }

            line.end = this.currentPosition.clone();
            if (this.debug) {
              console.log(`${tokenString}   absolute:${this.absolute}`);
              console.log(lineNumber, line);
            }

            if (this.feedRateTrimming) {
              this.feedValues += this.currentFeedRate;
              this.numChanges++;
              this.avgFeed = (this.feedValues / this.numChanges) * this.underspeedPercent;
            }

            //Nth row exclusion
            if (this.everyNthRow > 1 && line.extruding) {
              if (this.currentPosition.y > this.currentZ) {
                this.currentRowIdx++;
                this.currentZ = this.currentPosition.y;
              }

              if ((this.currentRowIdx % this.everyNthRow !== 0) ^ (this.currentRowIdx < 2)) {
                return;
              }
            }

            let spindleCutting = this.hasSpindle && command[0] === "G1";
            let lineTolerance = line.length() >= this.lineLengthTolerance;
            //feed rate trimming was disabled (probably will remove)
            // let feedRateTrimming=  this.feedRateTrimming && this.currentFeedRate < this.avgFeed;

            if (spindleCutting || (lineTolerance && line.extruding)) {
              line.color = this.currentColor.clone();
              this.lines.push(line);

              if (this.currentPosition.y > this.currentLayerHeight && this.currentPosition.y < 20) {
                this.previousLayerHeight = this.currentLayerHeight;
                this.currentLayerHeight = this.currentPosition.y;
              }

            } else if (this.renderTravels && !line.extruding) {
              line.color = new Color4(1, 0, 0, 1);
              this.travels.push(line);
            }

          } break;
        case 'G2':
        case 'G3': {
          tokens = tokenString.split(/(?=[GXYZIJFRE])/);
          let cw = tokens.filter(t => t === "G2");
          let arcResult = doArc(tokens, this.currentPosition, !this.absolute, 1);
          let curPt = this.currentPosition.clone();
          arcResult.points.forEach((point, idx) => {
            let line = new gcodeLine();
            line.gcodeLineNumber = this.gcodeLineNumber;
            line.start = curPt.clone();
            line.end = new Vector3(point.x, point.y, point.z);
            line.color = this.currentColor.clone();
            if (this.debug) {
              line.color = cw ? new Color4(0, 1, 1, 1) : new Color4(1, 1, 0, 1)
              if (idx == 0) {
                line.color = new Color4(0, 1, 0, 1);
              }
            }
            curPt = line.end.clone();
            this.lines.push(line);
          });
          //Last point to currentposition



          this.currentPosition = new Vector3(arcResult.position.x, arcResult.position.y, arcResult.position.z);
        } break;
        case 'G28':
          //Home
          this.currentPosition = new Vector3(0, 0, 0);
          break;
        case 'G90':
          this.absolute = true;
          break;
        case 'G91':
          this.absolute = false;
          break;
        case 'G92':
          //this resets positioning, typically for extruder, probably won't need
          break;
        case 'S':
          this.hasSpindle = true;
          break;
        case 'M3':
        case 'M4': {
          let tokens = tokenString.split(/(?=[SM])/);
          let spindleSpeed = tokens.filter(speed => speed.startsWith('S'))
          spindleSpeed = spindleSpeed[0] ? Number(spindleSpeed[0].substring(1)) : 0;
          if (spindleSpeed > 0) {
            this.hasSpindle = true;
          }

        }
          break;
        case 'M567': {
          let tokens = tokenString.split(/(?=[PE])/);
          if (this.colorMode === ColorMode.Feed) break;
          for (let tokenIdx = 1; tokenIdx < tokens.length; tokenIdx++) {
            let token = tokens[tokenIdx];
            var finalColors = [1, 1, 1];
            switch (token[0]) {
              case 'E':
                this.extruderPercentage = token.substring(1).split(':');
                break;
            }
          }
          for (let extruderIdx = 0; extruderIdx < 4; extruderIdx++) {
            finalColors[0] -= (1 - this.extruderColors[extruderIdx].r) * this.extruderPercentage[extruderIdx];
            finalColors[1] -= (1 - this.extruderColors[extruderIdx].g) * this.extruderPercentage[extruderIdx];
            finalColors[2] -= (1 - this.extruderColors[extruderIdx].b) * this.extruderPercentage[extruderIdx];
          }
          this.currentColor = new Color4(finalColors[0], finalColors[1], finalColors[2], 0.1);
          break;
        }
      }
    }
    else {
      //command is null so we need to check a couple other items.
      if (tokenString.startsWith('T') && this.colorMode !== ColorMode.Feed) {
        var extruder = Number(tokenString.substring(1)) % this.extruderCount; //For now map to extruders 0 - 4
        if (extruder < 0) extruder = 0; // Cover the case where someone sets a tool to a -1 value
        this.currentColor = this.extruderColors[extruder].clone();
      }
      if (this.debug) {
        console.log(tokenString);
      }

    }
    //break lines into manageable meshes at cost of extra draw calls
    if (this.lines.length >= this.meshBreakPoint) {
      //lets build the mesh
      this.createScene(this.scene);
      await this.pauseProcessing();
      this.lineMeshIndex++;
    }
  }

  renderLineMode(scene) {
    let that = this;
    let lastUpdate = Date.now();
    let runComplete = false;
    let meshIndex = this.lineMeshIndex;
    this.gcodeLineIndex.push(new Array());

    this.renderMode = 'Line Rendering';
    //Extrusion
    let lineArray = [];
    let colorArray = [];
    if (this.debug) {
      console.log(this.lines[0]);
    }

    let transparentValue = this.lineVertexAlpha ? this.materialTransparency : 1;

    for (var lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
      let line = this.lines[lineIdx];
      this.gcodeLineIndex[meshIndex].push(line.gcodeLineNumber);
      let data = line.getPoints(scene);


      if (this.liveTracking) {
        data.colors[0].a = this.liveTrackingShowSolid ? transparentValue : 0
        data.colors[1].a = this.liveTrackingShowSolid ? transparentValue : 0;
      } else {
        data.colors[0].a = transparentValue;
        data.colors[1].a = transparentValue;
      }

      lineArray.push(data.points);
      colorArray.push(data.colors);
    }

    let lineMesh = MeshBuilder.CreateLineSystem(
      'm ' + this.lineMeshIndex,
      {
        lines: lineArray,
        colors: colorArray,
        updatable: true,
      },
      scene
    );

    lineArray = null;
    colorArray = null;

    lineMesh.isVisible = true;
    lineMesh.isPickable = false;
    lineMesh.markVerticesDataAsUpdatable(VertexBuffer.ColorKind);
    lineMesh.material = new StandardMaterial("m", scene);
    lineMesh.material.backFaceCulling = true;
    lineMesh.material.forceDepthWrite = true;
    lineMesh.alphaIndex =  meshIndex;
    lineMesh.renderingGroupId = 2;



    let lastRendered = 0;

    let beforeRenderFunc = function () {

      if (!that.liveTracking && !runComplete && !(that.gcodeFilePosition && lastRendered >= that.gcodeLineIndex[meshIndex].length - 1)) {
        return;
      } else if (Date.now() - lastUpdate < that.refreshTime) {
        return;
      } else {
        lastUpdate = Date.now();

        var colorData = lineMesh.getVerticesData(VertexBuffer.ColorKind);

        if (colorData === null || colorData === undefined) {
          console.log('Failed to Load Color VBO');
          return;
        }

        let renderTo = -1;
        let renderAhead = -1;
        for (var renderToIdx = lastRendered; renderToIdx < that.gcodeLineIndex[meshIndex].length; renderToIdx++) {
          if (that.gcodeLineIndex[meshIndex][renderToIdx] <= that.gcodeFilePosition) {
            renderTo = renderToIdx;
          }
          if (that.gcodeLineIndex[meshIndex][renderToIdx] <= that.gcodeFilePosition + that.lookAheadLength) {
            renderAhead = renderToIdx;
          }
        }

        for (let colorIdx = lastRendered; colorIdx < renderTo; colorIdx++) {
          let index = colorIdx * 8;
          colorData[index] = that.progressColor.r;
          colorData[index + 1] = that.progressColor.g;
          colorData[index + 2] = that.progressColor.b;
          colorData[index + 3] = that.progressColor.a;
          colorData[index + 4] = that.progressColor.r;
          colorData[index + 5] = that.progressColor.g;
          colorData[index + 6] = that.progressColor.b;
          colorData[index + 7] = that.progressColor.a;
        }

        //render ahead
        for (let renderAheadIdx = renderTo; renderAheadIdx < renderAhead; renderAheadIdx++) {
          let index = renderAheadIdx * 8;
          colorData[index + 3] = 1;
          colorData[index + 7] = 1;
        }

        lastRendered = renderTo;
        lineMesh.updateVerticesData(VertexBuffer.ColorKind, colorData, true);
        if (that.gcodeFilePosition === Number.MAX_VALUE) {
          runComplete = true;
        }
      }
    };

    this.renderFuncs.push(beforeRenderFunc);
    scene.registerBeforeRender(beforeRenderFunc);
  }

  renderBlockMode(scene) {
    let that = this;
    let lastUpdate = Date.now();
    let runComplete = false;
    let meshIndex = this.lineMeshIndex;
    this.gcodeLineIndex.push(new Array());

    var layerHeight = Math.floor((this.currentLayerHeight - this.previousLayerHeight) * 100) / 100;

    if (this.spreadLines) {
      layerHeight /= this.spreadLineAmount;
    }

    this.renderMode = 'Mesh Rendering';
    var box = MeshBuilder.CreateBox('box', { width: 1, height: layerHeight, depth: layerHeight * 1.2 }, scene);

    let l = this.lines;

    this.gcodeLineIndex.push(new Array());

    let particleBuilder = function (particle, i, s) {
      l[s].renderLineV3(particle, that.lineVertexAlpha || (that.liveTracking && !that.liveTrackingShowSolid));
      that.gcodeLineIndex[meshIndex].push(particle.props.gcodeLineNumber);
    };

    let sps = new SolidParticleSystem('gcodemodel' + meshIndex, scene, {
      updatable: true,
      enableMultiMaterial: true,
      useVertexAlpha: true
    });

    sps.addShape(box, this.lines.length, {
      positionFunction: particleBuilder,
    });

    sps.buildMesh();


    let transparentValue = this.lineVertexAlpha ? this.materialTransparency : 1;
    if (this.liveTracking) {
      transparentValue = this.liveTrackingShowSolid ? transparentValue : 0
    }

    //Build out solid and transparent material.
    let solidMat = new StandardMaterial('solidMaterial', scene);
    solidMat.specularColor = this.specularColor;
    let transparentMat = new StandardMaterial('transparentMaterial', scene);
    transparentMat.specularColor = this.specularColor;
    transparentMat.alpha = this.liveTrackingShowSolid ? this.materialTransparency : transparentValue;
    transparentMat.needAlphaTesting = () => true;
    transparentMat.separateCullingPass = true;
    transparentMat.backFaceCulling = true;

    sps.setMultiMaterial([solidMat, transparentMat]);
    sps.setParticles();
    sps.computeSubMeshes();
    sps.mesh.alphaIndex = 0; // this.lineMeshIndex; //meshIndex;
    sps.mesh.isPickable = false;
    sps.mesh.doNotSyncBoundingInfo = true;

    sps.updateParticle = function (particle) {
      if (that.gcodeLineIndex[meshIndex][particle.idx] < that.gcodeFilePosition) {
        particle.color = that.progressColor;
        particle.materialIndex = 0;
      } else if (that.gcodeLineIndex[meshIndex][particle.idx] < that.gcodeFilePosition + that.lookAheadLength) {
        particle.color = new Color4(particle.color.r, particle.color.g, particle.color.b, 1);
        particle.materialIndex = 0;
      } else {
        particle.color = new Color4(particle.color.r, particle.color.g, particle.color.b, 0);
      }
    };

    let beforeRenderFunc = function () {
      if (that.liveTracking && !runComplete) {
        if (Date.now() - lastUpdate < that.refreshTime) {
          return;
        } else {
          lastUpdate = Date.now();
          sps.setParticles();
          sps.computeSubMeshes();
        }
        if (that.gcodeFilePosition === Number.MAX_VALUE) {
          runComplete = true;
        }
      }
    };

    this.renderFuncs.push(beforeRenderFunc);
    scene.registerBeforeRender(beforeRenderFunc);
    this.scene.clearCachedVertexData();
  }

  renderPointMode(scene) {
    let meshIndex = this.lineMeshIndex;
    this.gcodeLineIndex.push(new Array());
    //point cloud
    this.sps = new PointsCloudSystem('pcs' + meshIndex, 1, scene);

    let l = this.lines;

    let particleBuilder = function (particle, i, s) {
      l[s].renderParticle(particle);
    };

    this.sps.addPoints(this.lines.length, particleBuilder);

    this.sps.buildMeshAsync().then((mesh) => {
      mesh.material.pointSize = 2;
    });
  }

  createScene(scene) {
    if (this.renderVersion === RenderMode.Line) {
      this.renderLineMode(scene);
    } else if (this.renderVersion === RenderMode.Block) {
      this.renderBlockMode(scene);
    } else if (this.renderVersion === RenderMode.Point) {
      this.renderPointMode(scene);
    }

    this.lines = [];

    this.scene.render();
  }

  createTravelLines(scene) {
    //Travels
    var travelArray = [];
    var travelColorArray = [];
    for (var travelIdx = 0; travelIdx < this.travels.length; travelIdx++) {
      let line = this.travels[travelIdx];
      let data = line.getPoints(scene);
      travelArray.push(data.points);
      travelColorArray.push(data.colors);
    }
    var travelMesh = MeshBuilder.CreateLineSystem(
      'travels',
      {
        lines: travelArray,
        colors: travelColorArray,
        updatable: false,
        useVertexAlpha: false,
      },
      scene
    );
    travelMesh.isVisible = false;
    this.travels = []; //clear out the travel array after creating the mesh
  }
  updateFilePosition(filePosition) {
    if (this.liveTracking) {
      this.gcodeFilePosition = filePosition - 1;
    } else {
      this.gcodeFilePosition = 0;
    }
  }
  doFinalPass() {
    this.liveTracking = true;
    this.gcodeFilePosition = Number.MAX_VALUE;
    setTimeout(() => {
      this.liveTracking = false;
    }, this.refreshTime + 200);
  }

  updateMesh() {
    if (this.renderVersion === 1) {
      console.log('Version 1');
    } else if (this.renderVersion === 2) {
      console.log('Version 2');
    }
  }
  unregisterEvents() {
    for (let idx = 0; idx < this.renderFuncs.length; idx++) {
      this.scene.unregisterBeforeRender(this.renderFuncs[idx]);
    }
    this.renderFuncs = [];
  }
  setLiveTracking(enabled) {
    this.liveTracking = enabled;
  }

  setColorMode(mode) {
    if (!mode) {
      this.colorMode = ColorMode.Color;
    }
    localStorage.setItem('processorColorMode', mode);
    this.colorMode = mode;
  }
  updateMinFeedColor(value) {
    localStorage.setItem('minFeedColor', value);
    this.minFeedColorString = value;
    this.minFeedColor = Color4.FromHexString(value.padEnd(9, 'F'));
  }
  updateMaxFeedColor(value) {
    localStorage.setItem('maxFeedColor', value);
    this.maxFeedColorString = value;

    this.maxFeedColor = Color4.FromHexString(value.padEnd(9, 'F'));
  }

  updateColorRate(min, max) {
    localStorage.setItem('minColorRate', min);
    localStorage.setItem('maxColorRate', max);
    this.minColorRate = min;
    this.maxColorRate = max;
  }

  updateForceWireMode(enabled) {
    this.forceWireMode = enabled;
    localStorage.setItem('forceWireMode', enabled);
  }

  setLiveTrackingShowSolid(value) {
    this.liveTrackingShowSolid = value;
    localStorage.setItem('showSolid', value);
  }

}
