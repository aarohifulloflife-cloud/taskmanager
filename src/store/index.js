// Store factory. Selects the persistence implementation based on environment:
//   - Tests (NODE_ENV=test) or no MONGODB_URI  -> in-memory store
//   - MONGODB_URI present                       -> MongoDB via Mongoose
// This keeps CI fast and database-free while the deployed app uses MongoDB.

const useMongo = process.env.NODE_ENV !== "test" && !!process.env.MONGODB_URI;

module.exports = useMongo ? require("./mongoStore") : require("./memoryStore");
