const express = require("express");
const cors = require("cors");
const connectDB = require("./src/database/connection");
const scraperRoutes = require("./src/routes/scraper.route");

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use("/api", scraperRoutes);

module.exports = app;
