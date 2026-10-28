# Plan — Präsentationen Leistungskurse

Version 11 · 29.10.2026

## Ziel

Schüler:innen der E-Phase informieren sich über die Leistungskurse Deutsch, Englisch, Kunst:
Inhalte, Arbeitsweisen, besondere Herausforderungen — vor allem die festen Vorgaben zu Inhalten
und Bewertung (OAVO, KCGO, Abiturerlass).

## Aufbau

- `index.html` — Startseite mit drei Kacheln.
- Player je Fach: Folien mit Bildern (Schwenk/Zoom), Sprecherspur je Folie, Untertitel,
  automatisches Weiterschalten, Pause/Vor/Zurück.
- Kiosk-Modus mit zwei Abspiellisten (Entscheidung 8): Raum 1 Deutsch + Englisch im Wechsel,
  Raum 2 nur Kunst, jeweils Endlosschleife. Online-Startseite weiter mit allen drei Fächern.
- Bildnachweis-Folie je Fach.

## Länge

Ziel 3–5 Minuten je Fach (noch nicht entschieden).

## Arbeitsschritte

1. Projekt, Doku — erledigt 27.10.2026
2. Faktenblätter mit Quellen (`quellen/`) — erledigt und gegengeprüft 27.10.2026; Nutzer prüft
   - Für die Startseite: Deutsch + Kunst ist als LK-Kombination nicht zulässig (§ 13 Abs. 2 OAVO),
     Deutsch + Englisch und Englisch + Kunst sind möglich.
   - Erlass 2029 erscheint voraussichtlich Mai–Juli 2027; bis dahin „Stand Abitur 2028".
3. Drehbuch je Fach: Szenen + Sprechtext — Nutzer gibt frei
   - Deutsch: `drehbuch/deutsch.md` v0.2, 16 Szenen, 801 Wörter / 5 608 Zeichen Sprechtext
     (gezählt 27.10.2026; v0.1 hatte 572 Wörter); Dauer wird an der Testaufnahme gemessen
4. Prototyp Player mit einem Fach, Platzhalterbilder, Testvertonung — erledigt 28.10.2026
   - Deutsch vollständig vertont: 54 Sätze, 5 455 Zeichen (abgerechnet 5 455), Gesamtdauer
     6:46 min gemessen (inkl. 5 Kapitelkarten à 3 s und Pausen) — über dem Ziel 3–5 min
   - Start: `index.html` (Doppelklick genügt) oder `node tools/serve.mjs` → http://localhost:8317/
   - Prüfen: `node tools/build.mjs deutsch`, dann `node tools/check_film.mjs deutsch [--shots] [Zeiten]`
     (braucht laufende Vorschau; Bilder in `.build_cache/check/`)
   - Stimme vom Nutzer abgehört und freigegeben (28.10.2026)
5. Bilder (Gemini, gemeinfrei) und Vertonung (ElevenLabs) für alle Fächer; Kosten vorher aus
   den Skripten auszählen
   - Deutsch 28.10.2026: Stilbild s01 freigegeben; 11 weitere Gemini-Bilder mit s01 als Referenz
     (Rohbilder `art/deutsch/*_raw.png`, im Film 1344×756 JPEG). Texte im Bild geprüft: alle
     richtig. 5 gemeinfreie Bilder (Commons, Lizenz geprüft) heruntergeladen nach Zustimmung
     (Originale in `art/deutsch/pd/`, Größen stimmen mit den Commons-Seiten überein); Szene 5 hat
     zusätzlich ein Gemini-Bild (Bücherstapel) für den Anfang. Deutsch hat damit keine
     Platzhalter mehr.
   - Szenen 3, 10, 13 neu mit HBS-Oberstufe als Vorlage, Szene 16 neu (Gebäude außen);
     Schullogo eingebaut (Entscheidungen 15, 16). Gemini schrieb zweimal falsch („Leistungkurse“,
     „Abilur“) — erst die dritte bzw. zweite Fassung war richtig. Vorige Fassungen als
     `art/deutsch/_alt_*` bis zur Freigabe aufbewahrt.
   - Handy-Ansicht geprüft (Chrome headless, 390 px breite iframes über `.build_cache/phone.html`):
     Untertitel lagen unter der Steuerleiste, 70:30-Balken abgeschnitten — behoben.
6. Startseite, Kiosk-Modus, GitHub Pages, QR-Code

## Neuausrichtung (28.10.2026, noch nicht entschieden)

Nutzer möchte Comic-Stil, mehr Präsentationselemente, modernere Oberfläche und neue Stimme mit
Eleven v4. Auswahlseite `art/auswahl.html`: Stilproben A Graphic Novel, B Flat-Comic, C Klare
Linie (`art/stilproben/`), Hörprobe Theo v2 (bisher), Theo/Leo/Sarah/Matilda mit v4
(`art/hoerprobe/`). Messung 28.10.2026: Modell-Id `eleven_v4` wird über schul-medien
angenommen; 4 × 245 Zeichen abgerechnet. Upload zu GitHub ruht (Repository lokal angelegt,
noch kein Commit).
- Stimme entschieden: Theo mit v4 (Entscheidung 18).
- Stilproben Runde 1 (A–C) verworfen: „zu kindisch“; Motiv „lachen vor dem Aushang“ wirkte wie
  Auslachen. Runde 2 (D Graphic Novel realistisch, E Editorial, F filmisch gemalt) mit neuem
  Motiv „Wahlbögen vergleichen“ — Auswahl offen.
- Stil F gewählt (Entscheidung 19). Leitfiguren-Entwürfe in Stil F: `art/figuren/leitfigur_a.png`
  (Schülerin, Jeansjacke, Umhängetasche) und `leitfigur_b.png` (Schüler, olivgrünes Hemd,
  Rucksack) — Auswahl offen (eine Figur oder beide als Duo).
- Duo festgelegt (Entscheidung 20). Drehbuch Deutsch 0.4 (28.10.2026): 15 Szenen, 503 Wörter /
  3 543 Zeichen Sprechtext (0.3: 801 Wörter / 5 455 Zeichen), Präsentationselemente ZAHL,
  ZEITLEISTE, RING, KOMBI, VERGLEICH, LISTE, MERKKARTE, HINWEIS. Dauer erst nach Vertonung
  messen. Korrigiert: „Aufbau“ gehört nicht zur Darstellungsleistung nach Anlage 9b II Nr. 3.
- 29.10.2026: Deutsch 0.4 umgesetzt — 14 Bilder Stil F (Szene 10 neu erzeugt: Mitschüler waren
  Kopien der Leitfigur), Player neu, Vertonung Theo v4: 3 439 Zeichen abgerechnet, 4:29 min
  gemessen (0.3: 6:46). Untertitel jetzt höchstens ~110 Zeichen je Einblendung (rekursive
  Teilung, notfalls vor Bindewörtern). Geprüft: Datenprüfung ohne Befund, 13 Zeitpunkte als
  Bildschirmfoto, Handy-Breite 390 px.
- Lehre für alle Motive: Figuren sollen fragen, abwägen, arbeiten; Lachen nur, wo es nicht
  wie Spott wirkt.

## Offene Fragen

- Länge je Fach
- Stimme(n): eine für alle oder je Fach eine eigene
- Schulspezifisches (Exkursionen, Projekte) — von den Fachschaften

## Schulspezifisches (Angaben des Nutzers, keine amtliche Quelle)

- Kunst-LK ist an der HBS genehmigt (27.10.2026).
- Leistungskurse haben 5 Wochenstunden, als Tutorium 6 (27.10.2026, Entscheidung 12).
- Englisch-LK: Die Kursfahrt geht in der Regel ins englischsprachige Ausland (27.10.2026).
- Englisch-LK: Kommunikationsprüfung an der HBS immer mit zwei Prüflingen und zwei Lehrkräften
  (29.10.2026; OAVO erlaubt zwei bis drei Prüflinge).
  Im Skript als „in der Regel" formulieren, nicht als Zusage.
- Englisch-LK: Den zweiten Roman wählt die Lehrkraft; die aktuellen LKs lesen George Orwell, „1984“
  (29.10.2026). Im Film als Beispiel („zum Beispiel“), nicht als Zusage.
- Englisch-GK ist dreistündig und schreibt eine Klausur pro Halbjahr (29.10.2026).
- Leistungskurse der HBS im Aufgabenfeld I: Deutsch, Englisch und Kunst – keine weiteren (29.10.2026).
- Deutsch-LK: Theaterbesuche in der Regel (27.10.2026).
- Kunst-LK: Museumsfahrten und Ausstellungen in der Regel (27.10.2026); Besuche fremder Ausstellungen
  und eigene Ausstellungen sind beide möglich (29.10.2026). Ablauf der fachpraktischen Prüfung an der
  HBS: im Film nur allgemein (29.10.2026).

## Nachtrag 29.10.2026

- Drehbuch Deutsch 0.5: Szene 5 je Pflichtwerk ein Satz mit Inhaltsangabe (vom Nutzer
  freigegeben). 7 neue Sätze vertont (667 Zeichen abgerechnet), 3 alte Aufnahmen nach
  `art/archiv/deutsch_v04_audio/`. Karten erscheinen jetzt genau zum Satzbeginn.
  Gesamtdauer **4:52 min gemessen**. Neues Bild `s05e` (Romantik und Expressionismus).
- Drehbuch Englisch 0.1 (29.10.2026): 15 Szenen, 630 Wörter / 4 419 Zeichen Sprechtext (Deutsch 0.5:
  562 / 3 929 bei 4:52 min). Kursfahrt als eigene Szene, Kommunikationsprüfung in Szene 9,
  Werke je ein Satz mit Inhalt. Freigegeben 29.10.2026.
- Englisch 29.10.2026: 16 Gemini-Bilder Stil F (7 neu erzeugt: Schüler war in 4 Bildern blond statt
  dunkel gelockt, 3 Kursraumbilder zu nah am Schulfoto; Szene 9 zweimal nachgebessert: genau zwei
  Prüflinge, Lehrkräfte klar unterscheidbar, Platz für die Einblendung). Vertont: 31 Sätze,
  4 283 + 198 Zeichen, **5:18 min gemessen**. Startseite: Englisch-Kachel aktiv.
  Füssli-Hexen (82 KB) und Crane-Empire-Karte (Commons-Fassung 1920 px, 1,4 MB; 2400 px liefert
  Commons nicht aus) am 29.10.2026 nach Zustimmung geladen, Originale in `art/englisch/pd/`.
- Drehbuch Kunst 0.1 (29.10.2026): 14 Szenen, 587 Wörter / 4 096 Zeichen Sprechtext, Leitfigur ER.
  Geschützte Künstler (Hopper, O'Keeffe, Sherman) nur genannt, Bilder dazu als Zeit- bzw.
  Sinnbild in Stil F. PD-Kandidaten: Morisot „Die Wiege“, Caillebotte „Straße in Paris,
  Regenwetter“. 0.2: Ausstellungen „beides möglich“, fachpraktische Prüfung allgemein (Nutzer).
  Wartet auf Freigabe.
