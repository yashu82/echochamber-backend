//NPM packages
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient } = require('mongodb');
const { default: axios } = require('axios');

//js files
const auth = require('./auth');
const post = require('./posts');

//Code.
const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://main--ech0chamber.netlify.app', 'https://ech0chamber.netlify.app', 'https://9626f41b-6c7c-46b8-9fe2-78a47ffa3bf4.netlify.app'] // Replace with your frontend's origin
}));
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(bodyParser.text({ limit: '200mb' }));


let port = process.env.PORT
app.listen(8000 || port);

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri);
client.connect();

auth(app);
post(app);

function pingLink() {
    const linkToPing = 'https://echochamber-backend-77jt.onrender.com/test'; // Replace with the link you want to ping
    let data = axios.get(linkToPing)
    data.then(res => { })

}

// Ping the link every 11 minutes (10 minutes = 600,000 milliseconds)
const pingInterval = 15 * 60 * 1000;
setInterval(pingLink, pingInterval);

