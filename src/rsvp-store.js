// Getting an RSVP off the phone and into the family's Google Sheet, without losing any of them.
//
// The reply is written to localStorage before anything that can fail is attempted, so a dropped
// connection on the road to Hyderabad costs nothing: whatever is still queued goes out on the
// guest's next visit, or the moment the phone comes back online. WhatsApp opens either way, so a
// reply that never reaches the Sheet still reaches the family.
//
// Every reply carries an id generated on the phone and kept across retries. The Apps Script
// matches on it and overwrites in place, which is what makes retrying safe — a reply that
// actually saved but whose response we could not read is updated, not duplicated.

const KEY = "ta-rsvp-queue";
const MAX_QUEUE = 20;
const MAX_TRIES = 25;

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

const write = (q) => {
  try { localStorage.setItem(KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch {}
};

export const newRsvpId = () => {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
};

export const queueRsvp = (payload) => {
  const q = read();
  q.push({ ...payload, tries: 0 });
  write(q);
};

async function post(endpoint, item) {
  const { tries, ...body } = item;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      // text/plain keeps this a CORS "simple" request. Apps Script has no OPTIONS handler, so
      // anything that provokes a preflight — application/json included — never reaches it.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      keepalive: true,          // survives the tab being backgrounded when WhatsApp opens
      redirect: "follow",       // /exec answers with a redirect to googleusercontent.com
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data ? data.ok === true : true;   // unreadable body, but a 2xx means it landed
  } catch {
    return false;
  }
}

// Sends whatever is waiting. Safe to call at any time — it is a no-op with an empty queue, and
// concurrent calls are cheap because a confirmed send is removed before the next attempt.
export async function flushRsvps(endpoint) {
  if (!endpoint) return;                       // no Sheet wired up yet; WhatsApp is still carrying them
  if (navigator.onLine === false) return;
  const q = read();
  if (!q.length) return;
  write([]);                                   // claim the batch so a second call cannot resend it

  const left = [];
  for (const item of q) {
    const ok = await post(endpoint, item);
    if (ok) continue;
    const tries = (item.tries || 0) + 1;
    if (tries < MAX_TRIES) left.push({ ...item, tries });
  }
  // anything queued while we were sending is still in storage; put the failures back in front
  if (left.length) write([...left, ...read()]);
}

export const pendingRsvps = () => read().length;

// Retry on the next visit and the moment the connection comes back.
export function watchRsvpQueue(endpoint) {
  if (!endpoint) return () => {};
  const go = () => flushRsvps(endpoint);
  go();
  addEventListener("online", go);
  return () => removeEventListener("online", go);
}
