
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

const { Server } = require("socket.io");
var neo4j = require('neo4j-driver')

app.use(bodyParser.urlencoded({
	extended: false
}));

app.use(bodyParser.json());
// Add headers before the routes are defined
const allowedOrigins = ['http://localhost:4200','https://api.cdpdemodashboard.tk/socket.io/','https://api.cdpdemodashboard.tk','https://cdpdemodashboard.tk','https://cdpdemoportal.tk'];
app.use(function (req, res, next) {

    res.header('Access-Control-Allow-Origin', '*');
   // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");  

    
    // Request methods you wish to allow
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.header('Access-Control-Allow-Credentials', true);

    next();
});


router.post('/newcustomer', async (request, response) => {

    console.log(request.body)
    console.log(request.body["email"])

    try{
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
    
        io.emit("reload","world");
    
        console.log("User ingested");
        response.statusCode = 200;
        response.send("Webhook received");
    }
    catch (err) {
        io.emit("reload","world");
        response.statusCode = 400;
        response.send(err);

    }

   
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



app.use("/", router);



var options = {

	key: fs.readFileSync("./ssl/private.key"),

	cert: fs.readFileSync("./ssl/certificate.crt"),

};


http.createServer(app).listen(80);
const server = https.createServer(options, app).listen(443)

const io = new Server(server,{
    cors: {
      origin: "https://cdpdemodashboard.tk",
      methods: ["GET", "POST"]
    }
  });
io.on('connection', (socket) => {
    console.log('a user connected');
  });

io.on("connect_error", (err) => {
console.log(`connect_error due to ${err.message}`);
});
  

var driver = neo4j.driver(
  'bolt://neo4j.cdpdemodashboard.tk:7687',
  neo4j.auth.basic('neo4j', 'dt'), { encrypted: 'ENCRYPTION_OFF',   trust: "TRUST_SYSTEM_CA_SIGNED_CERTIFICATES", trustedCertificates:['./ssl/neo4j.crt']}
)
var session = driver.session()
session
  .run('MERGE (alice:Person {name : $nameParam}) RETURN alice.name AS name', {
    nameParam: 'Alice'
  })
  .subscribe({
    onKeys: keys => {
      console.log(keys)
    },
    onNext: record => {
      console.log(record.get('name'))
    },
    onCompleted: () => {
      session.close() // returns a Promise
    },
    onError: error => {
      console.log(error)
    }
  })

process.stdin.resume();//so the program will not close instantly

async function exitHandler(options, exitCode) {
    if (options.cleanup) 
    {
      console.log('clean');
      await driver.close()
    }
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));