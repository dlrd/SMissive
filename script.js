let lastConversationId = null;
let lastStartTime = null;
let lastTitle = null;
const MIN_DURATION_SECONDS = 3;

function log(msg) {
  const el = document.getElementById("log");
  el.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  el.scrollTop = el.scrollHeight;
}

function setStatus(text) {
  log("Set status: " + text);
  document.getElementById("status").textContent = text;
}

function nowISO() {
  return new Date().toISOString();
}

function sendToActivityWatch({ title, conversationId, duration, timestamp, type }) {
  const event = {
    timestamp,
    duration,
    data: {
      title,
      conversationId,
      type
    }
  };

  fetch("http://localhost:5600/api/0/buckets/aw-watcher-missive/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      log(`✔ Sent event for "${title}" (${duration.toFixed(1)}s)`);
    })
    .catch(err => {
      log(`❌ Failed to send: ${err.message}`);
    });
}

function trackPreviousConversation() {
  if (!lastConversationId || !lastStartTime) return;

  const duration = (Date.now() - lastStartTime) / 1000;
  if (duration < MIN_DURATION_SECONDS) {
    log(`⏩ Ignored short visit (${duration.toFixed(1)}s)`);
    return;
  }

  sendToActivityWatch({
    title: lastTitle || "Unknown",
    conversationId: lastConversationId,
    duration,
    timestamp: new Date(lastStartTime).toISOString(),
    type: "email"
  });
}

function handleConversationChange() {
  log("🔄 Detected conversation change");

  Missive.fetchConversations({ idsOnly: false }).then(conversations => {
    const selected = conversations.find(c => c.selected);
    if (!selected) {
      log("⚠️ No conversation selected");
      return;
    }

    trackPreviousConversation();

    lastConversationId = selected.id;
    lastTitle = selected.subject || (selected.participants?.map(p => p.name).join(", ") || "Untitled");
    lastStartTime = Date.now();

    setStatus(`Tracking: ${lastTitle}`);
    log(`➡ Started tracking "${lastTitle}"`);
  });
}

function handleBlur() {
  log("💤 Window lost focus");
  trackPreviousConversation();
  lastConversationId = null;
  lastStartTime = null;
  setStatus("Idle");
}

function handleFocus() {
  log("🔙 Window regained focus");
  handleConversationChange();
}

window.addEventListener("blur", handleBlur);
window.addEventListener("focus", handleFocus);

window.Missive = window.Missive || {};

log("⏳ Waiting for Missive...");

Missive.on("ready", () => {
  log("✅ Missive ready");

  setStatus("Missive ready");
  Missive.on("change:conversations", handleConversationChange);
  handleConversationChange(); // Run once on init
});

log("⏳ Waiting for Missive...");
