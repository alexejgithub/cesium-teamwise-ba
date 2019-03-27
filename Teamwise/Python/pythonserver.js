
var bodyParser = require('body-parser');




function myFunc(app,fs){
    //<PS
    app.use(bodyParser.json()); //line 62
    //PS>
    console.log("Test was loaded");

    app.post('/lfOutput', function(req, res) {
        //console.log(req.body);


        var l_f_param = req.body;


        //start.js
        var spawn = require('child_process').spawn,
            py    = spawn('python', ['Python/Ana/compute_input.py']),
            dataString = '';

        console.log(l_f_param);

        py.stdout.on('data', function(data){
          dataString += data.toString(); //data.toString
        });

        py.stdout.on('end', function(){
            var str = dataString;
            str = str.replace(/\s/g, '');
            str = str.replace(/\'/g, '');
            str = str.replace(/\],\[/g, '\n');
            str = str.replace(/\]/g, '');
            str = str.replace(/\[/g, '');



            let d   = l_f_param.dataset;
            let r   = l_f_param.tauRange;
            let st  = l_f_param.timeResolution;
            let sig = l_f_param.minSigni;
            let i   = l_f_param.tStepIntervall;
            let di   = l_f_param.maxDist;

            //fs.writeFile("Python/Data/LFdata.csv", str, function(err) {
            fs.writeFile("Teamwise/Python/Data/d"+d+"r"+r+"st"+st+"sig"+sig+"i"+i+"di"+di+".csv", str, function(err) {
                if(err) {
                    return console.log(err);
                }

                console.log("The file was saved!");
            });

            console.log(str)
            console.log("send Response to Python l_f_request");
            res.send("SUCCESS");
        });
        py.stdin.write(JSON.stringify(l_f_param));
        py.stdin.end();
        console.log("l_f_request send from python module")




        //setTimeout(function() {
        //    res.send(lfOutput);
        //}, 2000);

    });




}

module.exports.myFunc = myFunc;
