const { scrapeAllAgents } = require('../services/scraperService');

const handleScrape = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const data = await scrapeAllAgents(url);
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('Scraping controller error:', err);
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
};

module.exports = { handleScrape };
