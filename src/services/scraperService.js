const kakobuyScraper = require ('../scrapers/KakobuyScraper')
const acbuyScraper = require ('../scrapers/acbuyScraper')
const sugargooScraper = require ('../scrapers/sugargooScraper')
const productScraper = require ('../scrapers/productScraper')

const scrapers = [productScraper, acbuyScraper, sugargooScraper, kakobuyScraper];

async function scrapeAllAgents(productUrl) {
  const results = await Promise.all(
    scrapers.map((scraper) => scraper.scrape(productUrl))
  );

  const allResponses = results
    .filter(Boolean)
    .flat();

  return allResponses;
}

module.exports = { scrapeAllAgents };
