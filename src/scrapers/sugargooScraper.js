const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const cheerio = require("cheerio");
const path = require("path");
const BaseScraper = require("./baseScraper");
const { solveCaptchaWithFCB } = require("../services/fcbSolver");

const EMAIL = process.env.SUGARGOO_EMAIL;
const PASSWORD = process.env.SUGARGOO_PASS;

const encodeSugargooUrl = (url) =>
  `https://www.sugargoo.com/productDetail?productLink=${encodeURIComponent(
    url
  )}`;

const solveCaptcha = async (page, selector, savePath) => {
  console.log("🔍 Capturing captcha image from sugargoo...");
  const element = await page.$(selector);
  if (!element) throw new Error("Captcha image not found in sugargoo");

  const rawPath = savePath.replace(".png", "-raw.png");

  await element.screenshot({ path: rawPath });

  try {
    const fcbText = await solveCaptchaWithFCB(rawPath);
    if (fcbText && fcbText.length >= 4) {
      console.log(`🧠 FCB Captcha Solved: "${fcbText}"`);
      return fcbText;
    } else {
      throw new Error("FCB failed or returned short result");
    }
  } catch (err) {
    console.error("❌ FreeCaptchaBypass failed:", err.message);
    throw new Error("Captcha solving failed. Try again.");
  }
};

const searchSugargoo = async (originalUrl) => {
  const targetUrl = encodeSugargooUrl(originalUrl);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: "./sugargoo-session",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      slowMo: 50,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    console.log("🌐 Navigating to product or login page in sugargoo...");
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await new Promise((res) => setTimeout(res, 5000));

    const redirectedUrl = page.url();
    if (!redirectedUrl.includes("/login")) {
      console.log("✅ Already logged in sugaroo. Proceeding to scrape...");
    } else {
      console.log("📥 Filling in login form sugargoo...");

      await page.waitForSelector("#basic_username", { timeout: 10000 });

      // Solve captcha first
      const captchaPath = path.join(__dirname, "sugargoo-captcha.png");
      const captchaText = await solveCaptcha(page, ".image img", captchaPath);

      // Fill all inputs via direct JS
      await page.evaluate(
        ({ email, password, captcha }) => {
          const setInputValue = (selector, value) => {
            const input = document.querySelector(selector);
            if (input) {
              input.value = value;
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
          };

          setInputValue("#basic_username", email);
          setInputValue("#basic_password", password);
          setInputValue("#basic_code", captcha);
        },
        { email: EMAIL, password: PASSWORD, captcha: captchaText }
      );

      console.log("✅ Filled email, password, and captcha directly via JS.");

      // Check "Stay logged in"
      const checkboxChecked = await page.$eval(
        "#basic_remember",
        (el) => el.checked
      );
      if (!checkboxChecked) {
        await page.click("#basic_remember");
        console.log("✅ 'Stay logged in' checkbox checked sugargoo");
      }

      // Click login button
      console.log("🔐 Clicking login button in sugargoo");
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: 15000,
        }),
      ]);
      console.log("✅ Logged in successfully in sugargoo.");
    }

    // Wait for QC image section
    console.log(
      "🔍 Waiting for QC section: 'Photos of recent purchases in sugargoo'..."
    );

    try {
      await page.waitForFunction(
        () =>
          !!document.querySelector(".photos-title p.text-bold") &&
          document
            .querySelector(".photos-title p.text-bold")
            .innerText.includes("Photos of recent purchases"),
        { timeout: 10000 }
      );
      console.log("✅ 'Photos of recent purchases' section found in sugargoo.");
    } catch (e) {
      console.warn("🚫 QC section not found in sugargoo.");
      return {
        agent: "Sugargoo",
        images: [],
        originalProductUrl: originalUrl,
        agentProductUrl: page.url(),
        message: "No QC images found",
      };
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const images = [];
    $(".photos-cont .ant-image img.ant-image-img").each((_, img) => {
      const src = $(img).attr("src");
      if (src && src.startsWith("https://") && !src.includes("base64")) {
        images.push(src.trim());
      }
    });

    console.log(`✅ Scraped ${images.length} images from Sugargoo`);
    return {
      agent: "Sugargoo",
      images,
      originalProductUrl: originalUrl,
      agentProductUrl: page.url(),
    };
  } catch (err) {
    console.error("❌ Sugargoo scraping failed:", err.message);
    return { error: "Scraping failed", details: err.message };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = new BaseScraper("Sugargoo", searchSugargoo);
