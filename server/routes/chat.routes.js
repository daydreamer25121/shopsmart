const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Ticket = require("../../database/models/Ticket");

const router = express.Router();

// In-memory session history (demo).
// Key: session id -> [{role, content}]
const sessionHistory = new Map();

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  String(header)
    .split(";")
    .map((p) => p.trim())
    .forEach((p) => {
      const idx = p.indexOf("=");
      if (idx === -1) return;
      const k = p.slice(0, idx).trim();
      const v = p.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    });
  return out;
}

function getOrCreateSessionId(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let sid = cookies.shopsmart_sid;
  if (!sid) {
    sid = crypto.randomBytes(16).toString("hex");
    res.setHeader("Set-Cookie", `shopsmart_sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return sid;
}

function systemPrompt() {
  return (
    "You are ShopSmart's assistant. Help users find products, track orders, understand offers, and resolve issues. " +
    "Only answer shopping-related queries. If the user asks for human help or the issue seems unresolved, " +
    "respond with a short helpful message and include the token [HANDOFF] at the end."
  );
}

function getUserFromOptionalJWT(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = String(header).split(" ");
  if (scheme !== "Bearer" || !token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret);
    return { id: payload.sub, role: payload.role };
  } catch (err) {
    return null;
  }
}

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    const sid = getOrCreateSessionId(req, res);
    const history = sessionHistory.get(sid) || [];
    const user = getUserFromOptionalJWT(req);

    history.push({ role: "user", content: String(message) });
    // keep bounded
    const bounded = history.slice(-12);
    sessionHistory.set(sid, bounded);

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.json({
        reply:
          "Assistant is not configured (missing CLAUDE_API_KEY). You can still browse products and offers, or try again after setup.",
        handoff: false,
      });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: systemPrompt(),
        messages: bounded.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return res.status(502).json({ error: "Claude API failed", details: text });
    }

    const data = await resp.json();
    const blocks = data.content || [];
    let reply = "";
    for (const b of blocks) {
      if (b.type === "text") reply += b.text || "";
    }

    const wantsHandoff = /\[HANDOFF\]\s*$/i.test(reply) || /human|agent|customer care/i.test(String(message));
    reply = reply.replace(/\[HANDOFF\]\s*$/i, "").trim();

    // Store assistant reply in history
    bounded.push({ role: "assistant", content: reply });
    sessionHistory.set(sid, bounded.slice(-12));

    let ticketId = null;
    if (wantsHandoff) {
      if (user?.id) {
        const t = await Ticket.create({
          userId: user.id,
          issue: String(message).slice(0, 500),
          status: "open",
          assignedTo: null,
        }).catch(() => null);
        ticketId = t ? String(t._id) : null;
      }
    }

    return res.json({ reply, handoff: wantsHandoff, ticketId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[chat] failed:", err);
    return res.status(500).json({ error: "Chat failed" });
  }
});

module.exports = router;

