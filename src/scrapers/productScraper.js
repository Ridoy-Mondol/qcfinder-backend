const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const BaseScraper = require("./baseScraper");

const searchKakobuy = async (originalUrl) => {
  const encodedUrl = encodeURIComponent(originalUrl);
  const kakobuyUrl = `https://www.kakobuy.com/item/details?url=${encodedUrl}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.goto(kakobuyUrl, { waitUntil: "networkidle2" });

    await page.waitForSelector("span.item-title", { timeout: 15000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const title = $("span.item-title").text().trim() || "N/A";

    const price = $("span.sku-price").text().trim() || "N/A";

    const images = [];
    $("ul.item-imgs-box li.item-img img").each((_, img) => {
      const src = $(img).attr("src");
      if (src && !src.includes("base64")) {
        images.push(src.trim());
      }
    });

    let agent = "Kakobuy";
    if (originalUrl.includes("weidian.com")) agent = "Weidian (via Kakobuy)";
    else if (originalUrl.includes("taobao.com")) agent = "Taobao (via Kakobuy)";

    return {
      agent,
      title,
      price,
      images,
      originalProductUrl: originalUrl,
      agentProductUrl: kakobuyUrl,
    };
  } catch (err) {
    console.error("Kakobuy scraping failed:", err.message);
    return { error: "Scraping failed", details: err.message };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = new BaseScraper("Kakobuy", searchKakobuy);
