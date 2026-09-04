# NotiFilter

Thunderbird-MailExtension: Neue-Mail-Benachrichtigungen (Windows-Toast) nur für ausgewählte Konten.
Ersatz für die eine FiltaQuilla-Funktion, die nach TB 155 noch gebraucht wurde.

Reines WebExtension-API (`messages.onNewMailReceived`, `notifications`), kein Experiment,
also keine Abhängigkeit von Thunderbird-Interna.

## Einrichten

1. `.\build.ps1` → `dist\notifilter-<version>.xpi`
2. Thunderbird › Add-ons › Zahnrad › „Add-on aus Datei installieren“ → xpi wählen.
   Thunderbird verlangt keine Signatur.
3. Add-on-Einstellungen: Konten anhaken.
4. Thunderbirds eigene Meldung abschalten: Einstellungen › Allgemein › Bei neuen Nachrichten ›
   „Benachrichtigung anzeigen“ abwählen. Sonst kommt alles doppelt.

## Verhalten

- Ereignis feuert nach Filtern und Junk-Klassifikation. Standard: nur Posteingang, Junk ignoriert.
- Thunderbird dedupliziert `onNewMailReceived` sessionweit über die Message-ID
  (`_knownNewMessages` in ExtensionMessages.sys.mjs). Dieselbe Mail an zwei eigene Konten
  löst das Ereignis nur für das erste aus. Deshalb zusätzlich alle 20 s ein Nachlauf:
  `messages.query({folderId, new: true, unread: true})` je aktivem Posteingang, eigene
  Dedupe über `accountId:headerMessageId`. Der Nachlauf deckt nur Posteingänge ab.
- Bis `maxIndividual` Mails pro Ereignis eine Meldung je Mail, darüber eine Sammelmeldung.
- Klick auf die Meldung öffnet die Mail in einem Tab und holt das Fenster nach vorn.
- Konfiguration in `storage.local`, wird ohne Neustart übernommen.
  Ausnahme: „Nur Posteingang“ steuert auch den `monitorAllFolders`-Parameter des Listeners,
  der nur beim Start gesetzt wird. Nach Umschalten Add-on deaktivieren/aktivieren oder TB neu starten.

## Entwicklung

Add-ons › Zahnrad › Add-ons debuggen › „Temporäres Add-on laden“ → `manifest.json`.
Hintergrundskript-Konsole dort über „Untersuchen“.
