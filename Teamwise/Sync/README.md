# Bachlor-Project: Time Synchronization for Mutliple Cesium Instances
* Mentor, University: Dr. Karsten Klein, Universität Konstanz
* Student: Kim Lasse Rehberg


###  Abstract
This Implementation allows to synchronize multible Cesium Instances. It is easy to extend. It uses a websoecket server to synchronize one master-instance with multiple slave-intstances.

### Deploying the Application

* Download this Folder.
* Populate the web-config.js with your Bing Maps API Key.
 * To obtain your own Bing Maps API Key, please follow the steps given [here](https://msdn.microsoft.com/en-us/library/ff428642.aspx).
* cd into the directory of this repository.
* node server.js starts the WebSocket-Server
* Host this directory on a server.
  * On a Linux machine with an Apache server, it could be placed at /var/www/html/ the application can now be accessed at:
  * Master Display: http://YOURSERVER/cesium-lg/Master-Client.html
  * Slave Displays: http://YOURSERVER/cesium-lg/Slave-Client.html 

  * On Windows/Linux/Mac? machine you can use python2 with the command: python -m SimpleHTTPServer <port>
  * On Windows/Linux/Mac? machine you can use python3 with the command: py -m http.server <port>
  * In this case:
   * Master Display: localhost:<port>/Master-Client.html
   * Slave Displays: localhost:<port>/Slave-Client.html 

  on your web browser.


### How to add your code?
* add your java script file to js/examples/<myfile.js> . Be aware that the the line  "var viewer = new Cesium.Viewer('cesiumContainer');" is already defined outside this file.

* change the path in ../main.js so that it loads your file. Or just try the diffrent examples changing the path.

