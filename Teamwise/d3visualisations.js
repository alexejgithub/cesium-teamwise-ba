
let lineChartData = [];
let avgLinechartData = [];
let parseDate = d3.timeParse("%0d-%0m-%Y-%H-%M-%S");
let timeGranularity = 10; // time step size for testing fastest climb and speed (also used to update the leader's marking
let dataset = [ 5, 10, 15, 20, 25 ];  //testing data
let margin = {top: 5, right: 5, bottom: 5, left: 5};
let width = 250;
let height = 100 ;
let barPadding = 1; 


var svg = d3.select("svg");
var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var yChartMin = 0; //Min altitude for selected bird, i.e. lower value at start of y axis
var yChartMax = 1000; // Max

// General settinga e.g. to move a marker circle, domain is set once after reading data (further below)

var xMarker = d3.scaleTime()
                .rangeRound([0, width]);

var d3y = d3.scaleLinear()
            .rangeRound([height, 0]);
let minAlt = 10000;
let maxAlt = 0;



function showLineChart(dataEntities){
    let curTime = new Cesium.JulianDate; 
    let avgAlt = [];

    Cesium.JulianDate.clone(viewer.clock.startTime,curTime);
    for(let index in dataEntities){
        let endTime = viewer.clock.stopTime;
        let timeLine = [];
        while (Cesium.JulianDate.compare(curTime, endTime) < 0) {
            let currentAlt = dataEntities[index].position.getValue(curTime, new Cesium.Cartesian3());
            let height = Cesium.Cartographic.fromCartesian(currentAlt).height;
            if (height > maxAlt) maxAlt = height;
            if (height < minAlt) minAlt = height;
               
    
            let tmpDate = Cesium.JulianDate.toDate(curTime);
            let dateString = tmpDate.getDate()+"-"+tmpDate.getMonth()+"-"+tmpDate.getFullYear()+"-"+tmpDate.getHours()+"-"+tmpDate.getMinutes()+"-"+tmpDate.getSeconds();
            
            timeLine.push(
            {
                date: parseDate(dateString),
                //date: Cesium.JulianDate.toIso8601(curTime).split("T")[0],
                alt: height
            }
            );
            Cesium.JulianDate.addSeconds(curTime, timeGranularity, curTime);
            
        }
        lineChartData.push(timeLine);

    }

        // Calculate average height per timepoint
        var cTime = new Cesium.JulianDate; 
        Cesium.JulianDate.clone(viewer.clock.startTime,cTime);
        var eTime = viewer.clock.stopTime;
    
        // Now iterate through time
        while (Cesium.JulianDate.compare(cTime, eTime) <= 0) {
            let sumAlt = 0;
            for (var yz = 0; yz < dataEntities.length; yz++) {
                var cAlt = dataEntities[yz]._position.getValue(cTime, new Cesium.Cartesian3());
                var hght = Cesium.Cartographic.fromCartesian(cAlt).height;
                sumAlt += hght;
            }
            sumAlt /= dataEntities.length;
            avgAlt[avgAlt.length] = sumAlt;
            //console.log("avgAlt is here "+avgAlt);
                
            var tDate = Cesium.JulianDate.toDate(cTime);
            var dString = tDate.getDate()+"-"+tDate.getMonth()+"-"+tDate.getFullYear()+"-"+tDate.getHours()+"-"+tDate.getMinutes()+"-"+tDate.getSeconds();
            
            avgLinechartData.push(
            {
                date: parseDate(dString),
                //date: Cesium.JulianDate.toIso8601(curTime).split("T")[0],
                alt: sumAlt
            });
            
            Cesium.JulianDate.addSeconds(cTime, timeGranularity, cTime);    
        }
        
        lineChart(lineChartData[0],avgLinechartData)
}


function updateLineChart(index){
    lineChart(lineChartData[index],avgLinechartData);
}



function lineChart(data,avgdata) {
    
    //remove current line
    d3.selectAll("path.altline").remove();
    //remove current moving dot
    d3.select("circle.circo").remove();
         
    if  (data === undefined) return;
    
    // set up time scale ==> x
    let x = d3.scaleTime()
              .domain(d3.extent(data, function(d) { return d.date; }))
              .rangeRound([0, width]);

    let line = d3.line()
        .x(function(d) { return xMarker(d.date); })
        .y(function(d) { return d3y(d.alt); })
        .curve(d3.curveBasis);
        
   let avgLine = d3.line()
      .x(function(d) { return xMarker(d.date); })
      .y(function(d) { return d3y(d.alt); });
    //x.domain(d3.extent(data, function(d) { return d.date; }));
    d3y.domain([minAlt,maxAlt]);//d3.extent(data, function(d) { return d.alt; }));
    //avgLine.domain(d3.extent(data, function(d) { return d.avgAlt; }));
    
    //rang of Y axis 
    //yChartMin = d3.extent(d3y.domain())[0];
    //yChartMax = d3.extent(d3y.domain())[1];	
    
    // x axis 
    g.append("g")
     .attr("transform", "translate(0," + height + ")")
     .call(d3.axisBottom(x))
     .select(".domain")
     .remove();
    
    //y axis 
    g.append("g")
    .call(d3.axisLeft(d3y))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    //.attr("d3y", "0.71em") //
    .attr("text-anchor", "end")
    .text("Alt");
    
    //selected line path 
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 1.5)
      .attr("d", line)
      .attr("class","altline");
       
      //average line path
      g.append("path")
      .datum(avgdata)
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 1.5)
      .attr("d", avgLine)
      .attr("class","altline");

    //let parseDate = d3.timeParse("%0d-%0m-%Y-%H-%M-%S");					
                
    let c= g.append("circle")
            .attr("class","circo")
            .attr("cy",90)
            .attr("cx", 0)
            .attr("r", 2)
            .attr("fill","yellow")
            .attr("id","altdot");			  

}