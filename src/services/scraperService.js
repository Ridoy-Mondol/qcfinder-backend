const kakobuyScraper = require ('../scrapers/KakobuyScraper')
const acbuyScraper = require ('../scrapers/acbuyScraper')
const productScraper = require ('../scrapers/productScraper')

const scrapers = [productScraper, acbuyScraper, kakobuyScraper];

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
