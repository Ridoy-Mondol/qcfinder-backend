const Product = require("../models/Product");

const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    if (isNaN(page) || page < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Page must be a positive integer" });
    }
    const limit = 20;

    const skip = (page - 1) * limit;

    const products = await Product.find({})
      .sort({ scrapedAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();
    const hasMore = skip + products.length < total;

    res.json({
      success: true,
      page,
      hasMore,
      total,
      products,
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
};

module.exports = { getProducts };
