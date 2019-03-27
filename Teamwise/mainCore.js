/*global addDataSourceOption getInterpolationOptions initSyncMode sendCurrentFilePath*/
/*exported loadKmlFile switchDataSource*/

/** The reference to the bird model. */
const modelURI = "models/storch_model_2017__1_7lq90.glb";

/** Will hold environment variables like keys, IP address, etc. */
const CONFIG = {};

/** The Cesium instance. To be initialized in the startup function. */
let viewer;

/**
 * Creates an html text that is shown in the info box of the selected entity.
 * @param {Cesium.Entity} data the entity to create the description for
 * @returns {string} the description
 */
function createDescriptionString(data) {
  let descriptionString =
    "Bird" +
    " Information:" +
    '<div style="text-align:left; padding:5px">' +
    "</div>";

  // [SE] I reswitched id and name, errors from files should be handled there.
  descriptionString += "Bird ID: " + data.id + "<br/>"; //'<div style="text-align:center; padding:15px">Zoom to all</div>';
  descriptionString += "  Bird Name: " + data.name + "<br/>";
  const resStart = data.position.getValue(data.availability.start);
  const resStop = data.position.getValue(data.availability.stop);

  // Get start and end altitude
  const startAlt = Cesium.Cartographic.fromCartesian(resStart).height;
  const stopAlt = Cesium.Cartographic.fromCartesian(resStop).height;
  const altGain = stopAlt - startAlt;
  descriptionString += "  Altitude gain: " + altGain + "<br/>";

  //qrcode stuff
  let currIP = CONFIG.wsURI.split("//")[1];
  currIP = currIP.split(":")[0];
  let qrString =
    "http%3A%2F%2F" + currIP + "%3A8080%2FTeamwise%2Fmain.html%3Fmode%3Dvr";
  let birdQRCode =
    '<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' +
    qrString +
    '" alt="QR" height="128" width="128"><br/>';

  descriptionString += birdQRCode;

  return descriptionString;
}

/**
 * Initializes a created dataSource by adding it to the viewer and adjusts some
 * of the entity properties:
 * - adding the bird model (currently always a stork)
 * - adjusting position interpolation options
 * - adding the info box description
 * @param {Promise<Cesium.DataSource>} dataSource the data source in creation
 * @param {string} modelPath the path to the bird model to use
 */
async function initEntities(dataSource, modelPath) {
  // Add the data source to the viewer and wait until it is ready.
  dataSource = await viewer.dataSources.add(dataSource); //birds2 bird70 2014-08-07-70.kml

  // Stop the clock (if it was running before).
  viewer.clock.shouldAnimate = false;

  const entities = dataSource.entities;

  // Get the current setting (linear / polynomal) from the menu.
  const interpolationOptions = getInterpolationOptions();

  for (const [index, animal] of entities.values.entries()) {
    animal.model = new Cesium.ModelGraphics({
      uri: modelPath,
      minimumPixelSize: 32,
      color: Cesium.Color.CORNSILK,
      colorBlendMode: Cesium.ColorBlendMode.MIX,
      colorBlendAmount: 0.6,
      HeightReference: Cesium.HeightReference.NONE
    });
    animal.orientation = new Cesium.VelocityOrientationProperty(
      animal.position
    );
    animal.position.setInterpolationOptions(interpolationOptions);
    animal.description = createDescriptionString(animal);
    animal.addProperty("myIndex");
    animal.myIndex = index;
  }

  // Add an entry for the selection of loaded data in the user interface.
  addDataSourceOption(dataSource.name, entities.id);
  switchDataSource(entities.id);
}

/**
 * Starts the Teamwise application.
 * Initialization that has to be done before Cesium is started can be added to
 * `startupTasks`. Tasks that need the viewer are added to the final callback.
 */
function startup() {
  "use strict";

  // Decide in which sync modus the application should run.
  // The modus is called as a url encoded option "mode" when calling the page.
  const url = new URL(window.location.href);
  let modus = url.searchParams.get("mode");

  // Shortcuts are allowed, all other (invalid) input defaults to "basic".
  if (modus === "master" || modus === "m") {
    modus = "master";
  } else if (modus === "slave" || modus === "s") {
    modus = "slave";
  } else if (modus === "vr") {
    modus = "vr";
  } else {
    modus = "basic";
  }

  // Collect all tasks that must be done before starting Cesium.
  const startupTasks = [];

  // Load the config file from the server.
  startupTasks.push(
    new Promise(resolve => {
      vrOptions = {
        currSelection: 0,
        currNNs: [0],
        lastPos: new Cesium.Cartesian3(),
        fixed: true
      };

      $.getJSON("Sync/web-config.json", data => {
        // Copy entries of the loaded config into the CONFIG object.
        // Note: No simple assignment to keep the object `const`.
        for (const prop in data) {
          CONFIG[prop] = data[prop];
        }
        resolve();
      });
    })
  );

  // Load the correct script for the sync mode.
  startupTasks.push(
    new Promise(resolve => {
      if (modus === "vr") {
        $.getScript("Sync/slave.js", resolve);
      } else {
        // When the loading of the script finished, jquery resolves the promise.
        $.getScript("Sync/" + modus + ".js", resolve);
        // The VR instance is always a slave
      }
    })
  );

  // Load the nearest neighbor script
  startupTasks.push(
    new Promise(resolve => {
      // When the loading of the script finished, jquery resolves the promise.
      $.getScript("NearestNeighbor/nnAnalysis.js", resolve);
    })
  );
  startupTasks.push(
    new Promise(resolve => {
      // When the loading of the script finished, jquery resolves the promise.
      $.getScript("NearestNeighbor/distanceFunctions.js", resolve);
    })
  );

  // After all tasks are complete, Cesium can be started.
  Promise.all(startupTasks).then(() => {
    // Use the Ion key that was loaded from the config file, if supplied.
    if (CONFIG.IonKey) {
      Cesium.Ion.defaultAccessToken = CONFIG.IonKey;
    }

    /*eslint-disable-next-line no-global-assign*/
    viewer = createViewer(modus);

    // Make terrain see-through, we can't deal with "under ground" data yet.
    viewer.scene.globe.depthTestAgainstTerrain = false;
    // Let the viewer adapt to the browser size (needed for 4K resolution).
    viewer.resolutionScale = window.devicePixelRatio;
    viewer.resolutionScale = window.devicePixelRatio;
    // viewer.scene.debugShowFramesPerSecond = true;

    // Initialize the sync mode, that was loaded before.
    initSyncMode();

    if (modus === "vr") {
      initVR(viewer);
    }
    setupHandler();
    setupNN();
  });
}

/**
 * Creates an appropriate Cesium instance for this application.
 * The appearance depends on the modus Teamwise is running in:
 * - `"basic"` (no synchronisation)
 * - `"master"` (synchronized, control)
 * - `"slave"` (synchronized, no control)
 * - `"vr"` (to be added)
 * @param {string} modus the mode in which the session is running
 */
function createViewer(modus) {
  return new Cesium.Viewer("cesiumContainer", {
    // Was deactivated because of own imagery provider, might be reenabled.
    baseLayerPicker: false,

    // Creates the terrain, with Cesium / Ion default terrain data.
    terrainProvider: modus === "vr" ? undefined : Cesium.createWorldTerrain(),

    // TODO: Makes no sense if not in VR mode. To be adjusted on adding VR.
    // vrButton: true,
    vrButton: modus == "vr",
    animation: modus !== "vr" || modus !== "vr",
    selectionIndicator: modus !== "vr",
    infoBox: modus !== "vr",
    homeButton: modus !== "vr"

    // Whether the clock widget is shown, slaves should have no control.
  });
}

/**
 * Creates a data source from the specified KML file.
 * @param {File} file the file to load
 */
async function loadKmlFile(file) {
  const options = {
    camera: viewer.scene.camera,
    canvas: viewer.scene.canvas
  };
  const fileURI = "/Teamwise/data/" + file.name;
  let serverFileFlag = false;
  $.get(fileURI)
    .done(function() {
      console.log("file server");
      serverFileFlag = true;
      if (typeof sendCurrentFilePath === "function") {
        console.log(fileURI)
        sendCurrentFilePath(fileURI);
        // exists code
      }
    })
    .fail(function() {
      console.log("file local");
    });

  // If the file is loaded from the server, use the path instead.
  const toLoad = serverFileFlag ? fileURI : file;
  const dataSource = await Cesium.KmlDataSource.load(toLoad, options);

  // The name created from the KML is nonsense ("Flight path" everytime).
  dataSource.name = file.name;

  // Override the clock multiplier that might be in the file.
  dataSource.clock.multiplier = 1;

  // Add the data source to the viewer.
  initEntities(dataSource, modelURI);
}

/**
 * Adjusts the Cesium time line to fit the selected dataSource and flies to it.
 * TODO: This might need rebuild considering internal organisation of datasets.
 */
function switchDataSource(entityCollectionId) {
  // Search for the data source with the entity collection id from the select.
  // Note: DataSourceCollection does not provide an array, thus the for loop.
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const dataSource = viewer.dataSources.get(i);

    if (dataSource.entities.id === entityCollectionId) {
      // Other features might rely on the selected set having index 0.
      viewer.dataSources.lowerToBottom(dataSource);

      // Deselect any entity from the old dataset.
      viewer.selectedEntity = undefined;

      // Adjust the clock to fit the data source and fly to the entities.
      viewer.clockTrackedDataSource = dataSource;
      viewer.flyTo(dataSource);

      // If we want to hide data that is not in the focus.
      dataSource.show = true;
    } else {
      dataSource.show = false;
    }
  }
}

// startup cesium
if (typeof Cesium !== "undefined") {
  startup();
} else if (typeof require === "function") {
  require(["/cesium-teamwise-ba/Build/Cesium/Cesium"], startup);
}
