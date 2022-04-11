const http = require('http');
const express = require("express");

require('dotenv').config()
const router = express.Router();
const app = express();
const axios = require('axios');
const bodyParser = require("body-parser");


const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

app.use(bodyParser.urlencoded({
	extended: false
}));

app.use(bodyParser.json());
// Add headers before the routes are defined
const allowedOrigins = ['http://localhost:4200', 'https://devopsinterview.app'];
app.use(function (req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");  

    // Pass to next layer of middleware
    next();
});

router.post('/newcustomer', (request, response) => {

    console.log(request.body)

    response.statusCode = 200;
    response.send("Webhook received");
});

router.get('/wordpressdb', async (request, response) => {

    const query = `SELECT *
    FROM \`cdptamrlytics.datasetFromTamr.known-users-2\`
    LIMIT 5`;

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: 'asia-southeast1',
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    // Print the results
    console.log('Rows:');
    rows.forEach(row => console.log(row));

    response.statusCode = 200;
    response.send(rows);

});

app.use("/", router);

http.createServer(app).listen(80);