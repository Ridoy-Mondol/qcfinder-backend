const { scrapeAllAgents } = require("../services/scraperService");
const ProductModel = require("../models/Product");

const handleScrape = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    // 🔍 Check in DB first
    const existing = await ProductModel.findOne({ originalProductUrl: url });

    if (existing) {
      console.log("✅ Found in database");
      return res.json({ success: true, data: existing });
    }

    const data = await scrapeAllAgents(url);
    if (!data || Object.keys(data).length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No products found" });
    }

    // ❗ Check for qcImages
    if (!Array.isArray(data.qcImages) || data.qcImages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No QC images found",
        data,
      });
    }

    res.json({ success: true, data });

    setImmediate(async () => {
      const maxRetries = 3;
      let attempt = 0;

      const delay = (ms) => new Promise((res) => setTimeout(res, ms));

      while (attempt < maxRetries) {
        try {
          await ProductModel.create({ ...data, scrapedAt: new Date() });
          console.log("✅ Scraped product saved in background");
          break;
        } catch (err) {
          attempt++;
          console.error(
            `❌ Background DB save failed (attempt ${attempt}):`,
            err.message
          );

          if (attempt < maxRetries) {
            await delay(1000 * attempt); // exponential backoff (1s, 2s, 3s)
          } else {
            console.error("❌ Max retry limit reached. Data not saved.");
          }
        }
      }
    });
  } catch (err) {
    console.error("Scraping controller error:", err);
    res.status(500).json({ error: "Scraping failed", details: err.message });
  }
};

module.exports = { handleScrape };
