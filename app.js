
var WebSocketServer = require('websocket').server;
const http = require('http');
const express = require("express");
const https = require('https');
require('dotenv').config()
const router = express.Router();
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");
var fs = require('fs');

const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

app.use(bodyParser.urlencoded({
	extended: false
}));

app.use(bodyParser.json());
// Add headers before the routes are defined
const allowedOrigins = ['http://localhost:4200'];
app.use(function (req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");  

    // Pass to next layer of middleware
    next();
});

router.post('/newcustomer', async (request, response) => {

    console.log(request.body)
    console.log(request.body["email"])

    const query = `INSERT INTO
    \`cdptamrlytics.datasetFromTamr.known-users-2\` (Address,
      Name,
      Email,
      city,
      country,
      primaryKey,
      date)
  VALUES
    ('`+request.body["billing"]["address_1"]+`','`+request.body["first_name"]+`','`+request.body["email"]+`','`+request.body["billing"]["city"]+`','`+request.body["billing"]["country"]+`',34,CURRENT_TIMESTAMP())`;

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: 'asia-southeast1',
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    //console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    console.log("User ingested");
    response.statusCode = 200;
    response.send("Webhook received");
});

router.get('/wordpressdb', async (request, response) => {

    const query = `SELECT *
    FROM \`cdptamrlytics.datasetFromTamr.known-users-2\`
    ORDER BY date DESC
    LIMIT 5`;

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: 'asia-southeast1',
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    //console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    // Print the results
    //console.log('Rows:');
    // rows.forEach(row => console.log(row));

    response.statusCode = 200;
    response.send(rows);

});


const ws = new WebSocket('ws://api.cdpdemodashboard.tk/ws');

ws.on('open', function open() {
  ws.send('something');
});

ws.on('message', function message(data) {
  console.log('received: %s', data);
});




app.use("/", router);



var options = {

	key: fs.readFileSync("./ssl/private.key"),

	cert: fs.readFileSync("./ssl/certificate.crt"),

};


http.createServer(app).listen(80);
https.createServer(options, app).listen(443)


var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});