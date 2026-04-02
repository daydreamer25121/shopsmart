"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { RobotCanvas, RobotMode } from "./RobotCanvas";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatbotWidget() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  const [open, setOpen] = useState(false);
  const [didWelcome, setDidWelcome] = useState(false);
  const [mode, setMode] = useState<RobotMode>("idle");

  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I’m ShopSmart’s assistant. Tell me what you’re shopping for." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstOpenRef = useRef(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const timeline = useMemo(() => gsap.timeline({ paused: true }), []);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("shopsmart_token");
      if (savedToken) setToken(savedToken);
      const savedEmail = localStorage.getItem("shopsmart_email");
      if (savedEmail) setUserEmail(savedEmail);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!panelRef.current) return;
    // Build open/close animation once.
    timeline.clear();
    timeline.fromTo(
      panelRef.current,
      { opacity: 0, y: 18, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "power2.out" }
    );
  }, [timeline]);

  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      timeline.play(0);
      if (firstOpenRef.current) {
        firstOpenRef.current = false;
        // trigger welcome wave
      }
    } else {
      gsap.to(panelRef.current, { opacity: 0, y: 12, scale: 0.98, duration: 0.18, ease: "power2.in" });
    }
  }, [open, timeline]);

  useEffect(() => {
    // auto-scroll
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMode("thinking");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (token) headers.authorization = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      setMode("talking");
      const replyText = String(json.reply || "");
      const suffix = json?.handoff ? "\n\nCustomer Care has been notified." : "";
      setMessages((prev) => [...prev, { role: "assistant", content: replyText + suffix }]);

      // settle back to idle after a short beat
      setTimeout(() => setMode("idle"), 650);
    } catch (e: any) {
      setMode("idle");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn’t reach the assistant service. Please try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function doLogin() {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.token) throw new Error("Login failed");
      setToken(json.token);
      setUserEmail(json.user?.email || loginEmail);
      try {
        localStorage.setItem("shopsmart_token", json.token);
        localStorage.setItem("shopsmart_email", json.user?.email || loginEmail);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setAuthError(e?.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function doLogout() {
    setToken(null);
    setUserEmail(null);
    try {
      localStorage.removeItem("shopsmart_token");
      localStorage.removeItem("shopsmart_email");
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="mb-3 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white/90">
              ShopSmart Assistant <span className="ml-2 text-[10px] text-white/40">3D</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
            >
              Close
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            {!token ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs font-semibold text-white/80">Login for customer care</div>
                <div className="mt-2 grid gap-2">
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                    placeholder="email"
                    autoComplete="email"
                  />
                  <input
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                    placeholder="password"
                    type="password"
                    autoComplete="current-password"
                  />
                  {authError && <div className="text-xs text-red-300">{authError}</div>}
                  <button
                    onClick={doLogin}
                    disabled={authLoading || !loginEmail || !loginPassword}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {authLoading ? "Logging in..." : "Log in"}
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-white/50">
                  Demo accounts are in the README after seeding.
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/80">
                  Signed in as <span className="text-accent">{userEmail}</span>
                </div>
                <button
                  onClick={doLogout}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                >
                  Logout
                </button>
              </div>
            )}

            <div className="flex flex-col items-center">
              <RobotCanvas
                mode={mode}
                didWelcome={didWelcome}
                onWelcomeDone={() => setDidWelcome(true)}
              />
            </div>

            <div
              ref={listRef}
              className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            >
              <div className="space-y-2">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={
                      m.role === "user"
                        ? "ml-auto w-fit max-w-[90%] rounded-lg bg-accent px-3 py-2 text-black"
                        : "mr-auto w-fit max-w-[90%] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white/90"
                    }
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                placeholder="Ask about products, orders, offers..."
              />
              <button
                onClick={send}
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-sm font-bold text-black shadow-lg"
      >
        Chat
      </button>
    </div>
  );
}

