const axios = require("axios");
const fs = require("fs");

const FCB_IN_URL = "https://freecaptchabypass.com/in.php";
const FCB_RES_URL = "https://freecaptchabypass.com/res.php";

async function solveCaptchaWithFCB(imagePath) {
  const apiKey = process.env.FCB_KEY;
  const imgBase64 = fs.readFileSync(imagePath, "base64");

  // Step 1: submit the captcha
  const { data: submit } = await axios.post(FCB_IN_URL, null, {
    params: {
      key: apiKey,
      method: "base64",
      body: imgBase64,
      json: 1,
    },
  });
  if (submit.status !== 1)
    throw new Error("FCB submit failed: " + submit.request);
  const taskId = submit.request;

  // Step 2: poll for the result
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const { data: res } = await axios.get(FCB_RES_URL, {
      params: { key: apiKey, action: "get", id: taskId, json: 1 },
    });
    if (res.status === 1) return res.request;
    if (res.request !== "CAPCHA_NOT_READY")
      throw new Error("FCB solve error: " + res.request);
  }

  throw new Error("FCB solve timeout");
}

module.exports = { solveCaptchaWithFCB };
