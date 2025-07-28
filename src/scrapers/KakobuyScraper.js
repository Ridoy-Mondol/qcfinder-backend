const puppeteer = require("puppeteer");
const BaseScraper = require("./baseScraper");
const cheerio = require("cheerio");

const searchViaKakobuySpreadsheet = async (originalUrl) => {
  console.log("🔍 Kakobuy: Starting scraping for URL:", originalUrl);
  const encodedUrl = encodeURIComponent(originalUrl);
  const targetUrl = `https://kakobuy-spreadsheet.com/features/kakobuy-qc-images?url=${encodedUrl}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle2" });
    console.log("📡 Kakobuy: Navigated to target URL");

    await page.waitForSelector(
      "div.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3",
      { timeout: 5000 }
    );
    console.log("✅ Kakobuy: Selector loaded, starting to scrape content");

    const html = await page.content();
    const $ = cheerio.load(html);

    const images = [];
    $(
      "div.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3 div.group img"
    ).each((_, img) => {
      const src = $(img).attr("src");
      if (src && src.includes("/_next/image")) {
        const urlMatch = src.match(/url=([^&]+)&/);
        if (urlMatch && urlMatch[1]) {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          images.push(decodedUrl);
        }
      }
    });
    console.log(`📸 Kakobuy: Found ${images.length} QC images`);

    return {
      images,
    };
  } catch (err) {
    console.error("Kakobuy Spreadsheet scraping failed:", err.message);
    return { error: "Scraping failed", details: err.message };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = new BaseScraper(
  "KakobuySpreadsheet",
  searchViaKakobuySpreadsheet
);
