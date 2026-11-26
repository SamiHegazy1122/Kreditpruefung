# Automatisierte Tests – Kreditprüfung

Zwei Teststufen, die sich ergänzen:

| Stufe | Werkzeug | Was wird geprüft |
|---|---|---|
| **Unit-Tests** | Vitest + jsdom | Rechen- und Entscheidungslogik jeder Einheit des Klassendiagramms, inklusive Sonderfällen |
| **E2E-Tests** | Playwright (Chromium) | Die durchgängigen Benutzerflüsse im echten Browser, inklusive Persistenz und HTML5-Validierung |

Der Produktionscode (`index.html`, `js/*.js`) enthält **keinen Testcode**.

## Ausführen

```powershell
npm install                       # Abhängigkeiten installieren
npx playwright install chromium   # einmalig: Browser-Binary

npm test                          # Unit-Tests (Vitest)
npm run test:e2e                  # E2E-Tests (Playwright, startet den Testserver selbst)
npm run test:alle                 # beides nacheinander

npm run test:watch                # Unit-Tests im Watch-Modus
npm run test:e2e -- --headed      # E2E-Ablauf im sichtbaren Browser mitverfolgen
npx playwright show-report        # HTML-Report inkl. Traces/Screenshots der Fehlschläge
```

## Aufbau

```
tests/
  hilfen/app.js                    Harness: bootet die App in jsdom
  unit/
    modelle.test.js                Kreditantrag, Pruefergebnis, Regel
    rate.test.js                   monatsrate (Annuität)
    regelwerk.test.js              ladeRegeln / speichereRegeln / standardRegeln + localStorage
    pruefung.test.js               pruefeKredit / berechneKennzahlen / pruefeRegel / begruende
    tilgungsplan.test.js           tilgungsplan / gesamtzinsen + Tilgungszeile
    diagramm.test.js               zeichneDiagramm / zeigeDiagramm / netteSchrittweite
    ui.test.js                     Darstellung und Benutzerinteraktion
  e2e/
    server.mjs                     minimaler statischer Testserver (keine Extra-Dependency)
    hilfen.js                      Seiten-Hilfsfunktionen
    01-navigation.spec.js
    02-pruefung-privat.spec.js
    03-pruefung-unternehmen.spec.js
    04-regelwerk.spec.js
    05-formular-validierung.spec.js
    06-verlauf.spec.js
```

### Wie die Unit-Tests an den Code kommen

Die Applikation hat kein Modulsystem: alle Klassen und Funktionen sind globale
Bindings, geladen über die `<script>`-Tags in `index.html`. Damit die Tests ohne
Eingriff in den Produktionscode auskommen, liest `tests/hilfen/app.js` die
`index.html`, ersetzt jedes `<script src="…">` durch den echten Dateiinhalt und
startet die Seite in jsdom. Vorteile:

- die Ladereihenfolge stammt aus `index.html` und wird dadurch mitgetestet,
- neue Skripte in `index.html` werden automatisch mitgeladen,
- `localStorage` steht zur Verfügung (die Seite läuft unter einer `http`-URL).

Ein reines Test-Skript („Brücke") wird angehängt, weil top-level
`class`/`const`/`let`-Deklarationen eines klassischen Skripts im globalen
*lexikalischen* Scope landen und nicht auf dem `window`-Objekt. Die Brücke macht
`Kreditantrag`, `Pruefergebnis`, `Regel`, `KENNZAHLEN`, `regeln` usw. für die
Tests erreichbar.

### Warum die E2E-Tests über HTTP laufen

`tests/e2e/server.mjs` liefert das Projektverzeichnis statisch aus. Unter
`file://` ist `localStorage` in Chromium nicht nutzbar – die Persistenz des
Regelwerks liesse sich dort nicht testen. Playwright startet den Server über die
`webServer`-Option selbst; jeder Test läuft in einem frischen Browser-Kontext und
damit mit leerem `localStorage`.

## Abdeckung des Klassendiagramms

| Element im Klassendiagramm | Unit-Test | E2E |
|---|---|---|
| `ui.js` | `unit/ui.test.js` | 01, 02, 03, 04, 05 |
| `rate.js` | `unit/rate.test.js` | 02 (Rate im Resultat, Laufzeitvergleich) |
| `pruefung.js` | `unit/pruefung.test.js` | 02, 03 |
| `regelwerk.js` | `unit/regelwerk.test.js` | 04 |
| `«class» Kreditantrag` | `unit/modelle.test.js` | 02, 03 |
| `«class» Pruefergebnis` | `unit/modelle.test.js` | 02 |
| `«class» Regel` | `unit/modelle.test.js`, `unit/regelwerk.test.js` | 04 |
| `«class» Begruendung` | `unit/modelle.test.js`, `unit/pruefung.test.js` | 02, 03, 04 |
| `localStorage` (Notiz) | `unit/regelwerk.test.js` | 04 (Persistenz über Reload) |
| `tilgungsplan.js` | `unit/tilgungsplan.test.js` | 06 |
| `diagramm.js` | `unit/diagramm.test.js` | 06 |
| `«class» Tilgungszeile` | `unit/tilgungsplan.test.js` | 06 |
| `ui.js → zeigeVerlauf()` | `unit/ui.test.js` | 06 |

Die Diagramm-Kanten sind ebenfalls abgedeckt: `ui.js → pruefung.js` (Formular
absenden), `ui.js → regelwerk.js` (Speichern/Standardregeln), `pruefung.js →
rate.js` (Monatsrate), `pruefung.js → Regel` („wendet an", Regelauswahl nach
Antragstyp), `regelwerk.js → localStorage` („liest/schreibt"),
`tilgungsplan.js → rate.js` („verwendet", konstante Annuität),
`tilgungsplan.js → Tilgungszeile` („erzeugt"), `ui.js → diagramm.js`
(„zeichnet mit") und `Pruefergebnis.tilgungsplan` („verwendet").

Das Diagramm führt bei `pruefung.js` die Hilfsfunktionen `formatiereWert` und
`bezeichnungKennzahl` nicht auf, bei `ui.js` nicht `zeigeView`, `zahl`,
`zeigeAntragsformular`, `setzeStatus` und `laufzeitSchritt` und bei `diagramm.js`
nicht `netteSchrittweite`, `stapleReihen`, `svgElement` und `svgText`. Die Tests
decken sie trotzdem ab.

## Behobene Fehler

Alle Punkte, die die Tests zunächst als Ist-Verhalten festgeschrieben hatten,
sind inzwischen behoben. Die Tests sichern die Korrekturen ab:

1. **Kreditbetrag-Feld blockierte das Absenden** (`index.html`): `min="1"`
   zusammen mit `step="100"` machte nur 1, 101, 201 … gültig – der Vorgabewert
   150000 verstiess gegen die HTML5-Validierung und ein Klick auf
   „Kredit prüfen" blieb im Browser **wirkungslos**. Behoben mit `min="100"`.
   Bemerkenswert: alle Unit-Tests waren grün, weil jsdom die
   Constraint-Validierung beim Absenden nicht erzwingt. Nur die Browser-Tests
   haben den Fehler gefunden.
   Absicherung: `e2e/05-formular-validierung.spec.js`.
2. **Leeres Regelwerk empfahl die Vergabe** (`js/pruefung.js`): Ohne anwendbare
   Regel blieb `empfohlen = true` – die App empfahl eine Vergabe, ohne ein
   einziges Kriterium geprüft zu haben. Jetzt wird abgelehnt und begründet,
   warum keine Beurteilung möglich ist.
   Absicherung: `unit/pruefung.test.js`, `e2e/04-regelwerk.spec.js`.
3. **Altersregel blockierte jeden Unternehmenskredit** (`js/pruefung.js`):
   `alterBeiKreditende` ist bei Unternehmen `null`. Auf `giltFuer = 'beide'`
   gestellt, galt die Regel als verletzt statt als nicht anwendbar.
   `istAnwendbar()` überspringt eine Regel nun, wenn ihre Kennzahl für diesen
   Antragstyp nicht existiert. Bewusst anders behandelt: eine **unbekannte**
   Kennzahl (Tippfehler im Regelwerk) bleibt anwendbar und scheitert, damit sie
   nicht unbemerkt wegfällt; `Infinity` bei Einkommen 0 bleibt eine Verletzung.
   Absicherung: `unit/pruefung.test.js`, `e2e/04-regelwerk.spec.js`.
4. **Klassifizierung über Textsuche** (`js/ui.js`): Grün/Rot entschied
   `text.indexOf('nicht erfüllt')`. Eine Regelbezeichnung, die diese
   Zeichenfolge enthielt, färbte die Zeile falsch rot. `begruende()` liefert
   jetzt eine `Begruendung` mit `text` und `erfuellt`; die Anzeige liest das
   Flag. Absicherung: `unit/ui.test.js`, `unit/pruefung.test.js`.
5. **`zahl()` nur abgehärtet, kein erreichbarer Fehler** (`js/ui.js`):
   `parseFloat(…) || 0` wurde durch eine `isFinite`-Prüfung ersetzt, damit die
   Absicht explizit ist. Die Nachprüfung zeigte allerdings, dass der
   `Infinity`-Pfad über `<input type="number">` **nicht erreichbar** ist:
   Browser und jsdom bereinigen einen nicht darstellbaren Wert wie `1e999`
   selbst zu `""`. Beide Varianten verhalten sich für alle erreichbaren
   Eingaben identisch – es gibt daher bewusst **keinen** Regressionstest für
   diese Änderung. `unit/ui.test.js` hält stattdessen die tatsächliche Kette
   fest (ungültige Eingabe → leeres Feld → 0).
6. **Formatierung war ICU-abhängig** (`js/pruefung.js`):
   `toLocaleString('de-CH')` lieferte je nach Node-/Browser-Version ein anderes
   Tausendertrennzeichen. `formatiereBetrag()` gruppiert jetzt selbst mit einem
   Apostroph, wodurch die CHF-Assertions exakt statt tolerant vergleichen.
   Absicherung: `unit/pruefung.test.js`.
