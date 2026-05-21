// Authentication route. Issues a JWT for valid credentials.
// Credentials come from env vars so nothing secret is hard-coded.

const express = require("express");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

const DEMO_USER = process.env.DEMO_USER || "demo";
const DEMO_PASS = process.env.DEMO_PASS || "demo123";

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === DEMO_USER && password === DEMO_PASS) {
    const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

module.exports = router;
