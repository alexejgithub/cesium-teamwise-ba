const TIME = 0;
const IID = 1;
const JID = 2;
const TAU = 3;
const CORRELATION = 4;
//array columbs: avgLookup
const COUNT = 0;
const SUM = 1;
//datasets
const STORCH = 0;
const PIGEON = 1;
const CUSTOM = 2;
const PIGEONGB = 3;

var datalength; // time(in seconds) * datafreq TODO: get datalength from somewhere else
var datafreq; // in seconds
var birdCount;
// TODO: get birdCount from somewhere else
var alphaArcActive = true; // should arcs encode tau values by color
var animaltype = PIGEON; // The dataset that will be loaded
var kmlSource = "";
var idToIndex = [];
var pythonLFdata = [];
var pythonLFdataHighSigni = [];
var pythonLFlookup = [];
var avgLookup = [];



var lfTauRange = 4;//$( "#tauRange" ).val();
var lfTimeResolution =1;// $( "#step" ).val();
var lfMinSigniH = 0.99//$( "#minSigH" ).val();
var lfMinSigniL = 0.98;//$( "#minSigL" ).val();
var lfTstepIntervall = 4;//$( "#interLength" ).val();
var maxDist = 80;//$( "#maxDist" ).val();


var birdColors = ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']; //10 red -> blue

var myAnimalIndexSelected = null;



function initLeaderFollower() {

    if (animaltype == STORCH) {
        datalength = 300 //time in seconds * datafreq
        datafreq = 1
        animaltype = STORCH
        birdCount = 12
    } else if (animaltype == PIGEON) {
        datalength = 500
        datafreq = 4
        animaltype = PIGEON
        birdCount = 8
    } else if (animaltype == CUSTOM) {
        datalength = 300
        datafreq = 1
        animaltype = CUSTOM
        birdCount = 30
    } else if (animaltype == PIGEONGB) {
        datalength = 1000
        datafreq = 10
        animaltype = PIGEONGB
        birdCount = 30
    } else {
        console.log("UNDEFINDED DATATYPE")
    }
    
    for (var t = 0; t < datalength; t++) { //t is one step in time e.g. 4Hz t = 0.25sec
        avgLookup[t] = [];
        for (var i = 0; i < birdCount; i++) {
            avgLookup[t][i] = [];
            for (var c = 0; c < 2; c++) {
                avgLookup[t][i][c] = 0;
            }
        }
    }

    for (var t = 0; t < datalength; t++) { //t is one step in time e.g. 4Hz t = 0.25sec
        pythonLFlookup[t] = [];
        for (var i = 0; i < birdCount; i++) {
            pythonLFlookup[t][i] = [];
            for (var j = 0; j < birdCount; j++) {
                pythonLFlookup[t][i][j] = [];
                for (var tauInd = 0; tauInd < 2; tauInd++) {
                    pythonLFlookup[t][i][j][tauInd] = undefined;
                }
            }
        }
    }
    startPythonAna();


}


function leaderFollower(dataEntities){
    for (let i = 0; i < loopSize; i++) {
        let mymodel = dataEntities[i];

        for (let j = 0; j < loopSize; j++) {
            let mymodelJ = dataEntities[j];
            idToIndex[j] = mymodelJ.name;
            if (i != j ){

                var birdPosCallback = new Cesium.CallbackProperty(function(time) {
                    //console.log(mymodel.position.getValue(time).x);
                    return [mymodelJ.position.getValue(time), mymodel.position.getValue(time)];
                }, false);//false meaning is not constant

                var arcColorCallback = new Cesium.CallbackProperty(function(time){
                    let color;
                    let alpha = 0.5;
                    if(alphaArcActive){
                        let deltaTime = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                        let timeIndex = Math.round(deltaTime*datafreq);
                        let tau = pythonLFlookup[timeIndex][i][j][0] //// TODO: 0 steht für tau 1 für CORRELATION
                        alpha = tau / lfTauRange;
                    }
                    if (myAnimalIndexSelected === undefined){
                        color = Cesium.Color.fromAlpha(Cesium.Color.fromCssColorString("#d95f0e"),alpha);  //Cesium.Color.YELLOW.withAlpha(alpha);
                    } else {
                        if (alpha< 0 || alpha >1 || alpha === undefined)
                            throw(new Error("Color index out of range!"));
                        let c = colorFromZO(i,alpha);


                        let co = Cesium.Color.BLACK ;
                        if (c !== undefined)
                            co = Cesium.Color.fromCssColorString(c);
                        else
                            co = Cesium.Color.BLACK;

                        color = co;
                    }
                    return color;
                }, false);

                function colorFromZO(i,alpha){
                    let c;
                    if (myAnimalIndexSelected == i){
                        c = birdColors[Math.round(4 - alpha * (birdColors.length / 2 - 1 ))];
                    } else {
                        c = birdColors[Math.round(birdColors.length / 2 + alpha* (birdColors.length / 2 - 1))];

                    }
                    return c;
                }

                var arcDescriptionCallback = new Cesium.CallbackProperty(function(time){
                    let deltaTime = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                    let timeIndex = Math.round(deltaTime*datafreq);
                    let tau = pythonLFlookup[timeIndex][i][j][0];
                    let sig = pythonLFlookup[timeIndex][i][j][1];
                    let string = ""
                    if(isNaN(tau) || isNaN(sig)){
                        string = "No interaction with correlatoin > " + lfMinSigniH;
                    } else {
                        string = "Tau: " + tau + " Correlation: " + sig.toFixed(4);
                    }
                    return string;
                }, false);


                var birdColorCallback = new Cesium.CallbackProperty(function(time){
                    let deltaTime = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                    let timeIndex = Math.round(deltaTime*datafreq);
                    let count = avgLookup[timeIndex][i][COUNT];
                    let sum = avgLookup[timeIndex][i][SUM];
                    let avgTi = sum / count;
                    let alpha = 1;
                    let color;
                    if (count > 0){
                        alpha = avgTi/(lfTauRange *2) + 0.5;
                        //color = Cesium.Color.fromCssColorString(birdColors[Math.round(alpha * birdColors.length)]);
                    } else {
                        alpha = 0.5;
                        //color = Cesium.Color.fromCssColorString(birdColors[Math.round(0.5 * birdColors.length)]);
                    }
                    //console.log(color);
                    color = Cesium.Color.WHITE; //TODO no Effect..
                    let birdcolor = Cesium.Color.fromAlpha(color, alpha);
                    return birdcolor;
                }, false);


                let theLfArc = viewer.entities.add({
                    name : '#' + j + ' follows #' + i,
                    id : 'arc' + i + 'to' + j,
                    description : arcDescriptionCallback,
                    polyline : {
                        positions : birdPosCallback,
                        width : 20,
                        //scale: 0.001, no effect
                        followSurface : false,
                        material : new Cesium.PolylineArrowMaterialProperty(arcColorCallback),
                        show: new Cesium.CallbackProperty(function(time) {
                            //console.log(mymodel.position.getValue(time).x);
                            let dTime = Cesium.JulianDate.secondsDifference(time, viewer.clock.startTime);
                            return getShowStatus(mymodel.name, mymodelJ.name, dTime)
                        }, false),//false meaning is not constant
                    }
                });

            }
        } // End of for Loop over j

    } // end i loop
    Cesium.knockout.getObservable(viewer, '_selectedEntity').subscribe(function(entity) {
        if (entity !== undefined) {
            //console.log("Entity ID = " + entity.id)
            //console.log("Entity.name = " + entity.name)
            let index = entity.myAnimalIndex;  //same idetifier should be choosen in slave.js
            if (index !== undefined) {
                myAnimalIndexSelected = index
                console.log("myAnimalIndex was set to: " + index)
            } else {
                myAnimalIndexSelected = undefined
            }
        }
    });
    

}

function createVis(lfData) {
    console.log("Start to draw the Arcs");
    pythonLFdata = lfData;
    pythonLFdataHighSigni = [];

    for (var indexLF = 1 ; indexLF < pythonLFdata.length; indexLF++) {
        pythonLFdata[indexLF][CORRELATION] = pythonLFdata[indexLF][CORRELATION]-1
        if (pythonLFdata[indexLF][CORRELATION] > lfMinSigniH){
            pythonLFdataHighSigni.push(pythonLFdata[indexLF]);
        }
    }


    for ( var t = 0; t < datalength; t++) {  //t is one step in time e.g. 4Hz t = 0.25sec
        pythonLFlookup[t] = [];
        for (var i = 0; i < birdCount; i++) {
            pythonLFlookup[t][i] = [];
            for (var j = 0; j < birdCount; j++) {
                pythonLFlookup[t][i][j] = [];
                for (var tauInd = 0; tauInd < 2; tauInd++) {
                    pythonLFlookup[t][i][j][tauInd] = undefined;
                }
            }
        }
    }

    for (indexLF = 1; indexLF < pythonLFdataHighSigni.length; indexLF++ ){
        let t = pythonLFdataHighSigni[indexLF][TIME];
        let i = pythonLFdataHighSigni[indexLF][IID];
        let j = pythonLFdataHighSigni[indexLF][JID];
        let tau = pythonLFdataHighSigni[indexLF][TAU];
        let corr = pythonLFdataHighSigni[indexLF][CORRELATION];
        pythonLFlookup[t][i][j][0] = tau;
        pythonLFlookup[t][i][j][1] = corr;
    }

    //console.log(pythonLFlookup);
    console.log(pythonLFdata[0][TIME]);
    //console.log("01 = " + pythonLFdata[0][IID]);
    //console.log("10 = " + pythonLFdata[1][TIME]);

    createAvgTable(pythonLFdataHighSigni)
}


function createAvgTable(pythonLFdataHighSigni){

    for ( let t = 0; t < datalength; t++) {  //t is one step in time e.g. 4Hz t = 0.25sec
        avgLookup[t] = [];
        for (let i = 0; i < birdCount; i++) {
            avgLookup[t][i] = [];
            for (let c = 0; c < 2; c++) {
                avgLookup[t][i][c] = 0;
            }
        }
    }

    let input =  pythonLFdataHighSigni;
    let t = 0;
    let i = 0;

    for (var indexLF = 1; indexLF < input.length; indexLF++){
        let t = input[indexLF][TIME];
        let i = input[indexLF][IID];
        let j = input[indexLF][JID];
        let tau = input[indexLF][TAU];

        avgLookup[t][i][SUM] += Number(tau);
        avgLookup[t][j][SUM] -= Number(tau);
        avgLookup[t][i][COUNT]++;
        avgLookup[t][j][COUNT]++;
    }

    var testT = 130;
    var testB  = 0;
    var test = avgLookup[testT][testB][SUM] / avgLookup[testT][testB][COUNT];
    //console.log("Summe" + avgLookup[testT][testB][SUM]);
    //console.log("count" + avgLookup[testT][testB][COUNT]);
    //console.log("EXAMPLE: " +  test);
}


function startPythonAna(){
    
    var l_f_param = {
        'tauRange': Number(lfTauRange),
        'timeResolution': Number(lfTimeResolution),
        'minSigni': Number(lfMinSigniL),
        'tStepIntervall': Number(lfTstepIntervall),
        'maxDist': Number(maxDist),
        'dataset': Number(animaltype)
    };

    //frag ob die datei existiert
    //Wenn ja => papaseData
    //sonst AJAX

    //"/../../../Python/Data/LFdata.csv"
    //

    $.get(getCSVPath())
    .done(function() {
        console.log("File Exists");
       // parseData(createVis);
    }).fail(function() {
        console.log("File did not Exist - task was sent to the server");
        $.ajax({
            url: '/lfOutput',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(l_f_param),
            success: function(response) {
                console.log(response);
               // parseData(createVis);
            }
        });
    })
}


function getCSVPath(){
    let d   = animaltype;
    let r   = lfTauRange;
    let st  = lfTimeResolution;
    let sig = lfMinSigniL;
    let i   = lfTstepIntervall;
    let di  = maxDist;

    let list = [d,r,st,sig,i,di];

    for (var val in list){
        if (typeof val === 'undefined'){
            return undefined;
        }
    }
  //  drawMatrixLegend();
    let url = "Python/Data/d"+d+"r"+r+"st"+st+"sig"+sig+"i"+i+"di"+di+".csv";
    return url;
}





function getShowStatus(iName ,jName ,deltaTime) {
    var i = idToIndexFunc(iName); // as bird Index starts with 1
    var j = idToIndexFunc(jName);
    let tLF = Math.round(deltaTime*datafreq);
    let id = myAnimalIndexSelected;
    var bool;

    if (pythonLFlookup[tLF][i][j][0] === undefined){
        bool = false;
    } else {
        bool = true;
    }

    if (myAnimalIndexSelected === undefined){
        //bool = pythonLFlookup[tLF][i][j];
    } else {
        if(i == id || j == id){
            //bool = pythonLFlookup[tLF][i][j];
        } else {
            bool = false;
        }
    }

    if (bool == undefined){
        bool = false;
        console.log("VALUE undefinded in getShowStatus")
    }

    return bool;
}



function idToIndexFunc (birdNameNumber){
    for (let index = 0; index < idToIndex.length; index++){
        var string = idToIndex[index]
        if (birdNameNumber === string){
            return index;
        }
    }
    console.log("something went wrong in the function: idToIndexFunc")
    return index
}


function colorFromZO(i,alpha){
    let c;
    if (myAnimalIndexSelected == i){
        c = birdColors[Math.round(4 - alpha * (birdColors.length / 2 - 1 ))];
    } else {
        c = birdColors[Math.round(birdColors.length / 2 + alpha* (birdColors.length / 2 - 1))];

    }
    return c;
}
