class BaseScraper {
  constructor(agentName, searchFn) {
    this.agentName = agentName;
    this.searchFn = searchFn;
  }

  async scrape(productUrl) {
    return await this.searchFn(productUrl);
  }
}

module.exports = BaseScraper;
