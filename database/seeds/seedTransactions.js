const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

function sampleUnique(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

async function seedTransactions() {
  const products = await Product.find({}, { _id: 1 });
  const customers = await User.find({ role: "USER" }, { _id: 1 });

  if (!products.length || !customers.length) throw new Error("Run seedProducts and seedUsers first.");

  const total = 200;
  const productIds = products.map((p) => p._id);
  const customerIds = customers.map((c) => c._id);

  for (let i = 0; i < total; i++) {
    const userId = customerIds[randomInt(0, customerIds.length - 1)];
    const itemsCount = randomInt(2, 4);
    const picked = sampleUnique(productIds, itemsCount);

    const daysAgo = randomInt(0, 90);
    const hours = randomInt(0, 23);
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);

    await Transaction.updateOne(
      { userId, productIds: picked, timestamp },
      { $set: { userId, productIds: picked, timestamp } },
      { upsert: true }
    );
  }
}

module.exports = { seedTransactions };

