
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

    }
    catch (err) {
        io.emit("reload","world");
        response.statusCode = 400;
        response.send(err);

    }

    let config = {
      headers: {
        Authorization: "Basic bmVvNGo6ZHQ=",
      }
    }

    let data = {
      "statements": [
        {
          "statement": "MERGE  (p:Person {email:'"+request.body["email"]+"' }) SET p.first_name = '"+request.body["first_name"]+"' SET p.last_name = '"+request.body["last_name"]+"'"
        }
      ]
    }

    axios
		.post('https://neo4j.cdpdemodashboard.tk:7473/db/data/transaction/commit', data,config)
		.then(res => {
			response.statusCode = 200;
			response.send("ok");
		})
		.catch(error => {
			console.error(error)
			response.statusCode = 401;
			response.send(error);
		})

   
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


let data = {
  "statements": [
    {
      "statement": "MERGE  (p:Person {email:'purdy.dasia@osinski.com' }) SET p.first_name = 'Fan' SET p.last_name = 'Zheng Min'"
    }
  ]
}

axios
.post('https://neo4j.cdpdemodashboard.tk:7473/db/data/transaction/commit', data,config)
.then(res => {
  response.statusCode = 200;
  response.send("ok");
})
.catch(error => {
  console.error(error)
  response.statusCode = 401;
  response.send(error);
})




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
  
