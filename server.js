// ═══════════════════════════════════════════════════
//  YSIM — Your Secret Is Mine
//  Server — Node.js + Express
//  By Fashipe Oluwadamilare Ayoola
// ═══════════════════════════════════════════════════

require("dotenv").config();
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── In-memory message store ──────────────────────────
// Format: { id: { ciphertext, iv, salt, algo, expiry, passHash, read } }
const messageStore = new Map();

// ── Cleanup expired messages every 60 seconds ────────
setInterval(() => {
  const now = Date.now();
  for (const [id, msg] of messageStore.entries()) {
    if (msg.expiry && now > msg.expiry) {
      messageStore.delete(id);
    }
  }
}, 60 * 1000);

// ══════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════

// ── Store encrypted message ──────────────────────
app.post("/api/message", (req, res) => {
  const { ciphertext, iv, salt, algo, expiryMinutes, passHash } = req.body;

  if (!ciphertext || !algo) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const id = uuidv4();
  const expiry = expiryMinutes
    ? Date.now() + expiryMinutes * 60 * 1000
    : null;

  messageStore.set(id, {
    ciphertext,
    iv: iv || null,
    salt: salt || null,
    algo,
    expiry,
    passHash: passHash || null,
    read: false,
    createdAt: Date.now(),
  });

  const link = `${req.protocol}://${req.get("host")}/read/${id}`;
  res.json({ id, link });
});

// ── Read & destroy message ───────────────────────
app.get("/api/message/:id", (req, res) => {
  const { id } = req.params;
  const { passHash } = req.query;

  if (!messageStore.has(id)) {
    return res.status(404).json({ error: "Message not found or already destroyed." });
  }

  const msg = messageStore.get(id);

  // Check expiry
  if (msg.expiry && Date.now() > msg.expiry) {
    messageStore.delete(id);
    return res.status(410).json({ error: "Message has expired and been destroyed." });
  }

  // Check if already read
  if (msg.read) {
    messageStore.delete(id);
    return res.status(410).json({ error: "Message already read and destroyed." });
  }

  // Check passphrase hash
  if (msg.passHash && msg.passHash !== passHash) {
    return res.status(403).json({ error: "Incorrect passphrase." });
  }

  // Mark as read and self-destruct
  msg.read = true;
  const payload = {
    ciphertext: msg.ciphertext,
    iv: msg.iv,
    salt: msg.salt,
    algo: msg.algo,
    createdAt: msg.createdAt,
  };

  // Delete after sending
  setTimeout(() => messageStore.delete(id), 500);

  res.json(payload);
});

// ── Check if message exists (without reading) ────
app.get("/api/check/:id", (req, res) => {
  if (!messageStore.has(id)) {
    return res.json({ exists: false });
  }
  const msg = messageStore.get(req.params.id);
  if (msg.expiry && Date.now() > msg.expiry) {
    messageStore.delete(req.params.id);
    return res.json({ exists: false });
  }
  res.json({
    exists: true,
    hasPassphrase: !!msg.passHash,
    algo: msg.algo,
    expiry: msg.expiry,
  });
});

// ── AI Assistant proxy ───────────────────────────
app.post("/api/ai", async (req, res) => {
  const { messages } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "AI assistant not configured." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are YSIM's AI assistant — a cybersecurity-focused AI. You help users understand encryption, secure communication, and privacy best practices. Keep responses concise and practical.",
        messages,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "AI request failed." });
  }
});

// ── Serve read page ──────────────────────────────
app.get("/read/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start server ─────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  YSIM running → http://localhost:${PORT}\n`);
});
