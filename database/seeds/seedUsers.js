const bcrypt = require("bcryptjs");
const User = require("../models/User");

const SEED_PASSWORD = "password123";

const ROLE_CONFIG = [
  { role: "OWNER", email: "owner@shopsmart.com", name: "ShopSmart Owner" },
  { role: "SELLER", email: "seller@shopsmart.com", name: "ShopSmart Seller" },
  { role: "ANALYST", email: "analyst@shopsmart.com", name: "ShopSmart Analyst" },
  { role: "CARE", email: "care@shopsmart.com", name: "ShopSmart Care" },
  { role: "USER", email: "user@shopsmart.com", name: "ShopSmart Customer" },
];

const SKIN_TONES = ["Fair", "Wheatish", "Medium Brown", "Dark Brown"];

const FIRST_NAMES = ["Aarav", "Ishaan", "Kiara", "Vihaan", "Anaya", "Riya", "Kabir", "Meera", "Arjun", "Sana"];
const LAST_NAMES = ["Sharma", "Verma", "Singh", "Gupta", "Nair", "Iyer", "Khan", "Patel", "Reddy", "Kapoor"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seedCustomerEmail(i) {
  return `user${i}@shopsmart.com`;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const cfg of ROLE_CONFIG) {
    // eslint-disable-next-line no-await-in-loop
    await User.updateOne(
      { email: cfg.email },
      { $set: { role: cfg.role, name: cfg.name, passwordHash } },
      { upsert: true }
    );
  }

  // Additional mock customers for Naive Bayes training set.
  const MOCK_CUSTOMERS = 500;
  const docsToInsert = [];

  for (let i = 1; i <= MOCK_CUSTOMERS; i++) {
    docsToInsert.push({
      role: "USER",
      name: `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`,
      email: seedCustomerEmail(i),
      passwordHash,
      skinTone: randomFrom(SKIN_TONES),
      purchaseHistory: [],
    });
  }

  // Upsert by email to avoid duplicates across --reset-less runs.
  // Note: seed runner handles --reset separately, but this keeps reruns safe.
  for (const doc of docsToInsert) {
    // eslint-disable-next-line no-await-in-loop
    await User.updateOne({ email: doc.email }, { $set: doc }, { upsert: true });
  }
}

module.exports = { seedUsers, SEED_PASSWORD };

