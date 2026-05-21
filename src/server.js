// Server entry point. Connects to the store (MongoDB in production, no-op for
// in-memory) before starting to listen. Kept separate from app.js so tests can
// import the app without opening a port or a database connection.

const app = require("./app");
const store = require("./store");

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await store.connect();
    // eslint-disable-next-line no-console
    console.log("Store connected");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to the store:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Task Manager API listening on port ${PORT}`);
  });
})();
