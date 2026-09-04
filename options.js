"use strict";

const DEFAULTS = { enabledAccounts: [], inboxOnly: true, skipJunk: true, maxIndividual: 3 };

async function init() {
  const cfg = { ...DEFAULTS, ...(await messenger.storage.local.get(DEFAULTS)) };
  const accounts = (await messenger.accounts.list(false)).filter(a => a.type !== "none");
  const container = document.getElementById("accounts");
  for (const a of accounts) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.id = a.id;
    cb.checked = cfg.enabledAccounts.includes(a.id);
    cb.addEventListener("change", save);
    label.append(cb, ` ${a.name}`);
    container.append(label);
  }
  document.getElementById("inboxOnly").checked = cfg.inboxOnly;
  document.getElementById("skipJunk").checked = cfg.skipJunk;
  document.getElementById("maxIndividual").value = cfg.maxIndividual;
  for (const id of ["inboxOnly", "skipJunk", "maxIndividual"]) {
    document.getElementById(id).addEventListener("change", save);
  }
}

async function save() {
  const enabledAccounts = [...document.querySelectorAll("#accounts input:checked")].map(cb => cb.dataset.id);
  const maxIndividual = Math.max(1, parseInt(document.getElementById("maxIndividual").value, 10) || DEFAULTS.maxIndividual);
  await messenger.storage.local.set({
    enabledAccounts,
    inboxOnly: document.getElementById("inboxOnly").checked,
    skipJunk: document.getElementById("skipJunk").checked,
    maxIndividual
  });
  const s = document.getElementById("status");
  s.textContent = "Gespeichert.";
  setTimeout(() => (s.textContent = ""), 1500);
}

init();
