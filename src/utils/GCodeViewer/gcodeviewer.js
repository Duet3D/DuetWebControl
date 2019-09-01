function gcode_viewer(canvas){
  this.canvas;
  var that = this;
  if(canvas === undefined || canvas === null){
    $('body').append(
      '<div id="GCodeViewer" style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:#FF0000;z-index:1">'
      + '<canvas style="position:absolute;width:100%;height:100%" id="3DCanvas"></canvas>'
      + '<button id="CloseViewer" class="btn_add_tool" style="position:absolute;top:0;right:0">Close</button>'
      + '<div id="FileProgress" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%)">Loading...</br>'
        + '<div class="progress"  style="width: 200px;height:20px">'
          + '<div id="FileProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">'
          +'</div>'
        +'</div>'
      +'</div>'
    + '</div>');
    this.canvas = $('#3DCanvas')[0];
    $('#CloseViewer').click(function() {
      $('#GCodeViewer').remove();
      that.scene.dispose(); //Clean up when the window is closed.
    });
  }
  else{
    this.canvas = canvas;
  }
  console.log(this.canvas);

  this.engine;
  this.scene;
  this.gcodeProcessor  = new processor();
  this.orbitCamera;
  this.flyCamera;

}

gcode_viewer.prototype.setProgress = function(percent){
  $('#FileProgressBar').attr('aria-valuenow', percent);
  $('#FileProgressBar').css('width', percent + "%");
}
gcode_viewer.prototype.hideProgress = function(){
  $("#FileProgress").hide();
}

gcode_viewer.prototype.setCameraType = function(arcRotate){
  if(arcRotate){
    scene.activeCamera = this.orbitCamera;
    }
  else{
    scene.activeCamera = this.flyCamera;
  }
}

gcode_viewer.prototype.init = function(){
  this.engine = new BABYLON.Engine(this.canvas, true);
  this.scene = new BABYLON.Scene(this.engine);
      // Add a camera to the scene and attach it to the canvas
     this.orbitCamera = new BABYLON.ArcRotateCamera("Camera", Math.PI/2, 2.356194 ,-250, new BABYLON.Vector3(117.5,0,117.5), this.scene);
     this.flyCamera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, -10),this.scene);
     this.orbitCamera.attachControl(this.canvas, true);

     // Add lights to the scene
     var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0),this.scene);
     var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1),this.scene);
     var that = this;
    this.engine.runRenderLoop(function() {
      that.scene.render();
    });

    //Render the corner axis
    this.showWorldAxis(50);
	/*
    var buildPlatePlane = BABYLON.MeshBuilder.CreatePlane("BuildPlate", {width:235, height:235}, scene);
    buildPlatePlane.rotationQuaternion = new BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1,0,0), Math.PI / 2);
    buildPlatePlane.translate(new BABYLON.Vector3(117.5,0,117.5), 1, BABYLON.Space.WORLD);
*/
     window.addEventListener("resize", function () {
        that.engine.resize();
      });
}

gcode_viewer.prototype.processFile = function(fileContents){
  this.gcodeProcessor.processGcodeFile(fileContents);
  this.gcodeProcessor.createScene(this.scene);
}


gcode_viewer.prototype.toggleTravels = function(){
  var mesh =this.scene.getMeshByName("travels");
  if(mesh !== undefined){
    mesh.isVisible = !mesh.isVisible;
  }
}



gcode_viewer.prototype.showWorldAxis = function(size) {
    var makeTextPlane = function(text, color, size) {
        var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
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
      ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    var axisY = BABYLON.Mesh.CreateLines("axisY", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0),
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
        ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var yChar = makeTextPlane("Z", "green", size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
        ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    var zChar = makeTextPlane("Y", "blue", size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
};
