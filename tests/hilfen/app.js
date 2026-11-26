/*
 * Test-Harness: bootet die echte Applikation in einer jsdom-Instanz.
 *
 * Die Produktionsdateien werden NICHT verändert. Statt jsdom externe Ressourcen
 * laden zu lassen, wird index.html gelesen und jedes <script src="..."> durch den
 * echten Dateiinhalt ersetzt. Damit gilt:
 *   - die Ladereihenfolge stammt aus index.html (wird also mitgetestet),
 *   - alle Klassen/Funktionen laufen im globalen Scope wie im Browser,
 *   - die Seite läuft unter einer http-URL, damit localStorage verfügbar ist.
 *
 * Zusätzlich wird ein reines Test-Skript ("Brücke") angehängt: top-level
 * class/const/let-Deklarationen eines klassischen Skripts landen im globalen
 * LEXIKALISCHEN Scope und nicht auf dem window-Objekt. Die Brücke macht sie für
 * die Tests erreichbar (regeln/aktuellerTyp über Getter/Setter, damit die Tests
 * den echten Zustand von ui.js sehen).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const WURZEL = fileURLToPath(new URL('../../', import.meta.url));

export const SPEICHER_SCHLUESSEL = 'kreditpruefung.regeln';

/** Antragswerte, die den Vorgabewerten der Formularfelder in index.html entsprechen. */
export const REFERENZ_ANTRAG = {
  typ: 'privat',
  einkommen: 120000,
  vermoegen: 60000,
  wohnkosten: 1600,
  bestehendeKredite: 0,
  kreditbetrag: 150000,
  laufzeitMonate: 120,
  zinssatz: 3,
  alter: 40
};

/* Namen, die per Test-Skript auf window gespiegelt werden. Nicht vorhandene
   Namen werden übersprungen, damit der Harness neue oder entfernte Module
   überlebt. */
const GESPIEGELTE_NAMEN = [
  'Kreditantrag', 'Pruefergebnis', 'Regel', 'Tilgungszeile',   // modelle.js
  'KENNZAHLEN', 'SATZ_BESTEHENDE_KREDITE',                     // pruefung.js
  'REGEL_SCHLUESSEL',                                          // regelwerk.js
  'SVG_NS', 'DIAGRAMM_FARBEN', 'DIA_BREITE', 'DIA_HOEHE', 'DIA_RAND'  // diagramm.js
];

/* Veränderliche Zustandsvariablen aus ui.js: als Getter/Setter, damit die Tests
   den echten Zustand sehen und setzen können. */
const GESPIEGELTE_ZUSTAENDE = ['regeln', 'aktuellerTyp'];

const BRUECKE = [
  '<script>',
  ...GESPIEGELTE_NAMEN.map(name =>
    `if (typeof ${name} !== 'undefined') Object.defineProperty(window, '${name}', `
    + `{ value: ${name}, configurable: true });`
  ),
  ...GESPIEGELTE_ZUSTAENDE.map(name =>
    `if (typeof ${name} !== 'undefined') Object.defineProperty(window, '${name}', `
    + `{ get: () => ${name}, set: (wert) => { ${name} = wert; }, configurable: true });`
  ),
  '</script>'
].join('\n');

function baueSeite() {
  const html = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
  const mitSkripten = html.replace(/<script src="([^"]+)"><\/script>/g, (_treffer, quelle) => {
    const code = fs.readFileSync(path.join(WURZEL, quelle), 'utf8');
    return '<script>\n' + code + '\n</script>';
  });
  return mitSkripten.replace('</body>', BRUECKE + '\n</body>');
}

const SEITE = baueSeite();

/**
 * Startet die App und liefert das jsdom-Fenster samt Aufräumfunktion.
 *
 * @param {object} [optionen]
 * @param {Array|null}  [optionen.regeln]        Regeln, die vor dem Start im localStorage liegen.
 * @param {string|null} [optionen.roherSpeicher] Roher localStorage-Inhalt (für Fehlerfälle wie kaputtes JSON).
 */
export function starteApp({ regeln = null, roherSpeicher = null } = {}) {
  const dom = new JSDOM(SEITE, {
    runScripts: 'dangerously',
    url: 'http://127.0.0.1/',
    pretendToBeVisual: true,
    beforeParse(fenster) {
      if (roherSpeicher !== null) {
        fenster.localStorage.setItem(SPEICHER_SCHLUESSEL, roherSpeicher);
      } else if (regeln !== null) {
        fenster.localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(regeln));
      }
    }
  });

  return {
    fenster: dom.window,
    /* Schliesst das Fenster, damit offene setTimeout-Aufrufe (setzeStatus) nicht nachhängen. */
    schliesse: () => dom.window.close()
  };
}

/** Baut einen Kreditantrag aus den Referenzwerten mit optionalen Abweichungen. */
export function erstelleAntrag(fenster, abweichungen = {}) {
  const w = { ...REFERENZ_ANTRAG, ...abweichungen };
  return new fenster.Kreditantrag(
    w.typ, w.einkommen, w.vermoegen, w.wohnkosten, w.bestehendeKredite,
    w.kreditbetrag, w.laufzeitMonate, w.zinssatz, w.alter
  );
}

/** Reduziert einen formatierten Betrag auf Ziffern und Dezimalpunkt, damit der
 *  Vergleich unabhängig vom ICU-Tausendertrennzeichen von de-CH funktioniert. */
export function nurZahlentext(text) {
  return String(text).replace(/[^0-9.]/g, '');
}
