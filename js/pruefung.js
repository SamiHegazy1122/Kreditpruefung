/* pruefung.js - Kennzahlen berechnen und Regeln anwenden */

/* Kalkulatorische Jahresbelastung bestehender Kredite (Zins + Amortisation) */
const SATZ_BESTEHENDE_KREDITE = 0.07;

/* Beschreibung der Kennzahlen: Bezeichnung und Darstellung */
const KENNZAHLEN = {
  monatsrate:         { label: 'Monatsrate neuer Kredit', einheit: 'chf' },
  monatsbelastung:    { label: 'Gesamte Monatsbelastung', einheit: 'chf' },
  jahresbelastung:    { label: 'Gesamte Jahresbelastung', einheit: 'chf' },
  tragbarkeitsquote:  { label: 'Belastungsquote (Belastung / Einkommen)', einheit: 'prozent' },
  verschuldungsquote: { label: 'Verschuldungsquote (Schulden / Einkommen)', einheit: 'faktor' },
  eigenmittelquote:   { label: 'Eigenmittelquote (Vermögen / Kreditbetrag)', einheit: 'prozent' },
  freiesEinkommen:    { label: 'Freies Einkommen pro Monat', einheit: 'chf' },
  alterBeiKreditende: { label: 'Alter bei Kreditende', einheit: 'jahre' },
  einkommen:          { label: 'Einkommen bzw. Gewinn pro Jahr', einheit: 'chf' },
  vermoegen:          { label: 'Vermögen', einheit: 'chf' },
  kreditbetrag:       { label: 'Kreditbetrag', einheit: 'chf' }
};

function formatiereWert(kennzahl, wert) {
  if (wert === null || wert === undefined || !isFinite(wert)) return '-';
  const einheit = KENNZAHLEN[kennzahl] ? KENNZAHLEN[kennzahl].einheit : 'zahl';
  if (einheit === 'prozent') return (wert * 100).toFixed(1) + ' %';
  if (einheit === 'faktor') return wert.toFixed(2) + '-fach';
  if (einheit === 'jahre') return wert.toFixed(1) + ' Jahre';
  if (einheit === 'chf') return 'CHF ' + wert.toLocaleString('de-CH', { maximumFractionDigits: 2 });
  return String(wert);
}

function bezeichnungKennzahl(kennzahl) {
  return KENNZAHLEN[kennzahl] ? KENNZAHLEN[kennzahl].label : kennzahl;
}

function berechneKennzahlen(antrag) {
  const rate = monatsrate(antrag.kreditbetrag, antrag.zinssatz, antrag.laufzeitMonate);
  const belastungBestehend = antrag.bestehendeKredite * SATZ_BESTEHENDE_KREDITE / 12;
  const monatsbelastung = rate + antrag.wohnkosten + belastungBestehend;
  const jahresbelastung = monatsbelastung * 12;

  return {
    monatsrate: rate,
    belastungBestehend: belastungBestehend,
    monatsbelastung: monatsbelastung,
    jahresbelastung: jahresbelastung,
    tragbarkeitsquote: antrag.einkommen > 0 ? jahresbelastung / antrag.einkommen : Infinity,
    verschuldungsquote: antrag.einkommen > 0
      ? (antrag.kreditbetrag + antrag.bestehendeKredite) / antrag.einkommen : Infinity,
    eigenmittelquote: antrag.kreditbetrag > 0 ? antrag.vermoegen / antrag.kreditbetrag : 0,
    freiesEinkommen: antrag.einkommen / 12 - monatsbelastung,
    alterBeiKreditende: antrag.typ === 'privat' ? antrag.alter + antrag.laufzeitMonate / 12 : null,
    einkommen: antrag.einkommen,
    vermoegen: antrag.vermoegen,
    kreditbetrag: antrag.kreditbetrag
  };
}

function pruefeRegel(regel, kennzahlen) {
  const wert = kennzahlen[regel.kennzahl];
  if (wert === null || wert === undefined || !isFinite(wert)) return false;
  if (regel.operator === '<=') return wert <= regel.grenzwert;
  if (regel.operator === '>=') return wert >= regel.grenzwert;
  return false;
}

function begruende(regel, kennzahlen) {
  const wert = kennzahlen[regel.kennzahl];
  const erfuellt = pruefeRegel(regel, kennzahlen);
  return regel.bezeichnung + ': ' + formatiereWert(regel.kennzahl, wert)
    + ' ' + regel.operator + ' ' + formatiereWert(regel.kennzahl, regel.grenzwert)
    + ' -> ' + (erfuellt ? 'erfüllt' : 'nicht erfüllt');
}

function pruefeKredit(antrag, regeln) {
  const kennzahlen = berechneKennzahlen(antrag);
  const plan = tilgungsplan(antrag.kreditbetrag, antrag.zinssatz, antrag.laufzeitMonate);
  const anwendbar = regeln.filter(r => r.giltFuer === 'beide' || r.giltFuer === antrag.typ);

  const begruendung = [];
  let empfohlen = true;
  anwendbar.forEach(regel => {
    if (!pruefeRegel(regel, kennzahlen)) empfohlen = false;
    begruendung.push(begruende(regel, kennzahlen));
  });
  if (anwendbar.length === 0) begruendung.push('Keine Regel definiert, die für diesen Antragstyp gilt.');

  const schritte = [
    'Monatszinssatz = ' + antrag.zinssatz + ' % / 12 = '
      + (antrag.zinssatz / 12).toFixed(4) + ' % pro Monat',
    'Monatsrate (Annuität) aus Kreditbetrag ' + formatiereWert('kreditbetrag', antrag.kreditbetrag)
      + ', Laufzeit ' + antrag.laufzeitMonate + ' Monate und Zinssatz ' + antrag.zinssatz + ' % = '
      + formatiereWert('monatsrate', kennzahlen.monatsrate),
    'Gesamte Zinszahlungen über die Laufzeit = Summe aller Zinsanteile = '
      + formatiereWert('kreditbetrag', gesamtzinsen(plan)),
    'Kalkulatorische Belastung bestehender Kredite = '
      + formatiereWert('vermoegen', antrag.bestehendeKredite) + ' x '
      + (SATZ_BESTEHENDE_KREDITE * 100).toFixed(1) + ' % / 12 = '
      + formatiereWert('monatsrate', kennzahlen.belastungBestehend),
    'Monatsbelastung = Monatsrate + Wohnkosten ' + formatiereWert('monatsrate', antrag.wohnkosten)
      + ' + Belastung bestehender Kredite = ' + formatiereWert('monatsbelastung', kennzahlen.monatsbelastung),
    'Jahresbelastung = Monatsbelastung x 12 = ' + formatiereWert('jahresbelastung', kennzahlen.jahresbelastung),
    'Belastungsquote = Jahresbelastung / Einkommen '
      + formatiereWert('einkommen', antrag.einkommen) + ' = '
      + formatiereWert('tragbarkeitsquote', kennzahlen.tragbarkeitsquote),
    'Verschuldungsquote = (Kreditbetrag + bestehende Kredite) / Einkommen = '
      + formatiereWert('verschuldungsquote', kennzahlen.verschuldungsquote),
    'Eigenmittelquote = Vermögen / Kreditbetrag = '
      + formatiereWert('eigenmittelquote', kennzahlen.eigenmittelquote),
    'Freies Einkommen = Einkommen / 12 - Monatsbelastung = '
      + formatiereWert('freiesEinkommen', kennzahlen.freiesEinkommen)
  ];
  if (antrag.typ === 'privat') {
    schritte.push('Alter bei Kreditende = Alter ' + antrag.alter + ' + Laufzeit '
      + antrag.laufzeitMonate + ' / 12 = '
      + formatiereWert('alterBeiKreditende', kennzahlen.alterBeiKreditende));
  }

  return new Pruefergebnis(
    empfohlen,
    kennzahlen,
    begruendung,
    schritte,
    empfohlen ? kennzahlen.monatsrate : null,
    plan
  );
}
