/* regelwerk.js - Verwaltung der Regeln, Persistenz im localStorage */

const REGEL_SCHLUESSEL = 'kreditpruefung.regeln';

function standardRegeln() {
  return [
    new Regel('Tragbarkeit: Belastungsquote', 'tragbarkeitsquote', '<=', 0.35, 'beide'),
    new Regel('Verschuldungsquote (Schulden / Einkommen)', 'verschuldungsquote', '<=', 5, 'beide'),
    new Regel('Eigenmittelquote (Vermögen / Kreditbetrag)', 'eigenmittelquote', '>=', 0.1, 'beide'),
    new Regel('Freies Einkommen pro Monat', 'freiesEinkommen', '>=', 500, 'privat'),
    new Regel('Alter bei Kreditende', 'alterBeiKreditende', '<=', 70, 'privat'),
    new Regel('Mindestgewinn pro Jahr', 'einkommen', '>=', 50000, 'unternehmen')
  ];
}

function ladeRegeln() {
  try {
    const gespeichert = localStorage.getItem(REGEL_SCHLUESSEL);
    if (!gespeichert) return standardRegeln();
    const rohdaten = JSON.parse(gespeichert);
    return rohdaten.map(r => new Regel(r.bezeichnung, r.kennzahl, r.operator, r.grenzwert, r.giltFuer));
  } catch (fehler) {
    return standardRegeln();
  }
}

function speichereRegeln(regeln) {
  localStorage.setItem(REGEL_SCHLUESSEL, JSON.stringify(regeln));
}
