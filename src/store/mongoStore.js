// MongoDB persistence layer via Mongoose. Used when MONGODB_URI is set
// (i.e. in the deployed app). Exposes the same async interface as the
// in-memory store, so the route handlers do not change.

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Guard against model recompilation in watch/dev mode
const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

// Normalise a Mongoose document into the same shape the API has always returned
function serialize(doc) {
  return { id: doc._id.toString(), text: doc.text, completed: doc.completed };
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  await mongoose.connect(uri);
}

async function disconnect() {
  await mongoose.disconnect();
}

async function list() {
  const docs = await Task.find().sort({ createdAt: 1 });
  return docs.map(serialize);
}

async function add(text) {
  if (!text || text.trim() === "") {
    return null;
  }
  const doc = await Task.create({ text: text.trim() });
  return serialize(doc);
}

async function remove(id) {
  try {
    const res = await Task.findByIdAndDelete(id);
    return !!res;
  } catch (err) {
    return false; // invalid id format
  }
}

async function toggle(id) {
  try {
    const doc = await Task.findById(id);
    if (!doc) return null;
    doc.completed = !doc.completed;
    await doc.save();
    return serialize(doc);
  } catch (err) {
    return null;
  }
}

async function count() {
  return Task.countDocuments();
}

async function reset() {
  await Task.deleteMany({});
}

module.exports = { connect, disconnect, list, add, remove, toggle, count, reset };
