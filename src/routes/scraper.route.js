const express = require('express');
const router = express.Router();
const { handleScrape } = require('../controllers/scraper.controller');

router.post('/', handleScrape);

module.exports = router;
