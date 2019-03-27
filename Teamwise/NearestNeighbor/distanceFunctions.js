entityDistance = function (entity1, entity2, timestamp) {
  const p1 = entity1.position.getValue(timestamp)
  const p2 = entity2.position.getValue(timestamp)
  return Cesium.Cartesian3.distance(p1, p2)
}

entityDistanceEuclideanSum = function (e1, e2, startTime, currTime,stepSize) {
  let dist = 0
  let newTime = Cesium.JulianDate.clone(startTime)
  let tmpTime = Cesium.JulianDate.clone(currTime)
  let steps = parseInt(Cesium.JulianDate.secondsDifference(tmpTime, newTime))
  for (let index = 0; index <= steps; index += stepSize) {
    Cesium.JulianDate.addSeconds(startTime, index, newTime)
    if (Cesium.defined(e1.position.getValue(newTime)) && Cesium.defined(e2.position.getValue(newTime))) {
      dist += Cesium.Cartesian3.distance(
        e1.position.getValue(newTime),
        e2.position.getValue(newTime)
      )
    }
  }
  return steps > 0 ? dist / steps : dist
}


entityAngleDistance = function (e1, e2, startTime, currTime,stepSize) {
  let euclDist = entityDistanceEuclideanSum(e1, e2, startTime, currTime,stepSize)
  const e1Orientation = Cesium.Cartesian3.fromCartesian4(e1.orientation.getValue(currTime))
  const e2Orientation = Cesium.Cartesian3.fromCartesian4(e2.orientation.getValue(currTime))
  let directionVector = new Cesium.Cartesian3(0, 0, 0)
  Cesium.Cartesian3.subtract(e2.position.getValue(currTime), e1.position.getValue(currTime), directionVector)
  let crossDirxOrientation = new Cesium.Cartesian3(0, 0, 0)
  Cesium.Cartesian3.cross(e1Orientation, directionVector, crossDirxOrientation)

  // ||e1Orientation x directionVector|| / ||e1Orientation|| ||directionVector|| 
  if (Cesium.Cartesian3.magnitude(directionVector) === 0) {
    return 0
  }
  let omegaAngle = Cesium.Cartesian3.magnitude(crossDirxOrientation) /
    (Cesium.Cartesian3.magnitude(e1Orientation) * Cesium.Cartesian3.magnitude(directionVector))

  let crossOrientations = new Cesium.Cartesian3(0, 0, 0)
  Cesium.Cartesian3.cross(e1Orientation, e2Orientation, crossOrientations)

  let psiAngle = Cesium.Cartesian3.magnitude(crossOrientations) /
    (Cesium.Cartesian3.magnitude(e1Orientation) * Cesium.Cartesian3.magnitude(e2Orientation))


  return 0.1 * euclDist + omegaAngle + psiAngle
}







nnDistance = function (e1, e2, startTime, currTime,stepSize) {
  if (!Cesium.defined(e1) || !Cesium.defined(e2) || !Cesium.defined(startTime) || !Cesium.defined(currTime))
    return 0
  var distValue = $("#nnDistanceSelector").val()
  switch (distValue) {
    case "1":
      return entityDistance(e1, e2, currTime)
    case "2":
      return entityDistanceEuclideanSum(e1, e2, startTime, currTime,stepSize)

    case "3":
      return entityAngleDistance(e1, e2, startTime, currTime,stepSize)

    default:
      return entityDistance(e1, e2, currTime)
  }
}