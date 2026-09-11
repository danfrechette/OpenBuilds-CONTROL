// Global Vars
var scene = true;
var camera, renderer;
var projector, mouseVector, containerWidth, containerHeight;
var raycaster = new THREE.Raycaster();
var gridsystem = new THREE.Group();

var container, stats;
var controls, control, gridsystem, helper;
var clock = new THREE.Clock();

var marker;

// Split-view coordinate picker state.
var coordinateMode = null;
var coordinatePickButton;
var coordinateJogButton;
var coordinateCancelButton;

var coordinatePickMarker;
var coordinateReadout;
var sizexmax;
var sizeymax;
var lineincrement = 50
var cameraXYZoomFactor = 1.0;
var camvideo;
var objectsInScene = []; //array that holds all objects we added to the scene.
var clearSceneFlag = false;

var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
var canvas = !!window.CanvasRenderingContext2D;

// pause Animation when we loose webgl context focus
var pauseAnimation = false;

var size = new THREE.Vector3();

var sky;

var workspace = new THREE.Group();
workspace.name = "Workspace"

var ground;

containerWidth = window.innerWidth;
containerHeight = window.innerHeight;

var animationLoopTimeout;

var xmin = 0,
  xmax = 307,
  ymin = 0,
  ymax = 207

var machineCoordinateSpace = false;

var viewerMode = "3d";
var saved3DView = null;
var cameraXZ;
var depthLabel;

function drawWorkspace(xmin, xmax, ymin, ymax) {

  if (!xmin) xmin = 0;
  if (!ymin) ymin = 0;
  if (!xmax) xmax = 307
  if (!ymax) ymax = 207

  var sceneLights = new THREE.Group();

  var light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(0, 2, 25).normalize();
  light.name = "Light1;"
  sceneLights.add(light);

  var light2 = new THREE.DirectionalLight(0xffffff);
  light2.name = "Light2"
  light2.position.set(-500, -500, 1).normalize();
  sceneLights.add(light2);

  dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  var d = 50;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = -0.0001;
  dirLight.name = "dirLight;"
  sceneLights.add(dirLight);

  hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.color.setHSL(Theme.HEMI_LIGHT_COLOR.H, Theme.HEMI_LIGHT_COLOR.S, Theme.HEMI_LIGHT_COLOR.L);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  hemiLight.visible = false;
  hemiLight.name = "hemiLight"
  sceneLights.add(hemiLight);
  // if (helper) {
  //     workspace.remove(helper);
  // }
  sceneLights.name = "Scene Lights"
  workspace.add(sceneLights);

  scene.fog = new THREE.Fog(0xffffff, 1, 20000);

  // SKYDOME
  if (!disable3Dskybox) {
    var uniforms = {
      topColor: {
        value: new THREE.Color(Theme.SKY_TOP_COLOR)
      },
      bottomColor: {
        value: new THREE.Color(Theme.SKY_BOTTOM_COLOR)
      },
      offset: {
        value: -63
      },
      exponent: {
        value: 0.71
      }
    };

    uniforms.topColor.value.copy(hemiLight.color);
    scene.fog.color.copy(uniforms.bottomColor.value);

    var vertexShader = document.getElementById('vertexShader').textContent;
    var fragmentShader = document.getElementById('fragmentShader').textContent;

    var skyGeo = new THREE.SphereGeometry(9900, 64, 15);
    var skyMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: THREE.DoubleSide
    });

    sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = "Skydome"
    workspace.add(sky);
  }

  if (!disable3Drealtimepos) {
    var coneGeo = new THREE.CylinderGeometry(0, 5, 40, 15, 1, false)
    coneGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, -20, 0));

    cone = new THREE.Mesh(coneGeo, new THREE.MeshLambertMaterial({
      color: 0x0000ff,
      specular: 0x0000ff,
      shininess: 00
    }));

    cone.overdraw = true;
    cone.rotation.x = -90 * Math.PI / 180;
    cone.position.x = 0;
    cone.position.y = 0;
    cone.position.z = 0;
    cone.material.opacity = 0.6;
    cone.material.transparent = true;
    cone.castShadow = false;
    cone.visible = true;
    cone.name = "Simulation Marker"
    workspace.add(cone)

  }
  gridsystem.name = "Grid System"
    workspace.add(gridsystem)
  if (localStorage.getItem('unitsMode')) {
    if (localStorage.getItem('unitsMode') == "in") {
      redrawGrid(xmin / 25.4, xmax / 25.4, ymin / 25.4, ymax / 25.4, true);
    } else {
      redrawGrid(xmin, xmax, ymin, ymax, false);
    }
  }
  scene.add(workspace)
}

function redrawGrid(xmin, xmax, ymin, ymax, inches) {
  // console.log(xmin, xmax, ymin, ymax, inches)
  if (inches) {
    xmin = Math.floor(xmin * 25.4);
    xmax = Math.ceil(xmax * 25.4);
    ymin = Math.floor(ymin * 25.4);
    ymax = Math.ceil(ymax * 25.4);
  } else {
    xmin = Math.floor(xmin);
    xmax = Math.ceil(xmax);
    ymin = Math.floor(ymin);
    ymax = Math.ceil(ymax);
  }
  // console.log(xmin, xmax, ymin, ymax, inches)

  sizexmax = xmax;
  sizeymax = ymax;

  if (!xmax) {
    xmax = 200;
  };

  if (!ymax) {
    ymax = 200;
  };

  var grid = new THREE.Group();

  var axesgrp = new THREE.Object3D();
  axesgrp.name = "Axes Markers"

  if (inches) {
    var unitsval = "in"
    var offset = 5 * 2.54
  } else {
    var unitsval = "mm"
    var offset = 5
    var size = 5
  }

  // add axes labels
  var xlbl = this.makeSprite(this.scene, "webgl", {
    x: parseInt(xmax) + offset,
    y: 0,
    z: 0,
    text: "X",
    color: Theme.X_RULER_LABEL_COLOR,
    size: size
  });
  var ylbl = this.makeSprite(this.scene, "webgl", {
    x: 0,
    y: parseInt(ymax) + offset,
    z: 0,
    text: "Y",
    color: Theme.Y_RULER_LABEL_COLOR,
    size: size
  });


  axesgrp.add(xlbl);
  axesgrp.add(ylbl);

  var materialX = new THREE.LineBasicMaterial({
    color: Theme.X_AXIS_LINE_COLOR
  });

  var materialY = new THREE.LineBasicMaterial({
    color: Theme.Y_AXIS_LINE_COLOR
  });

  var geometryX = new THREE.Geometry();
  geometryX.vertices.push(
    new THREE.Vector3(-0.1, 0, 0),
    new THREE.Vector3(-0.1, (ymax), 0)
  );

  var geometryY = new THREE.Geometry();
  geometryY.vertices.push(
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3((xmax), -0.1, 0)
  );

  var line1 = new THREE.Line(geometryX, materialY);
  var line2 = new THREE.Line(geometryY, materialX);
  axesgrp.add(line1);
  axesgrp.add(line2);

  // if (inches) {
  //   axesgrp.scale.multiplyScalar(2.5);
  // }

  grid.add(axesgrp);

  var step10 = 10;
  var step100 = 100;
  if (inches) {
    step10 = 2.54;
    step100 = 25.4;
  }
  helper = new THREE.GridHelper(xmin, xmax, ymin, ymax, step10, Theme.GRID_STEP_10_COLOR);
  helper.position.y = 0;
  helper.position.x = 0;
  helper.position.z = 0;
  helper.material.opacity = Theme.GRID_STEP_10_OPACITY;
  helper.material.transparent = true;
  helper.receiveShadow = false;
  helper.name = "GridHelper10mm"
  grid.add(helper);
  helper = new THREE.GridHelper(xmin, xmax, ymin, ymax, step100, Theme.GRID_STEP_100_COLOR);
  helper.position.y = 0;
  helper.position.x = 0;
  helper.position.z = 0;
  helper.material.opacity = Theme.GRID_STEP_100_OPACITY;
  helper.material.transparent = true;
  helper.receiveShadow = false;
  helper.name = "GridHelper50mm"
  grid.add(helper);
  grid.name = "Grid"

  gridsystem.children.length = 0
  if (inches) {
    var ruler = drawRulerInches(xmin, xmax, ymin, ymax, inches)
  } else {
    var ruler = drawRuler(xmin, xmax, ymin, ymax, inches)
  }
  gridsystem.add(grid);
  gridsystem.add(ruler);

}

function setBullseyePosition(x, y, z) {
  //console.log('Set Position: ', x, y, z)
  if (x) {
    bullseye.position.x = parseInt(x, 10);
  };
  if (y) {
    bullseye.position.y = parseInt(y, 10);
  };
  if (z) {
    bullseye.position.z = (parseInt(z, 10) + 0.1);
  };
}

function init3D() {

  if (webgl) {
    // console.log('WebGL Support found! success: this application will work optimally on this device!');
    printLog("<span class='fg-darkRed'>[ 3D Viewer ] </span><span class='fg-green'>WebGL Support found! success: this application will work optimally on this device!</span>")
    renderer = new THREE.WebGLRenderer({
      autoClearColor: true,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true
    });
    // ThreeJS Render/Control/Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.z = 295;
    //cameraXZ = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
    cameraXZ = new THREE.OrthographicCamera(-50, 50, 100, -100, 1, 1000);
    cameraXY = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 20000);

    $('#renderArea').append(renderer.domElement);

    // ========================================================
    // ADDED: 2D Orthographic Zoom Event Listener
    // ========================================================
    renderer.domElement.addEventListener('wheel', function(event) {
      if (viewerMode === "2d") {
        // Stop the default browser scroll and background OrbitControls zooms
        event.preventDefault();
        event.stopPropagation();

        // Determine zoom scale based on wheel spin direction
        var zoomDelta = event.deltaY > 0 ? 1.1 : 0.9;
        cameraXYZoomFactor *= zoomDelta;

        // Apply clamping limits so the user can't zoom into infinity
        cameraXYZoomFactor = Math.max(0.05, Math.min(cameraXYZoomFactor, 25.0));

        // Fire a render pass to visually apply the update instantly
        if (typeof performRender === "function") {
            performRender();
        }
      }
    }, { passive: false });
    // ========================================================

    renderer.setClearColor(0xffffff, 1); // Background color of viewer = transparent
    // renderer.setSize(window.innerWidth - 10, window.innerHeight - 10);
    renderer.clear();

    sceneWidth = document.getElementById("renderArea").offsetWidth,
      sceneHeight = document.getElementById("renderArea").offsetHeight;
    camera.aspect = sceneWidth / sceneHeight;
    renderer.setSize(sceneWidth, sceneHeight)
    camera.updateProjectionMatrix();


    if (!disable3Dcontrols) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0); // view direction perpendicular to XY-plane

      if (!isMac) {
        controls.mouseButtons = {
          ORBIT: THREE.MOUSE.MIDDLE,
          ZOOM: false,
          PAN: THREE.MOUSE.RIGHT
        };
      }
      controls.enableRotate = true;
      controls.enableZoom = true; // optional
      controls.maxDistance = 8000; // limit max zoom out
      controls.enableKeys = false; // Disable Keyboard on canvas
    }

    // Coordinate picker support
    createCoordinatePickerUI();
    updateCoordinateButtonTheme();
    installSplitViewInputGuard();
    hideCoordinatePickerUI();


    //drawWorkspace(xmin, xmax, ymin, ymax)
    drawWorkspace(xmin, xmax, ymin, ymax);

    // Picking stuff
    projector = new THREE.Projector();
    mouseVector = new THREE.Vector3();
    raycaster.linePrecision = 1

    setTimeout(function() {
      set3DView();
      resetView();
      animate();
    }, 200);
    updateViewerModeTabs();

  } else {
    console.log('No WebGL Support found on this computer! Disabled 3D Viewer - Sorry!');
    printLog("<span class='fg-darkRed'>[ ERROR ]</span>  <span class='fg-darkRed'>No WebGL Support found on this computer! Disabled 3D Viewer - Sorry!</span>")
    printLog("<span class='fg-darkRed'>[ ERROR ]</span>  <span class='fg-darkRed'>" + getWebGLErrorMessage() + "</span>")
    $('#gcodeviewertab').hide()
    $('#consoletab').click()
    return false;
  };

}

function updateSplitCameraAspect(width, height) {
    var rightWidth = 140;
    var aspectZ = rightWidth / height;

    if (cameraZ) {
        cameraZ.aspect = aspectZ;
        cameraZ.updateProjectionMatrix();
    }

    // UPDATE THIS: Adjust orthographic bounds for cameraXY to prevent stretching
    if (cameraXY && cameraXY.isOrthographicCamera) {
        var leftWidth = width - rightWidth;

        // Choose a view factor/frustum size (adjust this number to change default zoom level)
        var viewSize = 300;
        var aspectXY = leftWidth / height;

        cameraXY.left = -viewSize * aspectXY / 2;
        cameraXY.right = viewSize * aspectXY / 2;
        cameraXY.top = viewSize / 2;
        cameraXY.bottom = -viewSize / 2;

        cameraXY.updateProjectionMatrix();
    }
}

function syncSplitCameras() {
  if (!cameraXY || !cameraZ) return;

  var target = (!disable3Dcontrols && controls) ? controls.target : new THREE.Vector3(0, 0, 0);

  // ==========================================
  // PANE 1: LEFT VIEWPORT (Pure Orthographic XY Plane)
  // ==========================================
  var distance = Math.max(10, camera.position.distanceTo(target));

  // REMOVED: cameraXY.fov = camera.fov (Not used in Orthographic)

  cameraXY.position.set(target.x, target.y, target.z + distance);
  cameraXY.up.set(0, 1, 0);
  cameraXY.lookAt(target);

  // Slicing logic remains identical
  var cursorDepthZ = 0;
  if (typeof cone !== 'undefined' && cone && cone.position) {
    cursorDepthZ = cone.position.z;
  }

  var totalSliceThickness = 2.0;
  var halfThickness = totalSliceThickness / 2;
  var distanceToCursorZ = cameraXY.position.z - cursorDepthZ;

  cameraXY.near = Math.max(0.1, distanceToCursorZ - halfThickness);
  cameraXY.far = distanceToCursorZ + halfThickness;

  cameraXY.updateProjectionMatrix();
  cameraXY.updateMatrixWorld();

  // ==========================================
  // PANE 2: RIGHT VIEWPORT (XZ Depth Profile - Kept Same)
  // ==========================================
  var depthTarget = target.clone();
  if (typeof cone !== 'undefined' && cone && cone.position) {
    depthTarget.x = cone.position.x;
    depthTarget.z = cone.position.z;
  }

  var depthDistance = 1000;
  cameraZ.position.set(depthTarget.x, 0 - depthDistance, depthTarget.z);
  cameraZ.up.set(0, 0, 1);
  cameraZ.lookAt(new THREE.Vector3(depthTarget.x, 0, depthTarget.z));

  cameraZ.near = -2000;
  cameraZ.far = 2000;

  cameraZ.updateProjectionMatrix();
  cameraZ.updateMatrixWorld();
}


function renderSplitView() {
  var width = renderer.domElement.clientWidth;
  var height = renderer.domElement.clientHeight;
  
  var rightWidth = 140;
  var leftWidth = width - rightWidth;

  updateSplitCameraAspect(width, height);
  syncSplitCameras();

  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, leftWidth, height);
  renderer.setScissor(0, 0, leftWidth, height);
  renderer.render(scene, cameraXY);

  renderer.setViewport(leftWidth, 0, rightWidth, height);
  renderer.setScissor(leftWidth, 0, rightWidth, height);
  renderer.render(scene, cameraZ);
  renderer.setScissorTest(false);
}

function createCoordinatePickerUI() {
  var renderArea = document.getElementById('renderArea');
  if (!renderArea || coordinatePickButton) return;

  if (window.getComputedStyle(renderArea).position === 'static') { renderArea.style.position = 'relative'; }

  coordinatePickButton = document.createElement('button');
  coordinatePickButton.type = 'button';
  coordinatePickButton.id = 'coordinatePickButton';
  coordinatePickButton.title = 'Select an XY coordinate';
  coordinatePickButton.setAttribute('aria-label', 'Select an XY coordinate');
  coordinatePickButton.innerHTML = '&#8982;';
  coordinatePickButton.style.cssText = [
    'position:absolute', 'left:12px', 'top:12px', 'z-index:20',
    'width:38px', 'height:38px', 'padding:0', 'border:1px solid #666',
    'border-radius:4px', 'background:#ffffff', 'color:#222',
    'font-size:25px', 'line-height:34px', 'cursor:pointer',
    'box-shadow:0 1px 4px rgba(0,0,0,.35)'
  ].join(';');
  coordinatePickButton.addEventListener('click', enableCoordinatePick);
  renderArea.appendChild(coordinatePickButton);

  coordinateJogButton = document.createElement('button');
  coordinateJogButton.type = 'button';
  coordinateJogButton.id = 'coordinateJogButton';
  coordinateJogButton.title = 'Jog to an XY coordinate';
  coordinateJogButton.setAttribute('aria-label', 'Jog to an XY coordinate');
  coordinateJogButton.innerHTML = '&#128205;';
  coordinateJogButton.style.cssText = [
    'position:absolute', 'left:12px', 'top:60px', 'z-index:20',
    'width:38px', 'height:38px', 'padding:0', 'border:1px solid #666',
    'border-radius:4px', 'background:#ffffff', 'color:#222',
    'font-size:20px', 'line-height:34px', 'cursor:pointer',
    'box-shadow:0 1px 4px rgba(0,0,0,.35)'
  ].join(';');
  coordinateJogButton.addEventListener('click', enableCoordinateJog);
  renderArea.appendChild(coordinateJogButton);

  coordinateCancelButton = document.createElement('button');
  coordinateCancelButton.type = 'button';
  coordinateCancelButton.id = 'coordinateCancelButton';
  coordinateCancelButton.innerHTML = '?';
  coordinateCancelButton.title = 'Cancel';
  coordinateCancelButton.style.cssText = [
    'position:absolute','left:12px','top:108px','z-index:20',
    'width:38px','height:38px','padding:0','border:1px solid #666',
    'border-radius:4px','background:#ffffff','color:#222',
    'font-size:18px','cursor:pointer',
    'box-shadow:0 1px 4px rgba(0,0,0,.35)'
  ].join(';');
  coordinateCancelButton.addEventListener('click',cancelCoordinateMode);
  renderArea.appendChild(coordinateCancelButton);

  coordinateReadout = document.createElement('div');
  coordinateReadout.id = 'coordinateReadout';
  coordinateReadout.textContent = 'XY view';
  coordinateReadout.style.cssText = [
    'position:absolute', 'left:60px', 'top:17px', 'z-index:19',
    'padding:4px 8px', 'border-radius:3px', 'background:rgba(255,255,255,.88)',
    'color:#222', 'font:12px Arial,sans-serif', 'pointer-events:none'
  ].join(';');
  renderArea.appendChild(coordinateReadout);

  //  var depthLabel = document.createElement('div');
  depthLabel = document.createElement('div');

  depthLabel.textContent = 'XZ depth view';
  depthLabel.style.cssText = [
    'position:absolute', 'right:12px', 'top:17px', 'z-index:19',
    'padding:4px 8px', 'border-radius:3px', 'background:rgba(255,255,255,.88)',
    'color:#222', 'font:12px Arial,sans-serif', 'pointer-events:none'
  ].join(';');
  renderArea.appendChild(depthLabel);

  renderer.domElement.addEventListener('click', onCoordinateGridClick, false);
}

function enableCoordinatePick(event) {

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    coordinateMode = "pick";

    coordinatePickButton.style.background = '#d9edf7';
    coordinateJogButton.style.background = '#ffffff';

    if (!disable3Dcontrols && controls) {
        controls.enabled = false;
    }

    renderer.domElement.style.cursor = 'crosshair';

    coordinateReadout.textContent =
        'Click a point in the XY view';
}

function enableCoordinateJog(event) {

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    coordinateMode = "jog";

    coordinatePickButton.style.background = '#ffffff';
    coordinateJogButton.style.background = '#d9edf7';

    if (!disable3Dcontrols && controls) {
        controls.enabled = false;
    }

    renderer.domElement.style.cursor = 'crosshair';

    coordinateReadout.textContent =
        'Click a point to jog to';
}

function disableCoordinatePick() {
  coordinateMode = null;
  if (!disable3Dcontrols && controls) controls.enabled = true;
  renderer.domElement.style.cursor = '';

  if (coordinatePickButton) {
    coordinatePickButton.style.background = '#ffffff';
  }

  if (coordinateJogButton) {
    coordinateJogButton.style.background = '#ffffff';
  }
}

function onCoordinateGridClick(event) {

  if (coordinateMode === null || viewerMode !== "2d") { return; }

  var rect = renderer.domElement.getBoundingClientRect();

  var localX = event.clientX - rect.left;
  var localY = event.clientY - rect.top;

  var rightWidth = 100;
  var rightMargin = 100;
  var leftWidth = rect.width - (rightWidth + rightMargin);

  if (
    localX < 0 ||
    localX >= leftWidth ||
    localY < 0 ||
    localY >= rect.height
  ) {
    return;
  }

  var mouse = new THREE.Vector2(
    (localX / leftWidth) * 2 - 1,
    -(localY / rect.height) * 2 + 1
  );

  cameraXY.updateProjectionMatrix();
  cameraXY.updateMatrixWorld(true);

  raycaster.setFromCamera(mouse, cameraXY);

  var xyPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, 1),
    0
  );

  var point = new THREE.Vector3();

  if (!raycaster.ray.intersectPlane(xyPlane, point)) {
    return;
  }

  /*
   * Select the appropriate snapping increment.
   *
   * Metric: 5 mm
   * Inch:   1/8 inch, stored internally as 3.175 mm
   */
  var increment;

  if (localStorage.getItem("unitsMode") === "in") {
    increment = 25.4 / 8;
  } else {
    increment = 5;
  }

  var xRounded = Math.round(point.x / increment) * increment;
  var yRounded = Math.round(point.y / increment) * increment;

  /*
   * Avoid displaying negative zero.
   */
  if (Math.abs(xRounded) < 0.0005) xRounded = 0;
  if (Math.abs(yRounded) < 0.0005) yRounded = 0;

  /*
   * Create the red marker once.
   */
  if (!coordinatePickMarker) {
    coordinatePickMarker = new THREE.Mesh(
      new THREE.SphereGeometry(2, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        depthTest: false
      })
    );

    coordinatePickMarker.name = "Selected XY Coordinate";
    coordinatePickMarker.renderOrder = 999;

    scene.add(coordinatePickMarker);
  }

  /*
   * Put the marker at the rounded coordinate, not the original
   * unsnapped mouse coordinate.
   */
  coordinatePickMarker.position.set(
    xRounded,
    yRounded,
    0.2
  );

  coordinatePickMarker.visible = true;

  var xText = xRounded.toFixed(3);
  var yText = yRounded.toFixed(3);

  switch (coordinateMode){
    case "pick":
      coordinateReadout.textContent ="X: " + xText + "  Y: " + yText;
      window.alert( "Selected coordinate\n" + "X: " + xText + "\n" + "Y: " + yText );
      coordinatePickMarker.visible = false;
      break;
    case "jog":
      jogToCoordinate(xRounded, yRounded);
      coordinatePickMarker.visible = false;
      break;
    default:
      console.log("No mode selected");
      break;
  }
  
  disableCoordinatePick();

  if (typeof performRender === "function") {
    performRender();
  }
}

function cancelCoordinateMode() {
  coordinateMode = null;   
  if (coordinatePickMarker) {
    coordinatePickMarker.visible = false;
  }
  
  if (!disable3Dcontrols && controls) {
      controls.enabled = true;
  }

  renderer.domElement.style.cursor = '';

  coordinatePickButton.style.background = '#ffffff';
  coordinateJogButton.style.background = '#ffffff';

  coordinateReadout.textContent = 'XY view';
}

function installSplitViewInputGuard() {
  var canvas = renderer.domElement;

  function isRightViewport(event) {
    var rect = canvas.getBoundingClientRect();
    var clientX = event.clientX;
    if (event.touches && event.touches.length) clientX = event.touches[0].clientX;
    return clientX >= rect.right - 140;
  }

  function blockRightViewportInput(event) {
    if (isRightViewport(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  // Capture phase prevents OrbitControls from receiving right-side input.
  canvas.addEventListener('pointerdown', blockRightViewportInput, true);
  canvas.addEventListener('mousedown', blockRightViewportInput, true);
  // canvas.addEventListener('wheel', blockRightViewportInput, { capture: true, passive: false });
  canvas.addEventListener('touchstart', blockRightViewportInput, { capture: true, passive: false });

}

function animate() {
  if (!pauseAnimation) {
    camera.updateMatrixWorld();
    simAnimate()
    toolAnimate();

    if (clearSceneFlag) {
      while (scene.children.length > 1) {
        scene.remove(scene.children[1])
      }

      if (object) scene.add(object)
      if (coordinatePickMarker) scene.add(coordinatePickMarker)

      clearSceneFlag = false;
    }

    animationLoopTimeout = setTimeout(function() {
      requestAnimationFrame(animate);
    }, 60);

    //renderer.render(scene, camera);
    performRender();
  }
}

function viewExtents(objecttosee) {
  if (!disable3Dcontrols) {
    // console.log("viewExtents. object:", objecttosee);
    // console.log("controls:", controls);
    //wakeAnimate();

    // lets override the bounding box with a newly
    // generated one
    // get its bounding box
    if (objecttosee) {
      // console.log(objecttosee)
      var helper = new THREE.BoxHelper(objecttosee);
      helper.update();
      var box3 = new THREE.Box3();
      box3.setFromObject(helper);
      var minx = box3.min.x;
      var miny = box3.min.y;
      var maxx = box3.max.x;
      var maxy = box3.max.y;
      var minz = box3.min.z;
      var maxz = box3.max.z;


      controls.reset();

      var lenx = maxx - minx;
      var leny = maxy - miny;
      var lenz = maxz - minz;
      var centerx = minx + (lenx / 2);
      var centery = miny + (leny / 2);
      var centerz = minz + (lenz / 2);

      // console.log("lenx:", lenx, "leny:", leny, "lenz:", lenz);
      var maxlen = Math.max(lenx, leny, lenz);
      var dist = 2 * maxlen;
      // center camera on gcode objects center pos, but twice the maxlen
      controls.object.position.x = centerx;
      controls.object.position.y = centery;
      controls.object.position.z = centerz + dist;
      controls.target.x = centerx;
      controls.target.y = centery;
      controls.target.z = centerz;
      // console.log("maxlen:", maxlen, "dist:", dist);
      var fov = 2.2 * Math.atan(maxlen / (2 * dist)) * (180 / Math.PI);
      // console.log("new fov:", fov, " old fov:", controls.object.fov);
      if (isNaN(fov)) {
        // console.log("giving up on viewing extents because fov could not be calculated");
        return;
      } else {
        // console.log("fov: ", fov);
        controls.object.fov = fov;
        var L = dist;
        var camera2 = controls.object;
        var vector = controls.target.clone();
        var l = (new THREE.Vector3()).subVectors(camera2.position, vector).length();
        var up = camera.up.clone();
        var quaternion = new THREE.Quaternion();

        // Zoom correction
        camera2.translateZ(L - l);
        // console.log("up:", up);
        up.y = 1;
        up.x = 0;
        up.z = 0;
        quaternion.setFromAxisAngle(up, 0);
        camera2.position.applyQuaternion(quaternion);
        up.y = 0;
        up.x = 1;
        up.z = 0;
        quaternion.setFromAxisAngle(up, 0);
        camera2.position.applyQuaternion(quaternion);
        up.y = 0;
        up.x = 0;
        up.z = 1;
        quaternion.setFromAxisAngle(up, 0);
        camera2.lookAt(vector);
        controls.object.updateProjectionMatrix();
      }
    }
  }
};

function makeSprite(scene, rendererType, vals) {
  var canvas = document.createElement('canvas'),
    context = canvas.getContext('2d'),
    metrics = null,
    textHeight = 100,
    textWidth = 0,
    actualFontSize = 10;
  var txt = vals.text;
  if (vals.size) actualFontSize = vals.size;

  context.font = "normal " + textHeight + "px Impact";
  metrics = context.measureText(txt);
  var textWidth = metrics.width;

  canvas.width = textWidth;
  canvas.height = textHeight;
  context.font = "normal " + textHeight + "px Impact";
  context.textAlign = "center";
  context.textBaseline = "middle";
  //context.fillStyle = "#ff0000";
  context.fillStyle = vals.color;

  context.fillText(txt, textWidth / 2, textHeight / 2);

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;

  var material = new THREE.SpriteMaterial({
    map: texture,
    // useScreenCoordinates: false,
    transparent: true,
    opacity: Theme.SPRITE_OPACITY
  });
  material.transparent = true;
  //var textObject = new THREE.Sprite(material);
  var textObject = new THREE.Object3D();
  textObject.position.x = vals.x;
  textObject.position.y = vals.y;
  textObject.position.z = vals.z;
  var sprite = new THREE.Sprite(material);
  textObject.textHeight = actualFontSize;
  textObject.textWidth = (textWidth / textHeight) * textObject.textHeight;
  if (rendererType == "2d") {
    sprite.scale.set(textObject.textWidth / textWidth, textObject.textHeight / textHeight, 1);
  } else {
    sprite.scale.set(textWidth / textHeight * actualFontSize, actualFontSize, 1);
  }

  textObject.add(sprite);

  //scene.add(textObject);
  return textObject;
}


// Global Function to keep three fullscreen

function fixRenderSize() {
  if (!renderer || !camera) {
    return;
  }

  setTimeout(function () {
    var renderArea = document.getElementById("renderArea");

    if (!renderArea) {
      console.error("Unable to resize viewer: #renderArea was not found.");
      return;
    }

    var sceneWidth = renderArea.clientWidth;
    var sceneHeight = renderArea.clientHeight;

    // Do not resize while the tab is hidden.
    if (sceneWidth <= 0 || sceneHeight <= 0) {
      return;
    }

    renderer.setSize(sceneWidth, sceneHeight);

    camera.aspect = sceneWidth / sceneHeight;
    camera.updateProjectionMatrix();

    if (controls) {
      controls.update();
    }

    if (scene) {
      renderer.render(scene, camera);
    }
  }, 50);
}

$(window).on('resize', function() {
  console.log("Window Resize")
  fixRenderSize();
});

function resetView(object) {
  // console.log(resetView.caller);
  if (!object) {
    if (objectsInScene.length > 0) {
      var insceneGrp = new THREE.Group()
      for (i = 0; i < objectsInScene.length; i++) {
        var object = objectsInScene[i].clone();
        insceneGrp.add(object)
      }
      // scene.add(insceneGrp)
      viewExtents(insceneGrp);
      // scene.remove(insceneGrp)
    } else {
      viewExtents(helper);
    }
  } else {
    if (object.userData.linePoints.length > 1) {
      viewExtents(object);
    }
  }
}

function drawMachineCoordinates(status) {
    if (laststatus != undefined && grblParams.$130 !== undefined && grblParams.$131 !== undefined && grblParams.$132 !== undefined)
    {
      var machineCoordinatesBoxMaxX = status.machine.position.work.x - status.machine.position.offset.x
      var machineCoordinatesBoxMaxY = status.machine.position.work.y - status.machine.position.offset.y
      var machineCoordinatesBoxMaxZ = status.machine.position.work.z - status.machine.position.offset.z

      var machineCoordinatesBoxMinX = machineCoordinatesBoxMaxX - grblParams.$130
      var machineCoordinatesBoxMinY = machineCoordinatesBoxMaxY - grblParams.$131
      var machineCoordinatesBoxMinZ = machineCoordinatesBoxMaxZ - grblParams.$132

      console.log("X", machineCoordinatesBoxMinX, machineCoordinatesBoxMaxX)
      console.log("Y", machineCoordinatesBoxMinY, machineCoordinatesBoxMaxY)
      console.log("Z", machineCoordinatesBoxMinZ, machineCoordinatesBoxMaxZ)

      workspace.remove(machineCoordinateSpace);
      machineCoordinateSpace = new THREE.Group();

      var material = new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.3
      });

      // Z min layer
      var points = [];
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMinY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMinY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMinY, machineCoordinatesBoxMinZ));
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      machineCoordinateSpace.add(new THREE.Line(geometry, material));

      // Z max layer
      var points = [];
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMinY, machineCoordinatesBoxMaxZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMinY, machineCoordinatesBoxMaxZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMaxZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMaxZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMinY, machineCoordinatesBoxMaxZ));
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      machineCoordinateSpace.add(new THREE.Line(geometry, material));

      // corner f/l
      var points = [];
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMinY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMinY, machineCoordinatesBoxMaxZ));
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      machineCoordinateSpace.add(new THREE.Line(geometry, material));

      // corner f/r
      var points = [];
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMinX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMaxZ));
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      machineCoordinateSpace.add(new THREE.Line(geometry, material));

      // corner r/l
      var points = [];
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMinY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMinY, machineCoordinatesBoxMaxZ));
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      machineCoordinateSpace.add(new THREE.Line(geometry, material));

      // corner r/r
      var points = [];
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMinZ));
      points.push(new THREE.Vector3(machineCoordinatesBoxMaxX, machineCoordinatesBoxMaxY, machineCoordinatesBoxMaxZ));
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      machineCoordinateSpace.add(new THREE.Line(geometry, material));

      workspace.add(machineCoordinateSpace);
    }
  }


  function updateViewerModeTabs() {
    $("#view2dtab").toggleClass("active", viewerMode === "2d");
    $("#view3dtab").toggleClass("active", viewerMode === "3d");
  }

  $("#view2dtab").on("click", function (event) {
    // event.preventDefault();
    set2DView();
  });

  $("#view3dtab").on("click", function (event) {
    // event.preventDefault();
    set3DView();
  });

  function refreshViewerSize() {
      window.setTimeout(function () {
          var viewer = document.getElementById("renderArea");

          if (viewer && viewer.clientWidth > 0 && viewer.clientHeight > 0) {
              fixRenderSize();

              if (typeof renderer !== "undefined" &&
                  typeof scene !== "undefined" &&
                  typeof camera !== "undefined") {
                  //renderer.render(scene, camera);
                  performRender();
              }
          }
      }, 50);
      updateViewerModeTabs();
  }


  function set2DView() {
      if (!camera || !cameraXZ || !cameraXY || !controls) {
          return;
      }

      if (viewerMode !== "2d") {
          save3DView();
      }

      // Set our mode to 2d (which our renderer will now recognize as the split view)
      viewerMode = "2d";

      var target = controls.target.clone();
      var distance = camera.position.distanceTo(target);

      if (!isFinite(distance) || distance < 1) {
          distance = 1000;
      }

      // --- LEFT PANE CAMERA (XY Plane - Top Down) ---
      camera.up.set(0, 1, 0);
      camera.position.set(target.x, target.y, target.z + distance);
      camera.lookAt(target);

      // --- FIX: Apply calculations strictly to cameraXY instead of camera ---
      cameraXY.up.set(0, 1, 0);
      cameraXY.position.set(target.x, target.y, target.z + distance);
      cameraXY.lookAt(target);

      // --- RIGHT PANE CAMERA (XZ Plane - Side Profile looking at Depth) ---
      cameraXZ.up.set(0, 0, 1); // Z acts as the vertical depth axis
      cameraXZ.zoom = 3.0;

      // // Position the camera looking directly down the Y-axis to see the XZ profile
      // cameraXZ.position.set(target.x, target.y - distance, target.z);
      // cameraXZ.lookAt(target);

      if (typeof cone !== "undefined" && cone) {
        cone.scale.set(1.0, 0.4, 1.0);
      }

      /*
      * Disable rotation so the user stays locked in the 2D plane orientations,
      * but allow panning and zooming.
      */
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.enableZoom = true;

      camera.updateProjectionMatrix();
      cameraXZ.updateProjectionMatrix();
      cameraXY.updateProjectionMatrix();
      controls.update();

      showCoordinatePickerUI();
      refreshViewerSize();
      
  }

  function save3DView() {
      if (!camera || !controls) {
          return;
      }

      saved3DView = {
          position: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          up: camera.up.clone(),
          target: controls.target.clone(),
          zoom: camera.zoom
      };
  }

  function set3DView() {
    if (!camera || !controls) {
        return;
    }

    viewerMode = "3d";
    updateViewerModeTabs();

    if (coordinatePickMarker) {
      coordinatePickMarker.visible = false;
    }
    hideCoordinatePickerUI();

    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;

    if (saved3DView) {
        camera.position.copy(saved3DView.position);
        camera.quaternion.copy(saved3DView.quaternion);
        camera.up.copy(saved3DView.up);
        controls.target.copy(saved3DView.target);

        if (typeof saved3DView.zoom === "number") {
            camera.zoom = saved3DView.zoom;
        }
    } else {
        /*
        * Call the application's existing default/isometric
        * camera function here, if one already exists.
        */
        camera.up.set(0, 1, 0);

        if (typeof resetView === "function") {
            resetView();
        }
    }

    camera.updateProjectionMatrix();
    controls.update();
    refreshViewerSize();
  }

function performRender() {
  if (!renderer || !scene || !camera || !cameraXZ || !cameraXY) return;

  var renderArea = document.getElementById("renderArea");
  if (!renderArea) return;

  var width = renderArea.clientWidth;
  var height = renderArea.clientHeight;

  if (viewerMode === "2d") {
      renderer.setScissorTest(true);

      // --- CALCULATIONS FOR THE SPLIT HOUSINGS ---
      var rightWidth = 100; // Locked absolute width in pixels
      var rightMargin = 100;
      var leftWidth = width - (rightWidth + rightMargin); // Left panel width



      // --- LEFT PANEL: XY PLANE ---
      renderer.setViewport(0, 0, leftWidth, height);
      renderer.setScissor(0, 0, leftWidth, height);

      var baseViewSize = 300; // Base size of the viewport machine workspace bounds
      var aspectXY = leftWidth / height;

      // FIX: Dynamically update the Orthographic bounds for cameraXY to match leftWidth
      // This forces the viewport to maintain a 1:1 square aspect ratio without stretching lines.
      var viewSize = 300; // Adjust this scale factor to change the default 2D viewport zoom coverage
      var aspectXY = leftWidth / height;

      // cameraXY.left = -viewSize * aspectXY / 2;
      // cameraXY.right = viewSize * aspectXY / 2;
      // cameraXY.top = viewSize / 2;
      // cameraXY.bottom = -viewSize / 2;

      // FIX: Multiply your boundaries by cameraXYZoomFactor to smoothly expand or contract the view frame
      cameraXY.left = (-baseViewSize * aspectXY / 2) * cameraXYZoomFactor;
      cameraXY.right = (baseViewSize * aspectXY / 2) * cameraXYZoomFactor;
      cameraXY.top = (baseViewSize / 2) * cameraXYZoomFactor;
      cameraXY.bottom = (-baseViewSize / 2) * cameraXYZoomFactor;

      cameraXY.updateProjectionMatrix();
      renderer.render(scene, cameraXY);

      // --- RIGHT PANEL: XZ PLANE PROFILE ---
      renderer.setViewport(leftWidth - rightMargin, 0, rightWidth, height);
      renderer.setScissor(leftWidth - rightMargin, 0, rightWidth, height);

      /*
      * TRACKING THE CONE: Keep the XZ profile camera locked directly onto
      * the cone's real-time X and Z position as it changes depth.
      */
      if (typeof cone !== "undefined" && cone && cone.position) {
          // Position camera looking straight down the Y axis, aligned with the cone
          cameraXZ.position.set(cone.position.x, cone.position.y - 300, cone.position.z);
          cameraXZ.lookAt(cone.position.x, cone.position.y, cone.position.z);
      }

      cameraXZ.aspect = rightWidth / height;
      cameraXZ.updateProjectionMatrix();
      renderer.render(scene, cameraXZ);

      renderer.setScissorTest(false);
  } else {
      // Standard full canvas rendering for 3D mode
      renderer.setViewport(0, 0, width, height);
      renderer.render(scene, camera);
  }
}

function showCoordinatePickerUI() {
    if (!coordinatePickButton) {
        createCoordinatePickerUI();
    }

    if (coordinatePickButton) {
        coordinatePickButton.style.display = '';
        coordinateJogButton.style.display = '';
        coordinateCancelButton.style.display = '';
    }

    if (coordinateReadout) {
        coordinateReadout.style.display = '';
    }
}

function hideCoordinatePickerUI() {
    disableCoordinatePick();

    if (coordinatePickButton) {
        coordinatePickButton.style.display = 'none';
        coordinateJogButton.style.display = 'none';
        coordinateCancelButton.style.display = 'none';
    }

    if (coordinateReadout) {
        coordinateReadout.style.display = 'none';
    }
}

function jogToCoordinate(x, y) {

  // Safety clearance in work coordinates, millimeters.
  // Change this to the clearance required for your machine.
  var safeZ = 5;

  x = Number(x);
  y = Number(y);

  // Validate the destination.
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    console.error("Invalid jog coordinate:", x, y);
    return;
  }

  // Confirm that current controller status is available.
  if (
    typeof laststatus === "undefined" ||
    !laststatus ||
    !laststatus.comms ||
    !laststatus.machine ||
    !laststatus.machine.position ||
    !laststatus.machine.position.work
  ) {
    console.error("Machine status is not available.");
    return;
  }

  // OpenBuilds reports an active controller connection as status 2.
  var connectionIsActive =
    laststatus.comms.connectionStatus === 2 &&
    laststatus.comms.interfaces &&
    laststatus.comms.interfaces.activePort;

  if (!connectionIsActive) {
    console.error("Cannot jog because the controller is not connected.");

    if (typeof Metro !== "undefined" && Metro.toast) {
      Metro.toast.create(
        "Connect to the controller before jogging.",
        null,
        2000,
        "bg-darkRed fg-white"
      );
    }

    return;
  }

  // Do not start movement while another operation is active.
  if (laststatus.comms.runStatus !== "Idle") {
    if (typeof toastJogNotIdle === "function") {
      toastJogNotIdle();
    } else {
      console.error(
        "Cannot jog while machine status is:",
        laststatus.comms.runStatus
      );
    }

    return;
  }

  var currentZ = Number(laststatus.machine.position.work.z);

  if (!Number.isFinite(currentZ)) {
    console.error("Current Z position is not available.");
    return;
  }

  var moves = "G21\nG90\n";

  if (currentZ < 0) {
    moves += "G0 Z" + safeZ.toFixed(3) + "\n";
  }

  moves += "G0 X" + x.toFixed(3) +" Y" + y.toFixed(3) + " F" + Math.min(jogRateX, jogRateY) + "\n";

  console.log("Coordinate move command:\n" + moves);

  socket.emit("runJob", {
    data: moves,
    isJob: false,
    fileName: ""
  });
}

function updateViewerTheme() {

    var darkMode =
        document.body.classList.contains("dark-mode");

    var bgColor = darkMode
        ? "rgba(30,30,30,.88)"
        : "rgba(255,255,255,.88)";

    var textColor = darkMode
        ? "#ffffff"
        : "#222222";

    if (coordinateReadout) {
        coordinateReadout.style.background = bgColor;
        coordinateReadout.style.color = textColor;
    }

    if (depthLabel) {
        depthLabel.style.background = bgColor;
        depthLabel.style.color = textColor;
    }
}

function updateCoordinateButtonTheme() {

    var darkMode = document.body.classList.contains("dark-mode");

    var buttonBg = darkMode ? "#2d2d2d" : "#ffffff";

    var buttonText = darkMode ? "#ffffff" : "#222222";

    var buttonBorder = darkMode ? "#666666" : "#666666";

    [
        coordinatePickButton,
        coordinateJogButton,
        coordinateCancelButton
    ].forEach(function(btn) {

        if (!btn) return;

        btn.style.background = buttonBg;
        btn.style.color = buttonText;
        btn.style.borderColor = buttonBorder;
    });
}

function onThemeChanged() {

    updateViewerTheme();
    updateCoordinateButtonTheme();

    redrawGrid(
        xmin,
        xmax,
        ymin,
        ymax,
        localStorage.getItem('unitsMode') === 'in'
    );

    performRender();
}