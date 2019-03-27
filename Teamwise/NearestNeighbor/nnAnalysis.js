let kNNs = 4
let lastAnimal
let stepSize = 1;
/**
 * Setups some handlers to register right left click and on hover
 */
function setupHandler() {
  // setup the 3 handler for mouse interaction
  let handlerHoover = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
  let handlerLeftClick = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
  let handlerRightClick = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

  // gets the current datasource

  // handles on hover functionality
  handlerHoover.setInputAction(function (movement) {
    if (!Cesium.defined(viewer.dataSources.get(0)))
      return
    // get the object that is hovered over
    let pickedObject = viewer.scene.pick(movement.endPosition)
    // Check if its defined and has a model

    if (Cesium.defined(pickedObject)) {
      if (Cesium.defined(pickedObject.id.model)) {
        // Let the model glow
        pickedObject.id.model.silhouetteSize = 5
        pickedObject.id.model.silhouetteColor = Cesium.Color.RED
      }
    } else { // else remove glow from all animals except the last selected one
      for (let animal of viewer.dataSources.get(0).entities.values) {
        if (animal.model.silhouetteSize > 4) {
          animal.model.silhouetteSize = 0
        }
      }
      if (Cesium.defined(lastAnimal)) {
        lastAnimal.model.silhouetteSize = 5
        lastAnimal.model.silhouetteColor = Cesium.Color.RED

      }

    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  // Handles right click and hides the traces of clicked birds
  handlerRightClick.setInputAction(function (click) {
    let pickedObject = viewer.scene.pick(click.position)
    if (Cesium.defined(pickedObject)) {
      if (pickedObject.id.path.show == true) {
        pickedObject.id.path.show = false
      } else {
        pickedObject.id.path.show = true
      }
    }
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)


  handlerLeftClick.setInputAction(function (click) {
    if (Cesium.defined(viewer.selectedEntity) && Cesium.defined(viewer.selectedEntity.myIndex))
      vrOptions.currSelection = viewer.selectedEntity.myIndex

    let pickedObject = viewer.scene.pick(click.position)
    if (Cesium.defined(pickedObject)) {
      if (Cesium.defined(pickedObject.name)) {
        if (Cesium.defined(lastAnimal)) {
          lastAnimal.model.silhouetteSize = 0.0
        }
        vrOptions.currSelection = viewer.selectedEntity.myIndex
        pickedObject.id.model.silhouetteSize = 5
        pickedObject.id.model.silhouetteColor = Cesium.Color.RED
        lastAnimal = pickedObject.id
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}


function callbackKthNN(time, index) {
  let position1
  let position2
  if (!Cesium.defined(viewer.dataSources.get(0)))
    return
  let entities = viewer.dataSources.get(0).entities.values
  if (!Cesium.defined(index))
    return
  if (Cesium.defined(entities) && Cesium.defined(entities[vrOptions.currSelection].position.getValue(time))) {
    position1 = viewer.dataSources.get(0).entities.values[vrOptions.currSelection].position.getValue(time)
    position2 = viewer.dataSources.get(0).entities.values[index].position.getValue(time)
  } else {
    position1 = Cesium.Cartesian3.fromDegrees(0, 0)
    position2 = Cesium.Cartesian3.fromDegrees(0, 0)
  }
  let pos = [position1, position2]
  return pos

}

function callbackNN(time) {
  return callbackKthNN(time, vrOptions.currNNs[0])
}

function callback2NN(time) {
  return callbackKthNN(time, vrOptions.currNNs[1])
}

function getRotationAngle(clock) {
  let currNN = viewer.dataSources.get(0).entities.values[vrOptions.currNNs[0]]
  if (!Cesium.defined(currNN)) {
    return 0;
  }
  let currPos = currNN.position.getValue(viewer.clock.currentTime)
  let test1 = viewer.camera.viewMatrix
  let test2 = new Cesium.Cartesian3(0, 0, 0)
  if (!Cesium.defined(test1)||!Cesium.defined(currPos)) {
    return 0;
  }

  Cesium.Matrix4.multiplyByPoint(test1, currPos, test2)
  let angleinRad = Cesium.Cartesian2.angleBetween(new Cesium.Cartesian2(0, -1), new Cesium.Cartesian2(test2.x, test2.y))

  return test2.x > 0 ? -angleinRad : angleinRad
}

function getRotationAngleToCamera() {
  let currNN = viewer.dataSources.get(0).entities.values[vrOptions.currNNs[0]]
  if (!Cesium.defined(currNN)) {
    return 0;
  }
  let currPos = currNN.position.getValue(viewer.clock.currentTime)
  let test1 = viewer.camera.viewMatrix
  let test2 = new Cesium.Cartesian3(0, 0, 0)
  if (!Cesium.defined(test1)||!Cesium.defined(currPos)) {
    return 0;
  }


  Cesium.Matrix4.multiplyByPoint(test1, currPos, test2)
  Cesium.Matrix4.multiplyByScalar(test2, -1, test2)
  return Cesium.Cartesian3.angleBetween(new Cesium.Cartesian3(0, 0, -1), test2)
}

function nnOnTickCallback(clock) {
  if (viewer.scene.useWebVR) {
    nnArrow.polyline.material = new Cesium.PolylineArrowMaterialProperty(Cesium.Color.CYAN)
  } else {
    nnArrow.polyline.material = new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.CYAN,
      dashPattern: 255
    })
  }
  if (Cesium.defined(viewer.dataSources.get(0))) {
    let entities = viewer.dataSources.get(0).entities.values
    if(entities.length<1){
      return 
    }
    $(".nnInidcatorArrowimage").css('transform', 'rotateZ(' + getRotationAngle(clock) + 'rad)');

    if (getRotationAngleToCamera() < 0.3) {
      $(".nnInidcatorArrowimage").css('display', 'none');

    } else {
      $(".nnInidcatorArrowimage").css('display', 'block');

    }
    let selectedEntity = entities[vrOptions.currSelection]
    if (Cesium.defined(selectedEntity)) {
      let entityArray = entities //viewer.dataSources.get(0).entities.values

      entityArray.forEach(entity => {
        entity.model.silhouetteSize = 0
        entity.path.show = false
        entity.NNDist = nnDistance(selectedEntity, entity, viewer.clock.startTime, viewer.clock.currentTime,stepSize)
        entity.label = new Cesium.LabelGraphics(entity.NNDist.toString())
      });
      let eArrCopy = Cesium.clone(entityArray)
      eArrCopy.sort(function (a, b) {
        return (a.NNDist - b.NNDist)
      })
      vrOptions.currNNs = []
      for (let index = 0; index < kNNs; index++) {
        entityArray.some(entity => {
          if (entity.name == eArrCopy[index].name) {
            if (index > 0) {
              entity.model.silhouetteColor = Cesium.Color.fromHsl((0 + 0.1 * index / kNNs), 1, 0.5)
              entity.model.silhouetteSize = 4
              vrOptions.currNNs = [...vrOptions.currNNs, entity.myIndex]
            }
            if (index < 2) {
              entity.path.show = true
              entity.path.material = Cesium.Color.fromHsl((0 + index * 0.5), 1, 0.5)
            }
            return true
          }
        });
      }
    }
  }

}

function startNNListener() {
  return
}


function setupNN() {

  $('#nnDistanceSelector').change(() => {
    if (typeof sendNNSelection === "function") {
      sendNNSelection($('#nnDistanceSelector').val());
    }
  })

  nnArrow = viewer.entities.add({
    polyline: {
      // This callback updates positions each frame.
      positions: new Cesium.CallbackProperty(callbackNN, false),
      width: 20,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.CYAN,
        dashPattern: 255
      })
    }
  });
  let nnListener = false
  nnArrow.show = false

  viewer.clock.onTick.addEventListener(nnOnTickCallback)
  nnListener = true
  nnArrow.show = true

  $('#nnIntervalSubmit').click(() => {
    stepSize = parseInt($('#nnInterval').val())
  })


  $('#nnAnalyisisCB').change(() => {
    if (nnListener) {
      nnArrow.show = false
      if (typeof sendNNOnOff === "function")
        sendNNOnOff("0")
      viewer.clock.onTick.removeEventListener(nnOnTickCallback)
      nnListener = false
    } else {
      if (typeof sendNNOnOff === "function")
        sendNNOnOff("1")
      nnArrow.show = true
      viewer.clock.onTick.addEventListener(nnOnTickCallback)
      nnListener = true
    }
  })

}