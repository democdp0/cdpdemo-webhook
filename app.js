const http = require('http');
const express = require("express");

require('dotenv').config()
const router = express.Router();
const app = express();
const axios = require('axios');


const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery();


router.post('/wordpressdb', async (request, response) => {

    const query = `SELECT *
    FROM \`cdptamrlytics.datasetFromTamr.known-users-2\`
    LIMIT 10`;

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