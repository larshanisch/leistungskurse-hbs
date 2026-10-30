# Jahrespflege – jedes Jahr Anfang Oktober

Version 1.0 · 29.10.2026

Die Filme und der Planer zeigen den Stand eines bestimmten Abiturjahrgangs. Für den Tag der offenen Tür
muss jedes Jahr der **nächste** Jahrgang gezeigt werden: Wer im Herbst 2027 in der E-Phase sitzt, macht
Abitur 2030. Anfang Oktober liegen der neue Abiturerlass (meist Sommer) und das neue Kursangebot der Schule vor.

So starten wir: Claude-Sitzung im Projekt öffnen und schreiben **„Jahrespflege [Jahr]“**. Claude arbeitet
dann diese Liste ab, Schritt für Schritt, und fragt bei jeder inhaltlichen Änderung nach.

## 1. Was der Nutzer mitbringt (Schule)

- [ ] Tutoriumsblätter „Mögliche Prüfungsfachkombinationen im Abitur“ des neuen Jahrgangs (welche LKs, welche Paare)
- [ ] Grundkurs-Angebot der Q-Phase (welche Fächer, Sport-Abi ja/nein)
- [ ] Gibt es neue LKs oder fallen welche weg? Neue Leitfigur, neuer Film nötig?
- [ ] Zahl der Klausuren je Kurs an der HBS unverändert?
- [ ] Termin des Tags der offenen Tür, Räume

## 2. Quellen prüfen (Claude, mit Datum und Quelle in die Faktenblätter)

- [ ] **Abiturerlass** für den neuen Jahrgang (kultus.hessen.de): je Fach die Themenfelder Q1–Q4, Pflichtlektüren/-werke,
      Aufgabenarten, Hilfsmittel. Solange er fehlt: Vorjahreserlass mit Kennzeichnung „Stand Abitur [Jahr]“.
- [ ] **OAVO** (Hessenrecht, Fassung und „gültig ab“ notieren): § 9 (Klausuren), § 13 + Anlage 7 (Belegen), § 24 (Prüfungsfächer),
      § 26 (Einbringen, Zulassung, Bestehen), § 38 + Anlage 10b (Note). Jede Änderung → Faktenblatt-Version hochzählen.
- [ ] Schaubild Klausuren des Ministeriums (Klausurersatz, Klausur unter Abiturbedingungen)
- [ ] KCGO-Änderungen je Fach
- [ ] Was sich geändert hat, in einer Liste festhalten: **Änderung → betroffene Filme/Planer-Regeln**

## 3. Filme anpassen

- [ ] Sprechtexte mit Jahreszahlen: Schlusssatz „Alle Angaben entsprechen dem Stand vom Oktober [Jahr]; die Vorgaben … im Sommer [Jahr+1]“
      in allen acht Drehbüchern (`drehbuch/*.md`)
- [ ] „Abitur [Jahr]“ und „Abiturerlass [Jahr]“ in `content/*.json` (Merkkarten, Abspann, Bildnachweis)
- [ ] Themen in den Zeitleisten (Q1–Q4) und Listen gegen den neuen Erlass
- [ ] Geänderte Sätze vertonen: erst `dry_run`, wortgleiche Aufnahmen übernehmen (`.build_cache/reuse_takes.mjs`),
      dann `node tools/build.mjs <fach>` für alle Fächer; Dauern in CLAUDE.md eintragen
- [ ] `node tools/check_film.mjs <fach>` für alle Fächer (Datenprüfung)

## 4. Startseite und Planer anpassen

- [ ] Fußzeile „Stand: Oktober [Jahr]“, Grundlage „Abiturerlass [Jahr]“ (`index.html`)
- [ ] `PAIRS` (Kombinationen nach Tutoriumsblättern), `SUBJ`, `GK` (Grundkurs-Angebot) in `index.html`; danach `node tools/combos.mjs`
      (Kombinations-Tafel in allen Filmen) und `build.mjs` für alle Fächer. Schritt 4 „Noten“ an oder aus? (`NOTEN_AN`)
- [ ] Regeln im Planer gegen die geprüfte OAVO: `consequences`, `kNeeds`, `kChecks`, `MIN_BEL`/`MIN_EIN`, Einschränkungen, Schritt 4 (`p4Calc`, `p4EchtZul`, `p4Fhr`:
      § 23, § 26, § 48), Notentabellen Anlage 10b und 12, Texte „Deine Möglichkeiten“ (§ 13 Abs. 10–11, § 23 Abs. 5, § 48 Abs. 6), Link zur Berufsorientierung
- [ ] Planer-Tests: Sperre in allen Kombinationen gegen unabhängige Regelprüfung, Vorschläge, Einschränkungen gegen die Tutoriumsblätter
- [ ] Layout messen (1920×1080, 1920×936 Tafel, 1280×720, 1024×768, 1280×600, Handy), keine Überdeckung

## 4b. Moodle-Lernpaket

- [ ] `VERSION`/`STAND` in `tools/build_moodle.mjs` hochzählen, `node tools/build_moodle.mjs`, Durchlauf mit `dist/test_lms.html`
- [ ] Zip den Tutorinnen und Tutoren geben: Datei in der bestehenden Aktivität **ersetzen** (nicht neu anlegen), sonst gehen die gespeicherten Pläne verloren

## 5. Abschluss

- [ ] Wurden Dateien unter gleichem Namen ersetzt: `CACHE` in `sw.js` **und** `assets/js/offline.js` hochzählen
- [ ] Entscheidungslog-Eintrag „Jahrespflege [Jahr]“, CLAUDE.md-Stand, Faktenblatt-Versionen
- [ ] Veröffentlichen nach Freigabe; online prüfen; an einer Tafel ansehen (Update-Meldung erscheint von selbst)
- [ ] QR-Aushang noch gültig? (Adresse unverändert → ja)
- [ ] Nächste Erinnerung steht (geplante Aufgabe „Jahrespflege Leistungskurse“, jährlich 1. Oktober)
