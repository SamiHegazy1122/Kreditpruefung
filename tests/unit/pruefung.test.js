/* Klassendiagramm: pruefung.js - pruefeKredit / berechneKennzahlen / pruefeRegel / begruende
   (zusätzlich die im Diagramm nicht aufgeführten Hilfsfunktionen formatiereWert
   und bezeichnungKennzahl, die von ui.js mitverwendet werden). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { starteApp, erstelleAntrag } from '../hilfen/app.js';

let fenster;
let schliesse;

/** Kurzform fuer eine Regel. */
const regel = (kennzahl, operator, grenzwert, giltFuer = 'beide', bezeichnung = kennzahl) =>
  new fenster.Regel(bezeichnung, kennzahl, operator, grenzwert, giltFuer);

/** Unternehmensantrag, bei dem alle Regeln ausser dem Mindestgewinn erfuellt sind. */
const unternehmensAntrag = (abweichungen = {}) => erstelleAntrag(fenster, {
  typ: 'unternehmen', einkommen: 40000, vermoegen: 10000, wohnkosten: 0,
  kreditbetrag: 20000, laufzeitMonate: 60, alter: null, ...abweichungen
});

beforeAll(() => { ({ fenster, schliesse } = starteApp()); });
afterAll(() => schliesse());

describe('berechneKennzahlen - Referenzantrag (Vorgabewerte aus index.html)', () => {
  it('berechnet alle Kennzahlen des Privatantrags', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster));

    expect(k.monatsrate).toBeCloseTo(1448.4112, 4);
    expect(k.belastungBestehend).toBe(0);
    expect(k.monatsbelastung).toBeCloseTo(3048.4112, 4);
    expect(k.jahresbelastung).toBeCloseTo(36580.9340, 4);
    expect(k.tragbarkeitsquote).toBeCloseTo(0.3048411, 7);
    expect(k.verschuldungsquote).toBeCloseTo(1.25, 10);
    expect(k.eigenmittelquote).toBeCloseTo(0.4, 10);
    expect(k.freiesEinkommen).toBeCloseTo(6951.5888, 4);
    expect(k.alterBeiKreditende).toBe(50);
  });

  it('spiegelt Einkommen, Vermögen und Kreditbetrag unverändert als Kennzahlen', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster));
    expect(k.einkommen).toBe(120000);
    expect(k.vermoegen).toBe(60000);
    expect(k.kreditbetrag).toBe(150000);
  });

  it('rechnet bestehende Kredite mit 7 % pro Jahr kalkulatorisch an', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { bestehendeKredite: 24000 }));
    expect(k.belastungBestehend).toBeCloseTo(24000 * 0.07 / 12, 8);
    expect(k.belastungBestehend).toBeCloseTo(140, 8);
    expect(k.monatsbelastung).toBeCloseTo(1448.4112 + 1600 + 140, 3);
  });

  it('bildet Monats- und Jahresbelastung aus Rate, Wohnkosten und Bestandsbelastung', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { bestehendeKredite: 12000 }));
    expect(k.monatsbelastung).toBeCloseTo(k.monatsrate + 1600 + k.belastungBestehend, 8);
    expect(k.jahresbelastung).toBeCloseTo(k.monatsbelastung * 12, 8);
  });

  it('bezieht die Verschuldungsquote auf neuen Kredit plus Restschuld', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { bestehendeKredite: 30000 }));
    expect(k.verschuldungsquote).toBeCloseTo((150000 + 30000) / 120000, 10);
  });
});

describe('berechneKennzahlen - Sonderfälle', () => {
  it('liefert Infinity für die einkommensbezogenen Quoten, wenn kein Einkommen vorliegt', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { einkommen: 0 }));
    expect(k.tragbarkeitsquote).toBe(Infinity);
    expect(k.verschuldungsquote).toBe(Infinity);
  });

  it('liefert eine Eigenmittelquote von 0, wenn kein Kreditbetrag beantragt wird', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { kreditbetrag: 0 }));
    expect(k.eigenmittelquote).toBe(0);
  });

  it('erlaubt ein negatives freies Einkommen bei zu hoher Belastung', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { einkommen: 24000 }));
    expect(k.freiesEinkommen).toBeLessThan(0);
  });

  it('weist für Unternehmen kein Alter bei Kreditende aus', () => {
    expect(fenster.berechneKennzahlen(unternehmensAntrag()).alterBeiKreditende).toBeNull();
  });

  it('rechnet das Alter bei Kreditende aus Alter plus Laufzeit in Jahren', () => {
    const k = fenster.berechneKennzahlen(erstelleAntrag(fenster, { alter: 55, laufzeitMonate: 180 }));
    expect(k.alterBeiKreditende).toBe(70);
  });
});

describe('pruefeRegel', () => {
  it('prüft den Operator <= inklusive des Grenzwerts', () => {
    const kennzahlen = { tragbarkeitsquote: 0.35 };
    expect(fenster.pruefeRegel(regel('tragbarkeitsquote', '<=', 0.35), kennzahlen)).toBe(true);
    expect(fenster.pruefeRegel(regel('tragbarkeitsquote', '<=', 0.3499), kennzahlen)).toBe(false);
    expect(fenster.pruefeRegel(regel('tragbarkeitsquote', '<=', 0.36), kennzahlen)).toBe(true);
  });

  it('prüft den Operator >= inklusive des Grenzwerts', () => {
    const kennzahlen = { eigenmittelquote: 0.1 };
    expect(fenster.pruefeRegel(regel('eigenmittelquote', '>=', 0.1), kennzahlen)).toBe(true);
    expect(fenster.pruefeRegel(regel('eigenmittelquote', '>=', 0.1001), kennzahlen)).toBe(false);
    expect(fenster.pruefeRegel(regel('eigenmittelquote', '>=', 0.05), kennzahlen)).toBe(true);
  });

  it('gilt als nicht erfüllt, wenn die Kennzahl fehlt oder nicht endlich ist', () => {
    expect(fenster.pruefeRegel(regel('gibtsNicht', '<=', 1), {})).toBe(false);
    expect(fenster.pruefeRegel(regel('x', '<=', 1), { x: null })).toBe(false);
    expect(fenster.pruefeRegel(regel('x', '<=', 1), { x: undefined })).toBe(false);
    expect(fenster.pruefeRegel(regel('x', '<=', 1), { x: NaN })).toBe(false);
  });

  it('gilt als nicht erfüllt, wenn die Kennzahl Infinity ist - auch bei >=', () => {
    expect(fenster.pruefeRegel(regel('x', '<=', 1), { x: Infinity })).toBe(false);
    expect(fenster.pruefeRegel(regel('x', '>=', 1), { x: Infinity })).toBe(false);
  });

  it('gilt als nicht erfüllt bei einem unbekannten Operator', () => {
    const operatoren = ['<', '>', '==', '=', ''];
    operatoren.forEach(operator => {
      expect(fenster.pruefeRegel(regel('x', operator, 1), { x: 1 }), 'Operator ' + operator).toBe(false);
    });
  });
});

describe('begruende', () => {
  it('nennt Bezeichnung, Istwert, Operator, Grenzwert und das Resultat', () => {
    const kennzahlen = { tragbarkeitsquote: 0.3048411 };
    const text = fenster.begruende(
      regel('tragbarkeitsquote', '<=', 0.35, 'beide', 'Tragbarkeit: Belastungsquote'), kennzahlen
    );

    expect(text).toBe('Tragbarkeit: Belastungsquote: 30.5 % <= 35.0 % -> erfüllt');
  });

  it('kennzeichnet eine verletzte Regel mit "nicht erfüllt"', () => {
    const text = fenster.begruende(regel('eigenmittelquote', '>=', 0.5), { eigenmittelquote: 0.1 });
    expect(text).toContain('nicht erfüllt');
  });

  it('stellt einen fehlenden Istwert als "-" dar', () => {
    const text = fenster.begruende(regel('alterBeiKreditende', '<=', 70), { alterBeiKreditende: null });
    expect(text).toContain('-');
    expect(text).toContain('nicht erfüllt');
  });
});

describe('pruefeKredit - Empfehlung', () => {
  it('empfiehlt den Referenzantrag und weist die Monatsrate aus', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), fenster.standardRegeln());

    expect(ergebnis).toBeInstanceOf(fenster.Pruefergebnis);
    expect(ergebnis.empfohlen).toBe(true);
    expect(ergebnis.monatsrate).toBeCloseTo(1448.4112, 4);
    expect(ergebnis.begruendung).toHaveLength(5);
    expect(ergebnis.begruendung.every(text => !text.includes('nicht erfüllt'))).toBe(true);
  });

  it('lehnt einen zu hohen Kreditbetrag ab und weist keine Monatsrate aus', () => {
    const ergebnis = fenster.pruefeKredit(
      erstelleAntrag(fenster, { kreditbetrag: 900000 }), fenster.standardRegeln()
    );

    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.monatsrate).toBeNull();
    expect(ergebnis.begruendung.filter(text => text.includes('nicht erfüllt'))).toHaveLength(4);
    /* Die Kennzahlen bleiben trotz Ablehnung erhalten und nachvollziehbar. */
    expect(ergebnis.kennzahlen.monatsrate).toBeGreaterThan(0);
  });

  it('lehnt ab, sobald eine einzige Regel verletzt ist', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), [
      regel('tragbarkeitsquote', '<=', 0.35),
      regel('eigenmittelquote', '>=', 0.99)
    ]);

    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.begruendung[0]).toContain('-> erfüllt');
    expect(ergebnis.begruendung[1]).toContain('nicht erfüllt');
  });

  it('empfiehlt genau dann, wenn alle anwendbaren Regeln erfüllt sind', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), [
      regel('tragbarkeitsquote', '<=', 0.35),
      regel('freiesEinkommen', '>=', 500, 'privat')
    ]);
    expect(ergebnis.empfohlen).toBe(true);
  });
});

describe('pruefeKredit - Regelauswahl nach Antragstyp', () => {
  it('wendet bei Privatpersonen die Regeln "beide" und "privat" an', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), fenster.standardRegeln());
    const texte = ergebnis.begruendung.join('\n');

    expect(ergebnis.begruendung).toHaveLength(5);
    expect(texte).toContain('Freies Einkommen');
    expect(texte).toContain('Alter bei Kreditende');
    expect(texte).not.toContain('Mindestgewinn');
  });

  it('wendet bei Unternehmen die Regeln "beide" und "unternehmen" an', () => {
    const ergebnis = fenster.pruefeKredit(unternehmensAntrag(), fenster.standardRegeln());
    const texte = ergebnis.begruendung.join('\n');

    expect(ergebnis.begruendung).toHaveLength(4);
    expect(texte).toContain('Mindestgewinn');
    expect(texte).not.toContain('Freies Einkommen');
    expect(texte).not.toContain('Alter bei Kreditende');
  });

  it('lehnt einen Unternehmensantrag unter dem Mindestgewinn ab', () => {
    const ergebnis = fenster.pruefeKredit(unternehmensAntrag({ einkommen: 40000 }), fenster.standardRegeln());

    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.begruendung.filter(text => text.includes('nicht erfüllt'))).toHaveLength(1);
    expect(ergebnis.begruendung.at(-1)).toContain('Mindestgewinn');
  });

  it('empfiehlt einen Unternehmensantrag über dem Mindestgewinn', () => {
    const ergebnis = fenster.pruefeKredit(unternehmensAntrag({ einkommen: 200000 }), fenster.standardRegeln());
    expect(ergebnis.empfohlen).toBe(true);
  });

  it('weist auf eine fehlende Regel hin, wenn keine Regel für den Typ gilt', () => {
    const ergebnis = fenster.pruefeKredit(
      unternehmensAntrag(), [regel('freiesEinkommen', '>=', 500, 'privat')]
    );

    expect(ergebnis.begruendung).toHaveLength(1);
    expect(ergebnis.begruendung[0]).toContain('Keine Regel definiert');
    /* Ohne pruefbares Kriterium gibt es keine Grundlage fuer eine Vergabe. */
    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.monatsrate).toBeNull();
  });

  it('empfiehlt bei komplett leerem Regelwerk nicht', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), []);

    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.begruendung).toHaveLength(1);
    expect(ergebnis.begruendung[0]).toContain('keine Vergabe empfohlen werden');
  });

  it('überspringt Regeln, deren Kennzahl für diesen Antragstyp nicht existiert', () => {
    /* alterBeiKreditende ist bei Unternehmen null. Mit giltFuer "beide" wurde die
       Regel frueher als verletzt gewertet und blockierte jeden Unternehmenskredit. */
    const ergebnis = fenster.pruefeKredit(unternehmensAntrag({ einkommen: 200000 }), [
      regel('tragbarkeitsquote', '<=', 0.35),
      regel('alterBeiKreditende', '<=', 70, 'beide')
    ]);

    expect(ergebnis.empfohlen).toBe(true);
    expect(ergebnis.begruendung).toHaveLength(1);
    expect(ergebnis.begruendung[0]).toContain('tragbarkeitsquote');
  });

  it('wendet dieselbe Regel bei Privatpersonen weiterhin an', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster, { alter: 64 }), [
      regel('alterBeiKreditende', '<=', 70, 'beide')
    ]);

    expect(ergebnis.begruendung).toHaveLength(1);
    expect(ergebnis.empfohlen).toBe(false);
  });

  it('lässt eine Regel mit unbekannter Kennzahl scheitern statt sie zu übergehen', () => {
    /* Ein Tippfehler im Regelwerk darf nicht dazu führen, dass die Regel
       stillschweigend wegfällt und der Kredit dadurch empfohlen wird. */
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), [
      regel('gibtsNicht', '<=', 1)
    ]);

    expect(ergebnis.begruendung).toHaveLength(1);
    expect(ergebnis.begruendung[0]).toContain('nicht erfüllt');
    expect(ergebnis.empfohlen).toBe(false);
  });

  it('lehnt bei Einkommen 0 wegen der nicht berechenbaren Quoten ab', () => {
    /* Infinity bleibt eine Regelverletzung und wird nicht als "nicht
       anwendbar" uebergangen. */
    const ergebnis = fenster.pruefeKredit(
      erstelleAntrag(fenster, { einkommen: 0 }), [regel('tragbarkeitsquote', '<=', 0.35)]
    );

    expect(ergebnis.begruendung).toHaveLength(1);
    expect(ergebnis.empfohlen).toBe(false);
  });
});

describe('pruefeKredit - Berechnungsschritte', () => {
  it('dokumentiert für Privatpersonen elf Schritte inklusive Alter bei Kreditende', () => {
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), fenster.standardRegeln());

    expect(ergebnis.schritte).toHaveLength(11);
    expect(ergebnis.schritte.at(-1)).toContain('Alter bei Kreditende');
    expect(ergebnis.schritte.every(text => text.length > 0)).toBe(true);
  });

  it('dokumentiert für Unternehmen zehn Schritte ohne Altersschritt', () => {
    const ergebnis = fenster.pruefeKredit(unternehmensAntrag(), fenster.standardRegeln());

    expect(ergebnis.schritte).toHaveLength(10);
    expect(ergebnis.schritte.join('\n')).not.toContain('Alter bei Kreditende');
  });

  it('nennt die Schritte in der Reihenfolge der Berechnung', () => {
    const schritte = fenster.pruefeKredit(erstelleAntrag(fenster), fenster.standardRegeln()).schritte;

    const erwarteteReihenfolge = [
      'Monatszinssatz',
      'Monatsrate',
      'Zinszahlungen',
      'bestehender Kredite',
      'Monatsbelastung',
      'Jahresbelastung',
      'Belastungsquote',
      'Verschuldungsquote',
      'Eigenmittelquote',
      'Freies Einkommen',
      'Alter bei Kreditende'
    ];
    erwarteteReihenfolge.forEach((stichwort, index) => {
      expect(schritte[index], 'Schritt ' + (index + 1)).toContain(stichwort);
    });
  });

  it('weist den Monatszinssatz mit vier Dezimalstellen aus', () => {
    const schritte = fenster.pruefeKredit(erstelleAntrag(fenster, { zinssatz: 3 }), []).schritte;
    expect(schritte[0]).toContain('0.2500 % pro Monat');
  });
});

describe('formatiereWert', () => {
  it('stellt Quoten als Prozentwert mit einer Dezimalstelle dar', () => {
    expect(fenster.formatiereWert('tragbarkeitsquote', 0.3048411)).toBe('30.5 %');
    expect(fenster.formatiereWert('eigenmittelquote', 0.1)).toBe('10.0 %');
  });

  it('stellt die Verschuldungsquote als Faktor dar', () => {
    expect(fenster.formatiereWert('verschuldungsquote', 1.25)).toBe('1.25-fach');
  });

  it('stellt Altersangaben in Jahren dar', () => {
    expect(fenster.formatiereWert('alterBeiKreditende', 50)).toBe('50.0 Jahre');
  });

  it('stellt Beträge mit CHF-Präfix und Apostroph als Tausendertrennzeichen dar', () => {
    expect(fenster.formatiereWert('monatsrate', 1448.4111704758695)).toBe('CHF 1’448.41');
    expect(fenster.formatiereWert('kreditbetrag', 150000)).toBe('CHF 150’000');
  });

  it('stellt fehlende und nicht endliche Werte als "-" dar', () => {
    const werte = [null, undefined, NaN, Infinity, -Infinity];
    werte.forEach(wert => {
      expect(fenster.formatiereWert('monatsrate', wert), String(wert)).toBe('-');
    });
  });

  it('gibt Zahlen zu unbekannten Kennzahlen unformatiert aus', () => {
    expect(fenster.formatiereWert('gibtsNicht', 5)).toBe('5');
  });
});

describe('formatiereBetrag', () => {
  it('gruppiert Tausender mit einem Apostroph', () => {
    expect(fenster.formatiereBetrag(1000)).toBe('1’000');
    expect(fenster.formatiereBetrag(150000)).toBe('150’000');
    expect(fenster.formatiereBetrag(1000000)).toBe('1’000’000');
  });

  it('gruppiert erst ab vier Stellen', () => {
    expect(fenster.formatiereBetrag(0)).toBe('0');
    expect(fenster.formatiereBetrag(999)).toBe('999');
  });

  it('rundet auf zwei Nachkommastellen und lässt nachgestellte Nullen weg', () => {
    expect(fenster.formatiereBetrag(1448.4111704758695)).toBe('1’448.41');
    expect(fenster.formatiereBetrag(1234.5)).toBe('1’234.5');
    expect(fenster.formatiereBetrag(1234.567)).toBe('1’234.57');
    expect(fenster.formatiereBetrag(0.004)).toBe('0');
  });

  it('stellt negative Beträge mit Vorzeichen dar', () => {
    expect(fenster.formatiereBetrag(-2500.75)).toBe('-2’500.75');
    expect(fenster.formatiereBetrag(-999)).toBe('-999');
  });

  it('ist unabhängig von der Locale der Laufzeitumgebung', () => {
    /* Regressionsschutz: toLocaleString('de-CH') lieferte je nach ICU-Version
       ein anderes Tausendertrennzeichen und machte die Anzeige unvorhersehbar. */
    const text = fenster.formatiereBetrag(1234567.891);
    expect(text).toBe('1’234’567.89');
    expect(text).not.toContain(',');
  });
});

describe('bezeichnungKennzahl', () => {
  it('liefert die sprechende Bezeichnung einer bekannten Kennzahl', () => {
    expect(fenster.bezeichnungKennzahl('monatsrate')).toBe('Monatsrate neuer Kredit');
    expect(fenster.bezeichnungKennzahl('tragbarkeitsquote')).toContain('Belastungsquote');
  });

  it('gibt eine unbekannte Kennzahl unverändert zurück', () => {
    expect(fenster.bezeichnungKennzahl('gibtsNicht')).toBe('gibtsNicht');
  });

  it('hat für jede im Regelwerk verwendete Kennzahl eine Bezeichnung', () => {
    fenster.standardRegeln().forEach(r => {
      expect(Object.keys(fenster.KENNZAHLEN), r.kennzahl).toContain(r.kennzahl);
    });
  });

  it('berechnet für jede auswählbare Kennzahl auch einen Wert', () => {
    const kennzahlen = fenster.berechneKennzahlen(erstelleAntrag(fenster));
    Object.keys(fenster.KENNZAHLEN).forEach(name => {
      expect(kennzahlen, name).toHaveProperty(name);
    });
  });
});
