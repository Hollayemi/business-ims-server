require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const { pollSync } = require("./utils/sync-continuous");
const { checkInternet } = require("./utils/checkOnline");

const PORT = process.env.PORT || 5000;

let syncing = false;

/**
 * Monitor Internet & Sync Jobs
 */
async function monitorConnection() {
  const online = await checkInternet();


  if (online && mongoose.connection.readyState !== 1) {
    console.log("🌍 Internet back. Trying DB reconnect...");
    connectDB(); // ensure DB tries to reconnect
  }

  if (online && !syncing) {
    console.log("✅ Internet detected. Starting sync...");
    syncing = true;
    // await pollSync();
  } else if (!online && syncing) {
    console.log("❌ Internet lost. Sync paused.");
    syncing = false;
  }
}

// // Check every 1 minute
// setInterval(monitorConnection, 60_000);
// // Run immediately at startup
// monitorConnection();

/**
 * Connect to MongoDB with retry
 */
async function connectDB() {
  try {
    await mongoose.connect("mongodb+srv://stephanyemmitty:_Holla83626@cluster0.pb3wcml.mongodb.net/business-ims", {
      serverSelectionTimeoutMS: 5000, // 5s timeout
    });
    console.log("✅ Database connected");

    // Start server only once
    if (!app.listening) {
      app.listen(PORT, '0.0.0.0', () => {
        app.listening = true; // custom flag
        console.log(`🚀 Server running on port ${PORT}`);
      });
    }
  } catch (err) {
    console.error("❌ DB Connection failed:", err.message);
    setTimeout(connectDB, 10_000); // retry after 10s
  }
}

// Handle DB connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected. Retrying...");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected!");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

// Initial connect
connectDB();
