"use strict";

const DEFAULTS = {
  enabledAccounts: [],   // Konto-IDs ("account1", ...)
  inboxOnly: true,       // nur Posteingang, keine Unterordner
  skipJunk: true,        // als Junk klassifizierte Mails ignorieren
  maxIndividual: 3       // ab mehr Mails pro Ereignis: eine Sammelmeldung
};

const POLL_MS = 20000;   // Nachlauf für Mails, die Thunderbirds Ereignis-Dedupe verschluckt
const SEEN_MAX = 2000;

const notificationTargets = new Map(); // notificationId -> messageId
const seen = new Set();                // "accountId:headerMessageId"
let config = { ...DEFAULTS };
let accountNames = new Map();
let inboxIds = new Map();              // accountId -> folderId
let pollSeeded = false;

async function loadConfig() {
  const stored = await messenger.storage.local.get(DEFAULTS);
  config = { ...DEFAULTS, ...stored };
}

async function loadAccounts() {
  const accounts = await messenger.accounts.list(true);
  accountNames = new Map(accounts.map(a => [a.id, a.name]));
  inboxIds = new Map();
  for (const a of accounts) {
    const inbox = findInbox(a.folders || []);
    if (inbox && inbox.id) inboxIds.set(a.id, inbox.id);
  }
}

function findInbox(folders) {
  for (const f of folders) {
    if ((f.specialUse || []).includes("inbox")) return f;
    const sub = findInbox(f.subFolders || []);
    if (sub) return sub;
  }
  return null;
}

function displayAuthor(author) {
  if (!author) return "";
  const m = author.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return m[1].trim() || m[2].trim();
  return author.trim();
}

async function collectAll(list) {
  const out = [...list.messages];
  let id = list.id;
  while (id) {
    const next = await messenger.messages.continueList(id);
    out.push(...next.messages);
    id = next.id;
  }
  return out;
}

function markSeen(accountId, m) {
  const key = `${accountId}:${m.headerMessageId || m.id}`;
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > SEEN_MAX) seen.delete(seen.values().next().value);
  return true;
}

async function notify(title, message, messageId) {
  const notificationId = await messenger.notifications.create({
    type: "basic",
    iconUrl: messenger.runtime.getURL("icon.png"),
    title,
    message
  });
  if (messageId != null) notificationTargets.set(notificationId, messageId);
}

// Gemeinsamer Pfad für Ereignis und Nachlauf. `messages` sind bereits dem Konto zugeordnet.
async function handleMessages(accountId, messages, source) {
  if (config.skipJunk) messages = messages.filter(m => !m.junk);
  messages = messages.filter(m => !m.read);
  messages = messages.filter(m => markSeen(accountId, m));
  if (messages.length === 0) return;

  const account = accountNames.get(accountId) || accountId;
  console.log(`NotiFilter: ${messages.length} neu in ${account} (${source})`);

  if (messages.length <= config.maxIndividual) {
    for (const m of messages) {
      await notify(`${account} – ${displayAuthor(m.author)}`, m.subject || "(kein Betreff)", m.id);
    }
  } else {
    const preview = messages.slice(0, 3).map(m => `• ${displayAuthor(m.author)}: ${m.subject || "(kein Betreff)"}`).join("\n");
    await notify(`${account}: ${messages.length} neue Nachrichten`, preview, messages[0].id);
  }
}

async function onNewMail(folder, list) {
  if (!config.enabledAccounts.includes(folder.accountId)) return;
  if (config.inboxOnly && !(folder.specialUse || []).includes("inbox")) return;
  await handleMessages(folder.accountId, await collectAll(list), "Ereignis");
}

// Thunderbird dedupliziert onNewMailReceived über die Message-ID. Dieselbe Mail in zwei
// Konten löst das Ereignis nur einmal aus. Der Nachlauf fragt deshalb die Posteingänge
// der aktiven Konten nach Mails mit "neu"-Flag ab.
async function poll() {
  for (const accountId of config.enabledAccounts) {
    const folderId = inboxIds.get(accountId);
    if (!folderId) continue;
    try {
      const list = await messenger.messages.query({ folderId, new: true, unread: true });
      const messages = await collectAll(list);
      if (pollSeeded) await handleMessages(accountId, messages, "Nachlauf");
      else messages.forEach(m => markSeen(accountId, m));
    } catch (e) {
      console.warn("NotiFilter: Nachlauf fehlgeschlagen", accountId, e);
    }
  }
  pollSeeded = true;
}

messenger.notifications.onClicked.addListener(async notificationId => {
  const messageId = notificationTargets.get(notificationId);
  notificationTargets.delete(notificationId);
  if (messageId == null) return;
  try {
    const tab = await messenger.messageDisplay.open({ messageId, location: "tab", active: true });
    if (tab && tab.windowId != null) {
      await messenger.windows.update(tab.windowId, { focused: true });
    }
  } catch (e) {
    console.warn("NotiFilter: Nachricht konnte nicht geöffnet werden", e);
  }
  messenger.notifications.clear(notificationId);
});

messenger.notifications.onClosed.addListener(id => notificationTargets.delete(id));

messenger.storage.onChanged.addListener((changes, area) => {
  if (area === "local") loadConfig();
});
messenger.accounts.onCreated.addListener(loadAccounts);
messenger.accounts.onUpdated.addListener(loadAccounts);
messenger.accounts.onDeleted.addListener(loadAccounts);

(async () => {
  await loadConfig();
  await loadAccounts();
  messenger.messages.onNewMailReceived.addListener(onNewMail, !config.inboxOnly);
  await poll();
  setInterval(poll, POLL_MS);
})();
