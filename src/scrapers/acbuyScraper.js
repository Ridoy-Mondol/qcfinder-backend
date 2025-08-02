const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const Tesseract = require("tesseract.js");
const cheerio = require("cheerio");
const path = require("path");
const BaseScraper = require("./baseScraper");

const EMAIL = process.env.ACBUY_EMAIL;
const PASSWORD = process.env.ACBUY_PASS;

const extractInfoFromUrl = (url) => {
  const isTaobao = url.includes("taobao.com");
  const isWeidian = url.includes("weidian.com");

  let idMatch;
  if (isTaobao) {
    idMatch = url.match(/id=(\d+)/);
  } else if (isWeidian) {
    idMatch = url.match(
      /weidian\.com\/(?:item|product)\.html.*?(?:itemID|id)=(\d+)/
    );
  }

  if (!idMatch) throw new Error("Could not extract product ID");

  return {
    id: idMatch[1],
    source: isTaobao ? "TB" : "WD",
  };
};

const solveCaptcha = async (page, captchaSelector, savePath) => {
  console.log("🔍 Capturing captcha image...");
  const captchaElement = await page.$(captchaSelector);
  if (!captchaElement) throw new Error("Captcha image not found");

  await captchaElement.screenshot({ path: savePath });

  const {
    data: { text },
  } = await Tesseract.recognize(savePath, "eng", {
    logger: (m) => console.log(m.status),
  });

  const cleanedText = text.replace(/[^a-zA-Z0-9]/g, "").trim();
  console.log(`🧠 Captcha solved: "${cleanedText}"`);

  return cleanedText;
};

const searchAcbuy = async (originalUrl) => {
  const { id, source } = extractInfoFromUrl(originalUrl);
  const loginUrl = `https://www.acbuy.com/login?redirectUrl=%2Fproduct%3Fid%3D${id}%26source%3D${source}`;
  const targetUrl = `https://www.acbuy.com/product?id=${id}&source=${source}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      userDataDir: "./acbuy-session",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      slowMo: 50,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    page.on("error", (err) => console.error("🚨 Page crashed:", err));
    page.on("close", () => console.error("🚨 Page was closed unexpectedly"));
    browser.on("disconnected", () =>
      console.error("🚨 Browser was closed unexpectedly")
    );

    console.log("🌐 Navigating to login page...");
    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

    await new Promise((res) => setTimeout(res, 2000));

    const redirectedUrl = page.url();

    if (redirectedUrl.includes("/home")) {
      console.log("✅ Already logged in. Navigating to target page...");
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    } else if (redirectedUrl.includes("/login")) {
      console.log("📥 Filling in login form...");

      try {
        const emailSelector = 'input[placeholder="Email"]';
        await page.waitForSelector(emailSelector, {
          visible: true,
          timeout: 10000,
        });

        const emailInput = await page.$(emailSelector);
        if (!emailInput) throw new Error("Email input not found");

        console.log("➡️ Filling email...");
        await emailInput.focus();
        await new Promise((res) => setTimeout(res, 50));

        try {
          await page.evaluate(
            (selector, value) => {
              const input = document.querySelector(selector);
              if (input) {
                input.value = value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            },
            'input[placeholder="Email"]',
            EMAIL
          );

          console.log("✅ Email entered.");
        } catch (err) {
          console.error("❌ Email entered failed:", err.message);
          throw err;
        }

        console.log("➡️ Filling password...");

        try {
          await page.evaluate(
            (selector, value) => {
              const input = document.querySelector(selector);
              if (input) {
                input.value = value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            },
            'input[placeholder="Password"]',
            PASSWORD
          );

          console.log("✅ Password entered.");
        } catch (err) {
          console.error("❌ Password entry failed:", err.message);
          throw err;
        }
        console.log("✅ Password typed.");

        const captchaSelector = "img[data-v-2312fdb7]";
        const captchaPath = path.join(__dirname, "captcha.png");

        console.log("🧩 Solving captcha...");
        const captchaText = await solveCaptcha(
          page,
          captchaSelector,
          captchaPath
        );

        try {
          await page.evaluate(
            (selector, value) => {
              const input = document.querySelector(selector);
              if (input) {
                input.value = value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            },
            'input[placeholder="Verification code"]',
            captchaText
          );

          console.log("✅ Verification code entered.");
        } catch (err) {
          console.error("❌ Verification code entry failed:", err.message);
          throw err;
        }

        console.log("🔐 Clicking login button");
        await Promise.all([
          page.click("button.submit-button"),
          page.waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: 10000,
          }),
        ]);

        console.log("✅ Logged in successfully.");
      } catch (err) {
        console.error("❌ Error during login process:", err.message);
        return { error: "Captcha or login step failed", details: err.message };
      }
    } else {
      console.warn(`⚠️ Unexpected redirect: ${redirectedUrl}`);
      return { error: "Unexpected redirect", details: redirectedUrl };
    }

    const currentUrl = page.url();
    console.log("➡️ Redirected to:", currentUrl);

    console.log("🔍 Checking for QC section...");
    try {
      await page.waitForSelector(".qc-label", { timeout: 10000 });
    } catch (e) {
      console.log("🚫 No QC section found.");
      return {
        images: [],
      };
    }

    console.log("✅ QC section exists. Scraping images...");

    const html = await page.content();
    const $ = cheerio.load(html);

    const images = [];
    $("ul.small li img").each((_, img) => {
      const src = $(img).attr("src");
      if (
        src &&
        src.startsWith("https://oss.acbuy.com/") &&
        !src.includes("base64")
      ) {
        const cleanedSrc = src.split("?")[0].trim();
        images.push(cleanedSrc);
      }
    });

    console.log(`✅ Scraped ${images.length} QC images from Acbuy`);

    return {
      images,
    };
  } catch (err) {
    console.error("❌ Acbuy scraping failed:", err.message);
    return { error: "Scraping failed", details: err.message };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = new BaseScraper("Acbuy", searchAcbuy);
