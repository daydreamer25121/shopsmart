const path = require("path");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

const { seedUsers } = require("./seedUsers");
const { seedProducts } = require("./seedProducts");
const { seedTransactions } = require("./seedTransactions");
const { seedReviews } = require("./seedReviews");

const User = require("../models/User");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const Review = require("../models/Review");
const Combo = require("../models/Combo");
const Ticket = require("../models/Ticket");
const Outfit = require("../models/Outfit");
const Order = require("../models/Order");

async function resetAll() {
  // Drop dependent collections first (demo ordering).
  await Outfit.deleteMany({});
  await Ticket.deleteMany({});
  await Combo.deleteMany({});
  await Review.deleteMany({});
  await Transaction.deleteMany({});
  await Order.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
}

async function main() {
  const reset = process.argv.includes("--reset");

  await connectDB();
  if (reset) await resetAll();

  // eslint-disable-next-line no-console
  console.log("[seeds] Seeding users...");
  await seedUsers();

  // eslint-disable-next-line no-console
  console.log("[seeds] Seeding products...");
  await seedProducts();

  // eslint-disable-next-line no-console
  console.log("[seeds] Seeding transactions...");
  await seedTransactions();

  // eslint-disable-next-line no-console
  console.log("[seeds] Seeding reviews...");
  await seedReviews();

  // eslint-disable-next-line no-console
  console.log("[seeds] done");
}

main()
  .then(() => {
    mongoose.connection.close();
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[seeds] failed:", err);
    mongoose.connection.close();
    process.exit(1);
  });

