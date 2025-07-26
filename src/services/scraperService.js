const kakobuyScraper = require('../scrapers/KakobuyScraper');
const acbuyScraper = require('../scrapers/acbuyScraper');
const sugargooScraper = require('../scrapers/sugargooScraper');
const productScraper = require('../scrapers/productScraper');

function extractPriceData(priceStr) {
  if (!priceStr) return { priceCNY: null, priceUSD: null };
  const cnyMatch = priceStr.match(/￥\s*([\d.]+)/);
  const usdMatch = priceStr.match(/\$[\s]*([\d.]+)/);
  return {
    priceCNY: cnyMatch ? parseFloat(cnyMatch[1]) : null,
    priceUSD: usdMatch ? parseFloat(usdMatch[1]) : null,
  };
}

async function scrapeAllAgents(productUrl) {
  const scrapers = [
    productScraper.scrape(productUrl),
    acbuyScraper.scrape(productUrl),
    sugargooScraper.scrape(productUrl),
    kakobuyScraper.scrape(productUrl)
  ];

  const [productData, ...qcDataArray] = await Promise.all(scrapers);

  if (!productData) throw new Error('Failed to scrape product data');

  const { priceCNY, priceUSD } = extractPriceData(productData.price || '');

  const qcImages = qcDataArray
    .filter(Boolean)
    .flatMap(agentResult => agentResult.images || [])
    .filter(Boolean);

  return {
    title: productData.title || '',
    originalProductUrl: productData.originalProductUrl || productUrl,
    priceCNY,
    priceUSD,
    images: productData.images || [],
    seller: productData.agent || 'Taobao',
    qcImages
  };
}

module.exports = { scrapeAllAgents };
