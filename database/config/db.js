const mongoose = require("mongoose");
const path = require("path");

// Load root .env when running from this folder.
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_LOCAL_URI = process.env.MONGODB_LOCAL_URI || "mongodb://localhost:27017/shopsmart";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDB() {
  const debug = NODE_ENV === "development";
  if (debug) mongoose.set("debug", true);

  const atlasAttempts = 3;
  const localAttempts = 2;

  async function tryConnect(uri, attempts, label) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
      try {
        await mongoose.connect(uri, {
          // Important for predictable connection behavior.
          serverSelectionTimeoutMS: 10_000,
          maxPoolSize: 10,
        });
        // eslint-disable-next-line no-console
        console.log(`[db] Connected to ${label}`);
        return;
      } catch (err) {
        lastErr = err;
        // eslint-disable-next-line no-console
        console.warn(`[db] ${label} connect attempt ${i}/${attempts} failed: ${err.message}`);
        await sleep(1500 * i);
      }
    }
    throw lastErr;
  }

  // Prefer Atlas if provided; otherwise fall back immediately.
  if (MONGODB_URI) {
    try {
      await tryConnect(MONGODB_URI, atlasAttempts, "MongoDB Atlas");
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[db] Atlas connection failed, falling back to local: ${err.message}`);
    }
  }

  await tryConnect(MONGODB_LOCAL_URI, localAttempts, "MongoDB Local");
}

module.exports = { connectDB };

