# NotiFilter

Thunderbird MailExtension: new-mail notifications (Windows toasts) only for the accounts you pick.
Built as a replacement for the one FiltaQuilla feature still needed after Thunderbird 155
dropped legacy add-on support.

Pure WebExtension API (`messages.onNewMailReceived`, `notifications`), no Experiment API,
so nothing depends on Thunderbird internals.

## Setup

1. Download the `.xpi` from the latest release, or run `.\build.ps1` to build `dist\notifilter-<version>.xpi`.
2. Thunderbird › Add-ons › gear icon › "Install Add-on From File…" → pick the xpi.
   Thunderbird does not require add-ons to be signed.
3. Open the add-on's options and tick the accounts that should notify.
4. Turn off Thunderbird's own alert: Settings › General › "When new messages arrive" ›
   untick "Show an alert". Otherwise every mail shows up twice.

## Behaviour

- The event fires after message filters and junk classification have run.
  Defaults: inbox only, junk ignored.
- Up to `maxIndividual` mails per event get one toast each; above that, one summary toast.
- Clicking a toast opens the message in a tab and brings the window to the front.
- Settings live in `storage.local` and take effect without a restart. Exception: "Inbox only"
  also controls the listener's `monitorAllFolders` flag, which is set at startup. After toggling
  it, disable/enable the add-on or restart Thunderbird.
- Thunderbird deduplicates `onNewMailReceived` per session by Message-ID
  (`_knownNewMessages` in `ExtensionMessages.sys.mjs`). The same mail delivered to two of your
  own accounts fires the event only for the first one. NotiFilter therefore also polls every
  20 s: `messages.query({folderId, new: true, unread: true})` per enabled inbox, with its own
  dedupe keyed on `accountId:headerMessageId`. The poll covers inboxes only.

## Development

Add-ons › gear icon › Debug Add-ons › "Load Temporary Add-on…" → `manifest.json`.
The background script console is available there via "Inspect".


---
Looking for a minimalistic one-line userChrome.css theme for Thunderbird? [BirdOne](https://github.com/Firnschnee/BirdOne) | License: [MIT](LICENSE)
