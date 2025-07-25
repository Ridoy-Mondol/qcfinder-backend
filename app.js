const express = require('express');
const cors = require('cors');
const scraperRoutes = require('./src/routes/scraper.route');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/scrape', scraperRoutes);

module.exports = app;
