/*exported initSyncMode*/
/*global CesiumSync initEntities modelURI ReconnectingWebSocket*/

function initSyncMode() {

    function handleStateChange(state) {
        console.log(state);

        if (state["time"] !== null) {
            console.log("TimeLine Update Rxd: " + state["time"]);
            setToMasterTime(state["time"]);
        }

        if (state["play"] !== null) {
            console.log("Play Update Rxd: " + state["play"]);
            setToMasterPlay(state["play"]);
        }

        if (state["multiplier"] !== null) {
            console.log("TimeMultiplier Update Rxd: " + state["multiplier"]);
            setToMasterMultiplier(state["multiplier"]);
        }

        if (state["id"] !== null) {
            console.log("SelctID Update Rxd: " + state["id"]);
            setToMasterSelctID(state["id"]);
        }

        if (state["nnID"] !== null) {
            console.log("NNDistance Update Rxd: " + state["nnID"]);
            setToMasterNNDist(state["nnID"]);
        }

        if (state["currentDsFilePath"] !== null) {
            console.log("update File: " + state["currentDsFilePath"]);
            setCurrentDSFilePath(state["currentDsFilePath"]);
        }
        if (state["nnOnOff"] !== null) {
            console.log("update nnSelection: " + state["nnOnOff"]);
            setToMasterNNOnOff(state["nnOnOff"]);
        }

    }



    const clockViewModel = new Cesium.ClockViewModel(viewer.clock); //for the clock.multiplier
    const animationViewModel = new Cesium.AnimationViewModel(clockViewModel); // for play/pause

    const ws = new ReconnectingWebSocket(CONFIG.wsURI, null, {
        binaryType: "arraybuffer"
    });

    ws.onopen = function () {
        console.log("WS Master-Slave Connection Achieved");
        ws.onmessage = function (evt) {


            try {
                // Decode the Message
                const sync = CesiumSync.decode(evt.data);

                /*
                Message Types:
                msgtype = 0 --> Slave Reload Message
                msgtype = 1 --> not used
                msgtype = 2 --> not used
                msgtype = 3 --> Cesium State Sync Message
                */
                if (sync.msgtype === 0) {
                    console.log("Message-Type: Slave Reload Message Rxd");
                    location.reload(true);
                } else if (sync.msgtype === 3) {
                    console.log("Message-Type: State Update");
                    handleStateChange(sync);
                }
            } catch (err) {
                console.log("Error: " + err);
            }
        };




    };


    function setCurrentDSFilePath(filepath) {
        const options = {
            camera: viewer.scene.camera,
            canvas: viewer.scene.canvas
        };

        console.log("File Path: " + filepath);
        initEntities(Cesium.KmlDataSource.load(filepath, options), modelURI);
    }

    function setToMasterTime(time) {
        console.log("Got time: " + time);
        viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(time);
        // Update the Timeline to the Clock
        viewer.timeline.updateFromClock();
    }

    function setToMasterMultiplier(multiplier) {
        console.log("Got time: " + multiplier);
        clockViewModel.multiplier = multiplier;
        //viewer.clock.multiplier = multiplier;
        //viewer.clock.synchronize();
    }

    function setToMasterPlay(play) {
        console.log("Got play status: " + play);
        if (play) {
            animationViewModel.pauseViewModel.command(); //This one is necessary if the state before is not known!
            animationViewModel.playForwardViewModel.command();
            console.log(play);
        } else {
            animationViewModel.playForwardViewModel.command(); //same here
            animationViewModel.pauseViewModel.command();
        }


    }

    function setToMasterNNDist(nnID) {
        console.log("nndiust" + nnID)
        $('#nnDistanceSelector').val(nnID)
    }

    function setToMasterNNOnOff(nnOnOff) {
        console.log("nnAnalyisisCB " + nnOnOff)
        if (nnOnOff === "1") {
            $('#nnAnalyisisCB').prop('checked', true)
            $('#nnAnalyisisCB').trigger("change")

        } else {
            $('#nnAnalyisisCB').prop('checked', false)
            $('#nnAnalyisisCB').trigger("change")


        }

    }



    function setToMasterSelctID(entityName) {
        console.log(entityName)
        if (Cesium.defined(vrOptions))
            vrOptions.currSelection = entityName
    }

    return viewer;
}