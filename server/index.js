const http = require("http");
const dotenv = require("dotenv");
const path = require("path");
const { connectDB } = require("../database/config/db");
const createApp = require("./app");
const { Server } = require("socket.io");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const app = createApp();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });
  app.set("io", io);

  io.on("connection", (socket) => {
    socket.on("register", (userId) => {
      if (!userId) return;
      socket.join(String(userId));
    });
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[server] failed to start:", err);
  process.exit(1);
});

