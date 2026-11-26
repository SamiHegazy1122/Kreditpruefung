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
    ui.test.js                     Darstellung und Benutzerinteraktion
  e2e/
    server.mjs                     minimaler statischer Testserver (keine Extra-Dependency)
    hilfen.js                      Seiten-Hilfsfunktionen
    01-navigation.spec.js
    02-pruefung-privat.spec.js
    03-pruefung-unternehmen.spec.js
    04-regelwerk.spec.js
    05-formular-validierung.spec.js
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
| `localStorage` (Notiz) | `unit/regelwerk.test.js` | 04 (Persistenz über Reload) |

Die Diagramm-Kanten sind ebenfalls abgedeckt: `ui.js → pruefung.js` (Formular
absenden), `ui.js → regelwerk.js` (Speichern/Standardregeln), `pruefung.js →
rate.js` (Monatsrate), `pruefung.js → Regel` („wendet an", Regelauswahl nach
Antragstyp), `regelwerk.js → localStorage` („liest/schreibt").

Das Diagramm führt bei `pruefung.js` die Hilfsfunktionen `formatiereWert` und
`bezeichnungKennzahl` nicht auf und bei `ui.js` nicht `zeigeView`, `zahl`,
`zeigeAntragsformular` und `setzeStatus`. Die Tests decken sie trotzdem ab.

**Noch nicht abgedeckt:** die Erweiterung `js/tilgungsplan.js`, `js/diagramm.js`
und die Klasse `Tilgungszeile` sind weder im Klassendiagramm beschrieben noch
getestet. Die bestehenden Tests prüfen aber, dass die Erweiterung die
Kreditprüfung nicht verändert (Kennzahlen, Empfehlung, Begründung) und der neue
Berechnungsschritt „Gesamte Zinszahlungen" an der richtigen Stelle erscheint.

## Beobachtungen aus dem Code

Die Tests schreiben folgende Punkte als **Ist-Verhalten** fest. Falls einer davon
fachlich unerwünscht ist, wäre das eine Folgeänderung am Produktionscode:

1. **Leeres Regelwerk ⇒ Kredit empfohlen** (`js/pruefung.js`): Gibt es keine
   anwendbare Regel, bleibt `empfohlen = true` – es wird eine Vergabe empfohlen,
   ohne dass ein Kriterium geprüft wurde. Fachlich wäre „keine Empfehlung
   möglich" plausibler.
   Tests: `unit/pruefung.test.js`, `e2e/04-regelwerk.spec.js`.
2. **Klassifizierung über Textsuche** (`js/ui.js`): Grün/Rot entscheidet
   `text.indexOf('nicht erfüllt')`. Eine Regel-`bezeichnung`, die „nicht erfüllt"
   enthält, färbt die Zeile falsch rot. Robuster wäre ein `erfuellt`-Flag im
   Prüfergebnis. Test: `unit/ui.test.js`.
3. **`zahl()` verwechselt 0 und ungültig** (`js/ui.js`): `parseFloat(…) || 0`
   macht aus leeren oder unlesbaren Feldern eine 0 – bei `einkommen` führt das zu
   `Infinity`-Kennzahlen. Test: `unit/ui.test.js`.
4. **`alterBeiKreditende` ist `null` bei Unternehmen**: Stellt die Bank diese
   Regel auf `giltFuer = 'beide'`, scheitert sie für Unternehmen immer
   (`pruefeRegel` → `false`), ein Unternehmenskredit wird also nie mehr
   empfohlen. Die UI erlaubt diese Kombination. Test: `unit/pruefung.test.js`.
5. **Formatierung ist ICU-abhängig** (`js/pruefung.js`): `toLocaleString('de-CH')`
   liefert je nach Node-/Browser-Version ein anderes Tausendertrennzeichen.
   CHF-Beträge werden darum toleranz- statt exakt-verglichen
   (`nurZahlentext` in `tests/hilfen/app.js`).

### Durch die Tests gefundener und behobener Fehler

`#kreditbetrag` hatte `min="1"` zusammen mit `step="100"`. Damit ist die
Schrittbasis 1, gültig sind also nur 1, 101, 201 … – der Vorgabewert 150000
verstiess gegen die HTML5-Validierung und ein Klick auf „Kredit prüfen" blieb im
Browser **wirkungslos**. Behoben mit `min="100"`.

Bemerkenswert: alle Unit-Tests waren grün, weil jsdom die
Constraint-Validierung beim Absenden nicht erzwingt. Nur die Browser-Tests haben
den Fehler gefunden – `e2e/05-formular-validierung.spec.js` sichert ihn ab.
