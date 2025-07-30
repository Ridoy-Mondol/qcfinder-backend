// const { withLock } = require("../utils/sessionLock");
// const kakobuyScraper = require("../scrapers/KakobuyScraper");
// const acbuyScraper = require("../scrapers/acbuyScraper");
// const sugargooScraper = require("../scrapers/sugargooScraper");
// const productScraper = require("../scrapers/productScraper");

// function extractPriceData(priceStr) {
//   if (!priceStr) return { priceCNY: null, priceUSD: null };
//   const cnyMatch = priceStr.match(/￥\s*([\d.]+)/);
//   const usdMatch = priceStr.match(/\$[\s]*([\d.]+)/);
//   return {
//     priceCNY: cnyMatch ? parseFloat(cnyMatch[1]) : null,
//     priceUSD: usdMatch ? parseFloat(usdMatch[1]) : null,
//   };
// }

// function extractProductId(productUrl) {
//   const weidianMatch = productUrl.match(/itemID=(\d+)/i);
//   const taobaoMatch = productUrl.match(/id=(\d+)/i);
//   return weidianMatch?.[1] || taobaoMatch?.[1] || null;
// }

// function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// /**
//  * Safe scrape with retry on error (except 'no-images').
//  * @param {object} scraper
//  * @param {string} label
//  * @param {boolean} useLock
//  * @param {string} productUrl
//  * @param {number} attempt
//  */
// async function safeScrape(scraper, label, useLock, productUrl, attempt) {
//   try {
//     console.log(`🟡 [${label}] Try ${attempt}/2 starting...`);

//     const result = useLock
//       ? await withLock(label, () => scraper.scrape(productUrl))
//       : await scraper.scrape(productUrl);

//     if (
//       !result ||
//       !Array.isArray(result.images) ||
//       result.images.length === 0
//     ) {
//       console.log(`⚠️ [${label}] Try ${attempt}: No images found.`);
//       return { success: false, reason: "no-images", value: null };
//     }

//     console.log(
//       `✅ [${label}] Try ${attempt}: Scrape successful with ${result.images.length} images.`
//     );
//     return { success: true, value: result };
//   } catch (error) {
//     console.error(`❌ [${label}] Try ${attempt}: Error - ${error.message}`);
//     return { success: false, reason: "error", error };
//   }
// }

// async function safeProductScrape(scraper, label, productUrl, attempt) {
//   try {
//     console.log(`🟡 [${label}] Try ${attempt}/2 starting...`);
//     const result = await scraper.scrape(productUrl);
//     if (!result) {
//       console.log(`⚠️ [${label}] Try ${attempt}: No product metadata found.`);
//       return { success: false, reason: "no-data", value: null };
//     }
//     console.log(
//       `✅ [${label}] Try ${attempt}: Product metadata scrape successful.`
//     );
//     return { success: true, value: result };
//   } catch (error) {
//     console.error(`❌ [${label}] Try ${attempt}: Error - ${error.message}`);
//     return { success: false, reason: "error", error };
//   }
// }

// async function scrapeAllAgents(productUrl) {
//   const agents = [
//     { label: "kakobuy", scraper: kakobuyScraper, useLock: false },
//     { label: "acbuy", scraper: acbuyScraper, useLock: true },
//     { label: "sugargoo", scraper: sugargooScraper, useLock: true },
//   ];

//   // Run all scrapers including productScraper in parallel with retry on error (except no-images)
//   const results = await Promise.all([
//     // Product scraper with retry
//     (async () => {
//       let res = await safeProductScrape(
//         productScraper,
//         "productScraper",
//         productUrl,
//         1
//       );
//       if (!res.success && res.reason === "error") {
//         console.log("🔁 [productScraper] Retrying after error...");
//         await delay(500);
//         res = await safeProductScrape(
//           productScraper,
//           "productScraper",
//           productUrl,
//           2
//         );
//       }
//       return { label: "productScraper", result: res };
//     })(),

//     // Agent scrapers with retry
//     ...agents.map(({ label, scraper, useLock }) =>
//       (async () => {
//         let res = await safeScrape(scraper, label, useLock, productUrl, 1);
//         if (!res.success && res.reason === "error") {
//           console.log(`🔁 [${label}] Retrying after error...`);
//           await delay(500);
//           res = await safeScrape(scraper, label, useLock, productUrl, 2);
//         }
//         return { label, result: res };
//       })()
//     ),
//   ]);

//   // Collect results
//   const finalResults = {};
//   for (const { label, result } of results) {
//     finalResults[label] = result.success ? result.value : null;
//   }

//   // Log summary
//   console.log("\n📦 Final Scrape Results:");
//   for (const label of ["productScraper", ...agents.map((a) => a.label)]) {
//     const res = finalResults[label];
//     if (res) {
//       if (label === "productScraper") {
//         console.log(`✅ ${label}: Metadata scraped.`);
//       } else {
//         console.log(`✅ ${label}: ${res.images.length} images scraped.`);
//       }
//     } else {
//       console.log(`❌ ${label}: Failed to scrape.`);
//     }
//   }

//   const productResult = finalResults["productScraper"];
//   if (!productResult) throw new Error("Product scraper failed");

//   const { priceCNY, priceUSD } = extractPriceData(productResult.price || "");
//   const productId = extractProductId(productUrl);

//   const qcImages = [
//     ...(finalResults["kakobuy"]?.images || []),
//     ...(finalResults["acbuy"]?.images || []),
//     ...(finalResults["sugargoo"]?.images || []),
//   ].filter(Boolean);

//   return {
//     title: productResult.title || "",
//     originalProductUrl: productResult.originalProductUrl || productUrl,
//     productId,
//     priceCNY,
//     priceUSD,
//     images: productResult.images || [],
//     seller: productResult.agent || "Taobao",
//     qcImages,
//     scrapedAt: new Date(),
//   };
// }

// module.exports = { scrapeAllAgents };














// // scrapeAllAgents.js
// const { withLock } = require("../utils/sessionLock");
// const kakobuyScraper = require("../scrapers/KakobuyScraper");
// const acbuyScraper = require("../scrapers/acbuyScraper");
// const sugargooScraper = require("../scrapers/sugargooScraper");
// const productScraper = require("../scrapers/productScraper");

// function extractPriceData(priceStr) {
//   if (!priceStr) return { priceCNY: null, priceUSD: null };
//   const cnyMatch = priceStr.match(/\u00a5\s*([\d.]+)/);
//   const usdMatch = priceStr.match(/\$[\s]*([\d.]+)/);
//   return {
//     priceCNY: cnyMatch ? parseFloat(cnyMatch[1]) : null,
//     priceUSD: usdMatch ? parseFloat(usdMatch[1]) : null,
//   };
// }

// function extractProductId(productUrl) {
//   const weidianMatch = productUrl.match(/itemID=(\d+)/i);
//   const taobaoMatch = productUrl.match(/id=(\d+)/i);
//   return weidianMatch?.[1] || taobaoMatch?.[1] || null;
// }

// function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// async function runWithRetry(fn, label, maxAttempts = 2, delayMs = 500) {
//   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//     try {
//       console.log(`🟡 [${label}] Attempt ${attempt}`);
//       const result = await fn();

//       if (
//         !result ||
//         (Array.isArray(result.images) && result.images.length === 0)
//       ) {
//         const reason = Array.isArray(result.images)
//           ? "no-images"
//           : "no-data";
//         console.warn(`⚠️ [${label}] ${reason}`);
//         continue;
//       }

//       console.log(`✅ [${label}] Success`);
//       return { success: true, value: result };
//     } catch (err) {
//       console.error(`❌ [${label}] Attempt ${attempt} failed:`, err.message);
//       if (attempt < maxAttempts) await delay(delayMs);
//     }
//   }
//   return { success: false };
// }

// async function scrapeAllAgents(productUrl) {
//   const tasks = {
//     productScraper: () =>
//       runWithRetry(
//         () => productScraper.scrape(productUrl),
//         "productScraper"
//       ),

//     kakobuy: () =>
//       runWithRetry(
//         () => kakobuyScraper.scrape(productUrl),
//         "kakobuy"
//       ),

//     acbuy: () =>
//       runWithRetry(
//         () => withLock("acbuy", () => acbuyScraper.scrape(productUrl)),
//         "acbuy"
//       ),

//     sugargoo: () =>
//       runWithRetry(
//         () => withLock("sugargoo", () => sugargooScraper.scrape(productUrl)),
//         "sugargoo"
//       ),
//   };

//   const taskEntries = Object.entries(tasks);
//   const results = await Promise.all(
//     taskEntries.map(async ([label, fn]) => {
//       const res = await fn();
//       return { label, result: res };
//     })
//   );

//   const final = {};
//   for (const { label, result } of results) {
//     final[label] = result.success ? result.value : null;
//   }

//   console.log("\n📦 Final Summary:");
//   for (const { label } of results) {
//     if (final[label]) {
//       const info =
//         label === "productScraper"
//           ? "Metadata scraped"
//           : `${final[label].images?.length || 0} images scraped`;
//       console.log(`✅ ${label}: ${info}`);
//     } else {
//       console.log(`❌ ${label}: Failed`);
//     }
//   }

//   const productResult = final.productScraper;
//   if (!productResult) throw new Error("Product metadata not found");

//   const { priceCNY, priceUSD } = extractPriceData(productResult.price || "");
//   const productId = extractProductId(productUrl);

//   const qcImages = [
//     ...(final.kakobuy?.images || []),
//     ...(final.acbuy?.images || []),
//     ...(final.sugargoo?.images || []),
//   ].filter(Boolean);

//   return {
//     title: productResult.title || "",
//     originalProductUrl: productResult.originalProductUrl || productUrl,
//     productId,
//     priceCNY,
//     priceUSD,
//     images: productResult.images || [],
//     seller: productResult.agent || "Taobao",
//     qcImages,
//     scrapedAt: new Date(),
//   };
// }

// module.exports = { scrapeAllAgents };












const { withLock } = require("../utils/sessionLock");
const kakobuyScraper = require("../scrapers/KakobuyScraper");
const acbuyScraper = require("../scrapers/acbuyScraper");
const sugargooScraper = require("../scrapers/sugargooScraper");
const productScraper = require("../scrapers/productScraper");

function extractPriceData(priceStr) {
  if (!priceStr) return { priceCNY: null, priceUSD: null };
  const cnyMatch = priceStr.match(/￥\s*([\d.]+)/);
  const usdMatch = priceStr.match(/\$[\s]*([\d.]+)/);
  return {
    priceCNY: cnyMatch ? parseFloat(cnyMatch[1]) : null,
    priceUSD: usdMatch ? parseFloat(usdMatch[1]) : null,
  };
}

function extractProductId(productUrl) {
  const weidianMatch = productUrl.match(/itemID=(\d+)/i);
  const taobaoMatch = productUrl.match(/id=(\d+)/i);
  return weidianMatch?.[1] || taobaoMatch?.[1] || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeScrape(scraper, label, useLock, productUrl, attempt) {
  try {
    console.log(`🟡 [${label}] Try ${attempt}/2 starting...`);

    const result = useLock
      ? await withLock(label, () => scraper.scrape(productUrl))
      : await scraper.scrape(productUrl);

    if (!result || !Array.isArray(result.images) || result.images.length === 0) {
      console.log(`⚠️ [${label}] Try ${attempt}: No images found.`);
      return { success: false, reason: "no-images", value: null };
    }

    console.log(`✅ [${label}] Try ${attempt}: Scrape successful with ${result.images.length} images.`);
    return { success: true, value: result };
  } catch (error) {
    console.error(`❌ [${label}] Try ${attempt}: Error - ${error.message}`);
    return { success: false, reason: "error", error };
  }
}

async function safeProductScrape(scraper, label, productUrl, attempt) {
  try {
    console.log(`🟡 [${label}] Try ${attempt}/2 starting...`);
    const result = await scraper.scrape(productUrl);
    if (!result) {
      console.log(`⚠️ [${label}] Try ${attempt}: No product metadata found.`);
      return { success: false, reason: "no-data", value: null };
    }
    console.log(`✅ [${label}] Try ${attempt}: Product metadata scrape successful.`);
    return { success: true, value: result };
  } catch (error) {
    console.error(`❌ [${label}] Try ${attempt}: Error - ${error.message}`);
    return { success: false, reason: "error", error };
  }
}

async function scrapeAllAgents(productUrl) {
  const agents = [
    { label: "kakobuy", scraper: kakobuyScraper, useLock: false },
    { label: "acbuy", scraper: acbuyScraper, useLock: true },
    { label: "sugargoo", scraper: sugargooScraper, useLock: true },
  ];

  const results = await Promise.all([
    // Product scraper with retry
    (async () => {
      let res = await safeProductScrape(productScraper, "productScraper", productUrl, 1);
      if (!res.success && res.reason === "error") {
        console.log("🔁 [productScraper] Retrying after error...");
        await delay(500);
        res = await safeProductScrape(productScraper, "productScraper", productUrl, 2);
      }
      return { label: "productScraper", result: res };
    })(),

    // Agent scrapers with retry
    ...agents.map(({ label, scraper, useLock }) =>
      (async () => {
        let res = await safeScrape(scraper, label, useLock, productUrl, 1);
        if (!res.success && res.reason === "error") {
          console.log(`🔁 [${label}] Retrying after error...`);
          await delay(500);
          res = await safeScrape(scraper, label, useLock, productUrl, 2);
        } else if (!res.success && res.reason === "no-images") {
          // No retry if the reason is no images
          console.log(`🚫 [${label}] Not retrying due to no-images.`);
        }
        return { label, result: res };
      })()
    ),
  ]);

  const finalResults = {};
  for (const { label, result } of results) {
    finalResults[label] = result.success ? result.value : null;
  }

  console.log("\n📦 Final Scrape Results:");
  for (const label of ["productScraper", ...agents.map((a) => a.label)]) {
    const res = finalResults[label];
    if (res) {
      if (label === "productScraper") {
        console.log(`✅ ${label}: Metadata scraped.`);
      } else {
        console.log(`✅ ${label}: ${res.images.length} images scraped.`);
      }
    } else {
      console.log(`❌ ${label}: Failed to scrape.`);
    }
  }

  const productResult = finalResults["productScraper"];
  if (!productResult) throw new Error("Product scraper failed");

  const { priceCNY, priceUSD } = extractPriceData(productResult.price || "");
  const productId = extractProductId(productUrl);

  const qcImages = [
    ...(finalResults["kakobuy"]?.images || []),
    ...(finalResults["acbuy"]?.images || []),
    ...(finalResults["sugargoo"]?.images || []),
  ].filter(Boolean);

  return {
    title: productResult.title || "",
    originalProductUrl: productResult.originalProductUrl || productUrl,
    productId,
    priceCNY,
    priceUSD,
    images: productResult.images || [],
    seller: productResult.agent || "Taobao",
    qcImages,
    scrapedAt: new Date(),
  };
}

module.exports = { scrapeAllAgents };
