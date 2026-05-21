// Task CRUD routes. All endpoints are protected by JWT auth.
// The route handlers delegate to the store (Mongo or in-memory), which is
// resolved by the store factory. The pure functions remain the tested core
// used by the in-memory store.

const express = require("express");
const store = require("../store");
const { authenticate } = require("../middleware/auth");
const { tasksTotal } = require("../metrics");

const router = express.Router();

router.use(authenticate);

// List all tasks
router.get("/", async (req, res, next) => {
  try {
    const tasks = await store.list();
    res.json({ tasks, count: await store.count() });
  } catch (err) {
    next(err);
  }
});

// Create a task
router.post("/", async (req, res, next) => {
  try {
    const { text } = req.body || {};
    const created = await store.add(text);
    if (!created) {
      return res.status(400).json({ error: "Task text is required" });
    }
    tasksTotal.set(await store.count());
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Toggle completion
router.patch("/:id/toggle", async (req, res, next) => {
  try {
    const updated = await store.toggle(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete a task
router.delete("/:id", async (req, res, next) => {
  try {
    const removed = await store.remove(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Task not found" });
    }
    tasksTotal.set(await store.count());
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
