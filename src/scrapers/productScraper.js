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

    await page.goto(kakobuyUrl, { waitUntil: "domcontentloaded" });

    await page.waitForSelector("span.item-title", { timeout: 30000 });

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

    let agent;
    if (originalUrl.includes("weidian.com")) agent = "Weidian";
    else if (originalUrl.includes("taobao.com")) agent = "Taobao";

    return {
      agent,
      title,
      price,
      images,
      originalProductUrl: originalUrl,
    };
  } catch (err) {
    console.error("Product scraping failed:", err.message);
    return { error: "Scraping failed", details: err.message };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = new BaseScraper("Kakobuy", searchKakobuy);















// const puppeteer = require("puppeteer");
// const cheerio = require("cheerio");
// const BaseScraper = require("./baseScraper");

// const searchKakobuy = async (originalUrl) => {
//   const encodedUrl = encodeURIComponent(originalUrl);
//   const kakobuyUrl = `https://www.kakobuy.com/item/details?url=${encodedUrl}`;

//   let browser;
//   try {
//     browser = await puppeteer.launch({
//       headless: false,
//       args: [
//         "--no-sandbox",
//         "--disable-setuid-sandbox",
//         "--disable-dev-shm-usage",
//         "--disable-blink-features=AutomationControlled",
//       ],
//     });

//     const page = await browser.newPage();

//     // Block only non-essential media (keep scripts)
//     await page.setRequestInterception(true);
//     page.on("request", (req) => {
//       const blockTypes = ["image", "stylesheet", "font"];
//       if (blockTypes.includes(req.resourceType())) {
//         req.abort();
//       } else {
//         req.continue();
//       }
//     });

//     // Spoof user-agent & navigator
//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
//     );
//     await page.evaluateOnNewDocument(() => {
//       Object.defineProperty(navigator, 'webdriver', { get: () => false });
//     });

//     await page.goto(kakobuyUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

//     // Wait for either the content OR fallback timeout
//     const found = await page
//       .waitForSelector("span.item-title", { timeout: 60000 })
//       .then(() => true)
//       .catch(() => false);

//     if (!found) {
//       throw new Error("Product title not found: possible bot detection or slow loading");
//     }

//     const html = await page.content();
//     const $ = cheerio.load(html);

//     const title = $("span.item-title").text().trim() || "N/A";
//     const price = $("span.sku-price").text().trim() || "N/A";

//     const images = [];
//     $("ul.item-imgs-box li.item-img img").each((_, img) => {
//       const src = $(img).attr("src");
//       if (src && !src.includes("base64")) {
//         images.push(src.trim());
//       }
//     });

//     let agent = "Unknown";
//     if (originalUrl.includes("weidian.com")) agent = "Weidian";
//     else if (originalUrl.includes("taobao.com")) agent = "Taobao";

//     return {
//       agent,
//       title,
//       price,
//       images,
//       originalProductUrl: originalUrl,
//     };
//   } catch (err) {
//     console.error("❌ Product scraping failed:", err.message);
//     return { error: "Scraping failed", details: err.message };
//   } finally {
//     if (browser) await browser.close();
//   }
// };

// module.exports = new BaseScraper("Kakobuy", searchKakobuy);
