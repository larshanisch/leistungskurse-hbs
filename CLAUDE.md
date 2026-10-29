# TdoT-Leistungskurse — Projektregeln

Vertonte, automatisch abspielbare Web-Präsentationen zu den Leistungskursen **Deutsch, Englisch,
Kunst** für den Tag der offenen Tür der Heinrich-Böll-Schule Hattersheim (Hessen).
Zielgruppe: E-Phase (Klasse 11), Abitur voraussichtlich 2029.

Plan und Inhalt: `PLAN.md`. Entscheidungen: `ENTSCHEIDUNGEN.md` (nummeriert, nicht still neu
verhandeln). Amtliche Fakten mit Quellen: `quellen/faktenblatt_*.md`.

## Konventionen

- **Sprache:** alles sichtbare und gesprochene durchgehend Deutsch, echte Umlaute. Code, Ids,
  Dateinamen ASCII/englisch.
- **Fakten nur aus den Faktenblättern.** Jede Aussage über Erlasse, OAVO, KCGO, Bewertung muss
  dort mit Quelle stehen. Was dort [UNSICHER] ist, kommt nicht ungeprüft in ein Skript.
- **Bilder:** keine Fotos von Personen der Schule. Nur Gemini-generiert oder gemeinfrei/frei
  lizenziert. Generierte (erfundene) Personen dürfen von vorn zu sehen sein, Text im Bild ist
  erlaubt (Entscheidung 10) — jeden Text im Bild auf Rechtschreibung prüfen. Keine KI-Porträts
  realer Personen; keine Gemini-Bilder „im Stil von" geschützten Künstlern. Jede fremde
  Abbildung bekommt einen Eintrag im Bildnachweis.
- **Jeder Film steht für sich** (Entscheidung 36): keine Verweise auf einen anderen Film („die beiden“,
  „wie im Deutsch-Film“) – die Filme laufen in beliebiger Reihenfolge.
- **Szene 2 jedes Films** enthält den Rat „deutlich besser als fünf Punkte“ (Entscheidung 26).
- **Sprechtext:** vollständige, ausformulierte Sätze, die vorgelesen natürlich klingen — keine
  Stichwortketten, keine Doppelpunkt-Aufzählungen, keine Einwortsätze (Nutzer 27.10.2026).
- **Hosting:** GitHub Pages (Konto des Nutzers), Repository öffentlich → keine Namen von
  Kolleg:innen oder Schüler:innen (der Ersteller steht auf eigenen Wunsch im Vermerk, Entscheidung 75), kein Tracking, keine externen Schriften/CDNs.
- **Offline-fähig:** alle Dateien lokal referenziert, läuft auch vom USB-Stick im Kiosk-Modus.
- **Möglichst ohne Scrollen** (digitale Tafel, Entscheidungen 25, 76): jede Seite im Querformat soll auf einen Bildschirm passen; Scrollen ist erlaubt, Abschneiden nie. Nach Änderungen bei 1920×1080, 1280×720, 1024×768 und 1280×600 nachmessen (Überlappung mit der Fußzeile).

## Stand

- 27.10.2026: Projekt angelegt. Vier Faktenblätter (allgemein, Deutsch, Englisch, Kunst) liegen
  in `quellen/`, tragende Aussagen gegengeprüft (Vermerk im Kopf jedes Blatts). Erlass 2029 noch
  nicht erschienen → Inhalte nach Erlass 2028, im Skript als „Stand Abitur 2028" kennzeichnen.
  Gestaltung als Dokumentarfilm mit Untertiteln und „Ton aus“-Knopf (Entscheidung 9).
- 28.10.2026: Drehbuch Deutsch v0.2 freigegeben. Prototyp steht: `index.html`, `film.html`,
  Deutsch komplett vertont (6:46 min). Am selben Tag alle Bilder fertig (Gemini + 5 gemeinfreie),
  Schulszenen nach Fotos der HBS-Oberstufe, Schullogo eingebaut. Deutsch ist inhaltlich fertig;
  offen: Englisch, Kunst, Kiosk-Modus, GitHub Pages.
- 28.10.2026 (später): Neuausrichtung — Stil F „filmisch gemalt“, Leitfiguren-Duo, mehr
  Präsentationselemente, Stimme Theo mit Eleven v4 (Entscheidungen 18–20). Drehbuch Deutsch 0.4
  wartet auf Freigabe; Bilder und Ton der Fassung 0.3 sind damit überholt.
- 28.10.2026 (Abend, Arbeitsstand zum Weitermachen): Drehbuch 0.4 freigegeben. Erledigt: 14 Bilder
  im Stil F (`art/deutsch/v04/*_raw.png` → `media/deutsch/img/`), Figurenporträts
  `assets/img/figur_sie.jpg`/`figur_er.jpg`, `content/deutsch.json` 0.4 (panel/band/captions/
  imageCues mit `fit: "pinned"`, takeaways), `tools/build.mjs` neu (löst alle `"at"` auf, Merkkarte,
  Modell im Manifest), `film.html` und `assets/css/film.css` neu.
  Alte v0.3-Bilder/Aufnahmen liegen in `art/archiv/deutsch_v03/`.
- 29.10.2026: Deutsch 0.4 fertig: `film.js` neu (Präsentationselemente, Fundstücke, Merkkarte),
  vertont mit Theo v4 (30 Sätze, 3 439 Zeichen, **4:29 min gemessen**), geprüft auf Desktop und
  Handy-Breite, Startseite in neuer Optik. Danach: Leitfarbe Schulgrün #C8D530, Logo freigestellt
  (Fassung für dunklen Grund), Porträtkarten statt Pinnwand (Entscheidungen 21–23).
  Englisch fertig. Stand 29.10.2026 nach Entscheidung 26: Deutsch 5:05, Englisch 5:30 min (gemessen).
- 29.10.2026 (später): Merkkarten gesprochen (Entscheidung 27), Klausurersatz „entscheidet die
  Lehrkraft“, Klausurzahl GK/LK verglichen. Drehbücher Deutsch 0.7 und Englisch 0.4 vertont
  (9 neue Sätze, Englisch Szene 7 mit Beispiel Orwell „1984“), **Deutsch 5:30, Englisch 6:05 min
  gemessen**; beide freigegeben (Nutzer 29.10.2026).
- 29.10.2026 (Abend): Kunst fertig. Drehbuch 0.4 freigegeben, 15 Gemini-Bilder
  (`art/kunst/v01/*_raw.png` → `media/kunst/img/`; k14 = Gebäudebild aus Deutsch), 2 gemeinfreie
  (Morisot, Caillebotte; Originale in `art/kunst/pd/`), `content/kunst.json`, vertont (34 Sätze,
  4 Aufnahmen wortgleich aus Englisch übernommen), **5:34 min gemessen**, Kachel auf der Startseite
  aktiv. Drei Bilder (Flur, Hof, Wiese) waren den Schulfotos zu ähnlich und wurden ohne Fotovorlage
  neu erzeugt (Entscheidung 15).
- 29.10.2026 (spät): Tonstart repariert (Vorladen, Uhr wartet auf den Ton, Entscheidung 28),
  Dauerbetrieb `kiosk.html` (Entscheidung 29), neue Titelbilder mit Fachmotiven (Entscheidung 30).
  Im unsichtbaren Browser-Pane laufen keine Animationsframes: Filmende dort nicht prüfbar, nur
  der Rahmen (Ende-Meldung per postMessage von Hand geschickt).
- 29.10.2026 (Nacht): Startseite mit Überschrift „Aufgabenfeld I“ statt Kombinationskasten
  (Entscheidung 31). **Online:** https://larshanisch.github.io/leistungskurse-hbs/ (Repository
  `larshanisch/leistungskurse-hbs`, öffentlich, Pages aus `main`/Hauptordner). Geprüft: alle 174
  Dateiverweise in exakter Schreibweise vorhanden, Film und Aufnahmen laden online.
- 29.10.2026 (Nacht, später): `tafel.html` = Standardmodus im Vollbild (Entscheidung 33): ein Klick,
  dann Übersicht und Filme im Rahmen; Esc verlässt das Vollbild, ein Knopf holt es zurück.
- 29.10.2026: QR-Codes (`assets/img/qr_start.svg`, `qr_tafel.svg`, Paket qrcode 1.5.4, nur im Scratchpad
  installiert), Druckvorlage `qr.html` und `qr_aushang.pdf` (A4, eine Seite). Alle Seiten noindex (Entscheidung 34).
- 29.10.2026: Laden für langsames Schulnetz (Entscheidung 35): Ladeanzeige beim Filmstart (erste
  Minute vorladen), Bilder werden vorausgeladen; Tafel und Kiosk speichern alle Filme per Service
  Worker (`sw.js`, `assets/js/offline.js`). Test: `vorschau-langsam` (Port 8318, 20 KB/s je Datei).
  Offen: Kiosk und Tafel am echten Gerät mit Ton testen; QR-Codes mit dem Handy scannen (kein Decoder hier);
  kurzer Link.
- 29.10.2026: Drehbuch Englisch 0.5 – Satz 1 ohne Rückgriff auf den Deutsch-Film, neu vertont
  (Entscheidung 36). Regel: jeder Film muss in jeder Reihenfolge verständlich sein.
- 29.10.2026: Erweiterung auf alle drei Aufgabenfelder (Entscheidungen 37–39). `index.html` neu:
  Aufgabenfelder → Kurse des Felds (Kacheln, „Film folgt“ ohne Film) → Planer „Kurswahl durchspielen“.
  Fächer, Felder und HBS-Angebot stehen als `FIELDS`/`SUBJ`/`PAIRS` oben im Skript von `index.html`
  (`PAIRS` = Tutoriumsblätter der Schule, Entscheidung 40);
  ein neuer Film braucht dort `img`, `pos`, `what` und ein `<script src="assets/data/<fach>.js">`
  (auch in `film.html`, `tafel.html`, `kiosk.html`, `offline.js` CORE).
  Startseite mit Bildkarten je Aufgabenfeld (`media/start/feld1–3.jpg`, Entscheidung 42).
- 29.10.2026: Film Politik und Wirtschaft fertig (Drehbuch 0.2, Leitfigur C, **5:38 min gemessen**, Entscheidung 44).
- 29.10.2026: Raum-Einrichtung auf der Startseite (Entscheidung 45): erstes Öffnen fragt, welche Filme im Raum
  laufen; „Tafel einrichten“ in der Fußzeile, Logo 3 s drücken oder `?einrichten` ändert es (Entscheidung 49); Handys über `handy.html` (zeigt alles, großer QR-Code).
  Planer mit Titelbildern im Ergebnis, ohne Film-Links (Entscheidungen 46, 48); Räume anderer Fächer eintragbar (48). Beim Testen im Browser vorher `localStorage.removeItem('tdot-raum')`.
- 29.10.2026: Deutsch 0.8 und Kunst 0.5 ohne „als Tutorium sechs“ (Entscheidung 50), **Deutsch 5:28, Kunst 5:32 min**.
- 29.10.2026: Film Geschichte fertig (Drehbuch 0.2, Leitfigur D, **5:43 min gemessen**, Entscheidung 51).
- 29.10.2026: GK/LK-Aussagen aller Filme geprüft und korrigiert (Entscheidung 53, `drehbuch/pruefung_gk_lk.md`):
  **Deutsch 5:32, Kunst 5:37, PoWi 5:45, Geschichte 5:47 min**. Regel: Was beide Kursarten tun, ist kein LK-Merkmal;
  Vergleichstafeln ohne „–“ und „grundlegend“ beim GK.
- 29.10.2026: Film Mathematik fertig (Drehbuch 0.3, Leitfigur C, **5:34 min gemessen**, Entscheidung 54). Film-Id `mathematik`,
  Fach-Id `mathe` mit `film`-Zuordnung in `index.html`.
- 29.10.2026: Klausurzahlen genauer in Filmen und Planer (Entscheidung 55): **Kunst 5:41, PoWi 5:49, Geschichte 5:51,
  Mathematik 5:38 min**. `.build_cache/reuse_takes.mjs <fach>` übernimmt wortgleiche Aufnahmen auch aus dem eigenen Ordner.
- 29.10.2026: Deutsch 0.10 – Klausur-Vergleich nennt alle Fächer außer Mathematik statt nur Englisch (Entscheidung 56),
  **5:35 min gemessen**. `tools/build.mjs` liest Aussprache-Umschreibungen aus `content/aussprache.json` (Untertitel bleiben).
- 29.10.2026: Planer mit Kästen „Schriftlich“ (1–3) und „Mündlich“ (4–5) (Entscheidung 57). „Analysis“ im Mathe-Film per
  ausgewählter Neuaufnahme richtig betont (Entscheidung 58), **5:40 min**. Falsch betonte Wörter: erst denselben Satz mehrfach
  aufnehmen und hören lassen, Umschreibungen halfen hier nicht. Wird eine Datei unter gleichem Namen ersetzt: `CACHE` in `sw.js` **und** `assets/js/offline.js` hochzählen (Entscheidung 68).
- 29.10.2026: Gemeinfreie Fotos in Geschichte 0.5 (Scheidemann, Mauerbau) und PoWi 0.5 (Grundgesetz), Entscheidung 59.
  Regel: Porträtkarte und Liste (`panel`) nie gleichzeitig – sonst verdeckt die Liste die große Bildunterschrift.
- 29.10.2026: Klausur unter Abiturbedingungen jetzt in allen Filmen (Entscheidung 60): **Deutsch 5:43, Englisch 6:13,
  Kunst 5:49 min**. Fortschrittsbalken oben im Player (Entscheidung 61). Drehbuch Biologie 0.2 freigegeben (Leitfigur D,
  Entscheidung 62).
- 29.10.2026: Film Biologie fertig (Leitfigur D, **5:45 min gemessen**, Entscheidung 63). Vorlagebilder mit einer anderen
  Leitfigur nie als Raumvorlage nehmen – die Figur kommt mit.
- 29.10.2026: Film Chemie fertig (neue Leitfigur E, **5:45 min gemessen**, Entscheidung 65). Damit alle acht Filme.
  Vergleichstafeln: lange Wörter mit weicher Trennstelle U+00AD in content (Entscheidung 66).
- 29.10.2026: Ruckeln behoben (Entscheidung 68), Fach oben links (69), `kiosk.html?stumm=1` (70), Planer-Reiter „Einbringen“ (71), LK-Noten doppelt im Planer (73), Logo freigestellt als Wasserzeichen (74), Herkunfts- und KI-Vermerk (75), Startseite scrollbar (76), Vollbild-Knopf (77), Startseite speichert, `diagnose.html` für Tafeln (78).
  Promethean-Tafeln: Chrome 108, 4K (Pixeldichte 2) – Ton ist die Uhr, keine Unschärfe bei 2dppx, Vollbild im Rahmen (79). Ton-Knopf in der Steuerleiste (80). Uhr folgt dem Ton sanft, nie rückwärts (81) – nach Änderungen an Uhr oder Ton: `perf_film.mjs --coarse=0.5 --cpu=6` muss `uhrRueckwaerts: 0` zeigen. Seiten holt der Worker frisch (`no-cache`, Entscheidung 82); Filmstart auf großem Bildschirm = Vollbild. Grafikspeicher bei 4K: `perf_film.mjs --dpr=2 --layers` (Ziel ≤ 3 bildschirmfüllende Ebenen; unsichtbare Ebenen per `setOpacity` ausblenden, Entscheidung 83). Bei 2dppx keine Einblend-Animationen (84) – `--layers` zählt auch neu angelegte Ebenen.
  Flüssigkeit messen: `node tools/perf_film.mjs <fach> --t=150 --cpu=6` (Werte streuen – je dreimal; verlässlich sind
  `layoutCount` und `task_s`). Im Player Werte nur über `setStyle`/`setText` schreiben (nur bei Änderung).
- Vertonen nach Einfügen eines Satzes: verschobene, unveränderte Sätze vorher auf die neue Nummer umbenennen (gleiche Prüfsumme), sonst werden sie neu bezahlt.
  Neue Filme: Faktenblatt →
  Drehbuch zur Freigabe → Bilder → Vertonung.

## Veröffentlichen

- Repository `https://github.com/larshanisch/leistungskurse-hbs` (öffentlich, Seiten mit noindex – Entscheidung 34), Zweig `main`; GitHub Pages baut nach jedem
  Push von selbst (1–2 min). Autor der Commits: „Hanisch“ mit `295572885+larshanisch@users.noreply.github.com`
  (lokal gesetzt) – nie die Outlook-Adresse.
- GitHub CLI: die angemeldete aus dem HBS-Planer mitbenutzen,
  `/c/Projekte/SL-Verwaltungstool/werkzeuge/gh/bin/gh.exe` – keine zweite installieren (Nutzer 29.10.2026).
- GitHub Pages unterscheidet Groß- und Kleinschreibung, Windows nicht: nach neuen Dateien die Verweise gegen
  `git ls-files` abgleichen.

## Präsentationselemente (content/<fach>.json)

- `panel` rechts: `stats` (value/label/sub/prefix; reine Zahlen zählen hoch), `combo`
  (figure sie/er, a, b, ok), `list` (check: true für Häkchen), `compare` (head + items label/a/b),
  `ring` (parts mit value, notes). Jedes Element mit `"at"`.
- `band` unten: `timeline` (label Q1…, text). `captions`: Bildunterschriften.
- `imageCues` mit `"fit": "card"`: Original als Porträtkarte; die Bildunterschrift „Name · Werk“ steht dann groß daneben.
- `takeaways`: Merkkarte. Mit `"at"` erscheint sie zum Zusammenfassungssatz („Kurz
  zusammengefasst: …“) und steht danach noch 3 s; ohne `"at"` nach dem letzten Satz, 5 s stumm.

## Aufbau

- `drehbuch/<fach>.md` — einzige Quelle des Sprechtexts (Zeilen `  > ` unter „Sprechtext“).
- `content/<fach>.json` — Szenen: Bild, Bewegung, Einblendungen; Stellen per Wortanker `"at"`.
- `tools/build.mjs <fach>` — erzeugt `assets/data/<fach>.js`, `media/<fach>/audio_manifest.json`,
  Platzhalter. Nach jeder Änderung an Drehbuch oder content neu laufen lassen.
- Vertonen: `media_speak_batch` mit dem Manifest (erst `dry_run`), dann wieder `build.mjs`
  (misst die Dauern). Verwaiste Aufnahmen meldet `build.mjs`, löscht sie aber nicht.
- `tools/check_film.mjs` — Datenprüfung + Zustand/Bildschirmfotos im Chrome headless.
  Bildschirmfotos immer mit `static=1` (headless friert CSS-Übergänge ein).
