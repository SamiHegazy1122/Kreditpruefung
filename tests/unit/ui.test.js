/* Klassendiagramm: ui.js - zeigeTypAuswahl / leseAntrag / zeigeResultat /
   zeigeBerechnungsschritte / bearbeiteRegeln (plus die Hilfsfunktionen
   zeigeView, zahl, zeigeAntragsformular und setzeStatus). */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { starteApp, erstelleAntrag } from '../hilfen/app.js';

let fenster;
let dokument;
let schliesse;

beforeEach(() => {
  ({ fenster, schliesse } = starteApp());
  dokument = fenster.document;
});

afterEach(() => schliesse());

/** Liefert die ids aller nicht versteckten Views. */
const sichtbareViews = () => [...dokument.querySelectorAll('.view')]
  .filter(view => !view.classList.contains('versteckt'))
  .map(view => view.id);

const feld = (id) => dokument.getElementById(id);

const loeseAus = (element, typ) => element.dispatchEvent(
  new fenster.Event(typ, { bubbles: true, cancelable: true })
);

const privatErgebnis = (abweichungen = {}) => fenster.pruefeKredit(
  erstelleAntrag(fenster, abweichungen), fenster.standardRegeln()
);

const unternehmensErgebnis = () => fenster.pruefeKredit(
  erstelleAntrag(fenster, {
    typ: 'unternehmen', einkommen: 200000, vermoegen: 10000, wohnkosten: 0,
    kreditbetrag: 20000, laufzeitMonate: 60, alter: null
  }),
  fenster.standardRegeln()
);

describe('Startzustand und zeigeView', () => {
  it('zeigt beim Laden nur die Typ-Auswahl', () => {
    expect(sichtbareViews()).toEqual(['view-typ']);
  });

  it('zeigt mit zeigeView immer genau eine View', () => {
    fenster.zeigeView('view-regeln');
    expect(sichtbareViews()).toEqual(['view-regeln']);

    fenster.zeigeView('view-antrag');
    expect(sichtbareViews()).toEqual(['view-antrag']);
  });

  it('kehrt mit zeigeTypAuswahl zur Typ-Auswahl zurück', () => {
    fenster.zeigeView('view-resultat');
    fenster.zeigeTypAuswahl();
    expect(sichtbareViews()).toEqual(['view-typ']);
  });

  it('lädt die Regeln beim Start über regelwerk.js', () => {
    expect(fenster.regeln).toHaveLength(6);
  });

  it('übernimmt beim Start im localStorage gespeicherte Regeln', () => {
    schliesse();
    ({ fenster, schliesse } = starteApp({
      regeln: [{ bezeichnung: 'Nur eine', kennzahl: 'einkommen', operator: '>=', grenzwert: 1, giltFuer: 'beide' }]
    }));
    expect(fenster.regeln).toHaveLength(1);
    expect(fenster.regeln[0].bezeichnung).toBe('Nur eine');
  });
});

describe('zeigeAntragsformular', () => {
  it('zeigt für Privatpersonen den passenden Titel und das Altersfeld', () => {
    fenster.zeigeAntragsformular('privat');

    expect(sichtbareViews()).toEqual(['view-antrag']);
    expect(feld('antrag-titel').textContent).toContain('Privatperson');
    expect(feld('feld-alter').classList.contains('versteckt')).toBe(false);
  });

  it('versteckt für Unternehmen das Altersfeld', () => {
    fenster.zeigeAntragsformular('unternehmen');

    expect(feld('antrag-titel').textContent).toContain('Unternehmen');
    expect(feld('feld-alter').classList.contains('versteckt')).toBe(true);
  });

  it('merkt sich den gewählten Typ für das Absenden des Formulars', () => {
    fenster.zeigeAntragsformular('unternehmen');
    expect(fenster.aktuellerTyp).toBe('unternehmen');
  });

  it('wird durch die Typ-Buttons ausgelöst', () => {
    dokument.querySelector('[data-typ="unternehmen"]').click();

    expect(sichtbareViews()).toEqual(['view-antrag']);
    expect(fenster.aktuellerTyp).toBe('unternehmen');
    expect(feld('feld-alter').classList.contains('versteckt')).toBe(true);
  });
});

describe('leseAntrag', () => {
  it('liest die Vorgabewerte des Formulars in einen Kreditantrag', () => {
    const antrag = fenster.leseAntrag('privat');

    expect(antrag).toBeInstanceOf(fenster.Kreditantrag);
    expect(antrag).toEqual(erstelleAntrag(fenster));
  });

  it('liest geänderte Formularwerte', () => {
    feld('einkommen').value = '90000';
    feld('kreditbetrag').value = '200000';
    feld('zinssatz').value = '4.25';

    const antrag = fenster.leseAntrag('privat');
    expect(antrag.einkommen).toBe(90000);
    expect(antrag.kreditbetrag).toBe(200000);
    expect(antrag.zinssatz).toBe(4.25);
  });

  it('setzt das Alter für Unternehmen auf null', () => {
    const antrag = fenster.leseAntrag('unternehmen');
    expect(antrag.typ).toBe('unternehmen');
    expect(antrag.alter).toBeNull();
  });

  it('wertet leere oder unlesbare Felder als 0', () => {
    feld('einkommen').value = '';
    feld('vermoegen').value = 'abc';

    const antrag = fenster.leseAntrag('privat');
    expect(antrag.einkommen).toBe(0);
    expect(antrag.vermoegen).toBe(0);
  });

  it('gibt keine unendlichen Werte an die Berechnung weiter', () => {
    feld('kreditbetrag').value = '1e999';
    expect(fenster.leseAntrag('privat').kreditbetrag).toBe(0);
  });

  it('behält eine eingegebene 0 als 0 und negative Werte als negativ', () => {
    feld('bestehendeKredite').value = '0';
    feld('wohnkosten').value = '-50';

    const antrag = fenster.leseAntrag('privat');
    expect(antrag.bestehendeKredite).toBe(0);
    /* Negative Eingaben blockiert die HTML5-Validierung beim Absenden,
       leseAntrag selbst verfälscht sie nicht. */
    expect(antrag.wohnkosten).toBe(-50);
  });
});

describe('Formular absenden', () => {
  it('führt die Prüfung durch und zeigt das Resultat', () => {
    fenster.zeigeAntragsformular('privat');
    loeseAus(feld('form-antrag'), 'submit');

    expect(sichtbareViews()).toEqual(['view-resultat']);
    expect(feld('empfehlung').textContent).toBe('Empfehlung: Kredit vergeben');
  });

  it('nutzt den zuvor gewählten Antragstyp', () => {
    fenster.zeigeAntragsformular('unternehmen');
    feld('einkommen').value = '40000';
    loeseAus(feld('form-antrag'), 'submit');

    /* Unternehmen unter dem Mindestgewinn von 50000 werden abgelehnt. */
    expect(feld('empfehlung').textContent).toBe('Empfehlung: Kredit nicht vergeben');
    expect(feld('begruendung').textContent).toContain('Mindestgewinn');
  });
});

describe('zeigeResultat - Empfehlung', () => {
  it('zeigt eine positive Empfehlung samt Monatsrate', () => {
    fenster.zeigeResultat(privatErgebnis());

    expect(feld('empfehlung').textContent).toBe('Empfehlung: Kredit vergeben');
    expect(feld('empfehlung').className).toBe('empfehlung ja');
    expect(feld('rate-text').textContent).toContain('Monatliche Rate: CHF');
    expect(sichtbareViews()).toEqual(['view-resultat']);
  });

  it('zeigt eine negative Empfehlung ohne Monatsrate', () => {
    fenster.zeigeResultat(privatErgebnis({ kreditbetrag: 900000 }));

    expect(feld('empfehlung').textContent).toBe('Empfehlung: Kredit nicht vergeben');
    expect(feld('empfehlung').className).toBe('empfehlung nein');
    expect(feld('rate-text').textContent).toContain('keine Monatsrate');
  });
});

describe('zeigeResultat - Begründung', () => {
  it('listet jede Begründung als eigenen Eintrag', () => {
    const ergebnis = privatErgebnis();
    fenster.zeigeResultat(ergebnis);

    const eintraege = feld('begruendung').querySelectorAll('li');
    expect(eintraege).toHaveLength(ergebnis.begruendung.length);
    expect([...eintraege].map(li => li.textContent)).toEqual(ergebnis.begruendung);
  });

  it('markiert erfüllte Begründungen grün und verletzte rot', () => {
    fenster.zeigeResultat(privatErgebnis({ kreditbetrag: 900000 }));

    const klassen = [...feld('begruendung').querySelectorAll('li')].map(li => li.className);
    expect(klassen.filter(k => k === 'nein')).toHaveLength(4);
    expect(klassen.filter(k => k === 'ja')).toHaveLength(1);
  });

  it('ersetzt bei einer erneuten Prüfung die alte Begründung', () => {
    fenster.zeigeResultat(privatErgebnis());
    fenster.zeigeResultat(privatErgebnis());

    expect(feld('begruendung').querySelectorAll('li')).toHaveLength(5);
  });

  it('markiert eine Regel fälschlich als verletzt, wenn ihre Bezeichnung "nicht erfüllt" enthält', () => {
    /* Dokumentiertes Ist-Verhalten: ui.js klassifiziert über Textsuche
       (js/ui.js:62) statt über ein Flag im Prüfergebnis. */
    const regel = new fenster.Regel(
      'Grenzwert nicht erfüllt?', 'tragbarkeitsquote', '<=', 0.35, 'beide'
    );
    const ergebnis = fenster.pruefeKredit(erstelleAntrag(fenster), [regel]);

    expect(ergebnis.empfohlen).toBe(true);
    fenster.zeigeResultat(ergebnis);
    expect(feld('begruendung').querySelector('li').className).toBe('nein');
  });
});

describe('zeigeResultat - Kennzahlentabelle', () => {
  it('zeigt für Privatpersonen alle acht Kennzahlen', () => {
    fenster.zeigeResultat(privatErgebnis());

    const zeilen = dokument.querySelectorAll('#kennzahlen-tabelle tbody tr');
    expect(zeilen).toHaveLength(8);
    expect(dokument.querySelector('#kennzahlen-tabelle tbody').textContent).toContain('Alter bei Kreditende');
  });

  it('überspringt für Unternehmen die leere Kennzahl "Alter bei Kreditende"', () => {
    fenster.zeigeResultat(unternehmensErgebnis());

    const tbody = dokument.querySelector('#kennzahlen-tabelle tbody');
    expect(tbody.querySelectorAll('tr')).toHaveLength(7);
    expect(tbody.textContent).not.toContain('Alter bei Kreditende');
  });

  it('stellt Bezeichnung und formatierten Wert dar', () => {
    const ergebnis = privatErgebnis();
    fenster.zeigeResultat(ergebnis);

    const ersteZeile = dokument.querySelectorAll('#kennzahlen-tabelle tbody tr')[0];
    expect(ersteZeile.children[0].textContent).toBe('Monatsrate neuer Kredit');
    expect(ersteZeile.children[1].textContent)
      .toBe(fenster.formatiereWert('monatsrate', ergebnis.kennzahlen.monatsrate));
  });

  it('ersetzt bei einer erneuten Prüfung die alte Tabelle', () => {
    fenster.zeigeResultat(privatErgebnis());
    fenster.zeigeResultat(unternehmensErgebnis());

    expect(dokument.querySelectorAll('#kennzahlen-tabelle tbody tr')).toHaveLength(7);
  });
});

describe('zeigeBerechnungsschritte', () => {
  it('listet alle Berechnungsschritte in der Reihenfolge des Ergebnisses', () => {
    const ergebnis = privatErgebnis();
    fenster.zeigeBerechnungsschritte(ergebnis);

    const eintraege = [...feld('schritte').querySelectorAll('li')].map(li => li.textContent);
    expect(eintraege).toEqual(ergebnis.schritte);
    expect(eintraege).toHaveLength(11);
  });

  it('wird von zeigeResultat mitaufgerufen', () => {
    fenster.zeigeResultat(privatErgebnis());
    expect(feld('schritte').querySelectorAll('li')).toHaveLength(11);
  });

  it('ersetzt die Schritte bei einem erneuten Aufruf', () => {
    fenster.zeigeBerechnungsschritte(privatErgebnis());
    fenster.zeigeBerechnungsschritte(unternehmensErgebnis());

    expect(feld('schritte').querySelectorAll('li')).toHaveLength(10);
  });
});

describe('bearbeiteRegeln', () => {
  const zeilen = () => dokument.querySelectorAll('#regel-tabelle tbody tr');

  it('rendert pro Regel eine Zeile mit sechs Zellen', () => {
    fenster.bearbeiteRegeln(fenster.regeln);

    expect(zeilen()).toHaveLength(6);
    expect(zeilen()[0].children).toHaveLength(6);
  });

  it('stellt die Werte der Regel in den Eingabefeldern dar', () => {
    const regeln = [new fenster.Regel('Testregel', 'eigenmittelquote', '>=', 0.2, 'privat')];
    fenster.bearbeiteRegeln(regeln);

    const zellen = zeilen()[0].children;
    expect(zellen[0].querySelector('input').value).toBe('Testregel');
    expect(zellen[1].querySelector('select').value).toBe('eigenmittelquote');
    expect(zellen[2].querySelector('select').value).toBe('>=');
    expect(zellen[3].querySelector('input').value).toBe('0.2');
    expect(zellen[4].querySelector('select').value).toBe('privat');
  });

  it('bietet alle bekannten Kennzahlen zur Auswahl an', () => {
    fenster.bearbeiteRegeln([new fenster.Regel('X', 'einkommen', '>=', 1, 'beide')]);

    const optionen = [...zeilen()[0].children[1].querySelectorAll('option')].map(o => o.value);
    expect(optionen).toEqual(Object.keys(fenster.KENNZAHLEN));
  });

  it('schreibt Änderungen in das Regel-Objekt zurück', () => {
    const regel = new fenster.Regel('Alt', 'einkommen', '>=', 1, 'beide');
    fenster.bearbeiteRegeln([regel]);
    const zellen = zeilen()[0].children;

    zellen[0].querySelector('input').value = 'Neu';
    loeseAus(zellen[0].querySelector('input'), 'change');
    zellen[1].querySelector('select').value = 'tragbarkeitsquote';
    loeseAus(zellen[1].querySelector('select'), 'change');
    zellen[2].querySelector('select').value = '<=';
    loeseAus(zellen[2].querySelector('select'), 'change');
    zellen[3].querySelector('input').value = '0.4';
    loeseAus(zellen[3].querySelector('input'), 'change');
    zellen[4].querySelector('select').value = 'unternehmen';
    loeseAus(zellen[4].querySelector('select'), 'change');

    expect(regel).toEqual(
      new fenster.Regel('Neu', 'tragbarkeitsquote', '<=', 0.4, 'unternehmen')
    );
  });

  it('wertet einen leeren Grenzwert als 0', () => {
    const regel = new fenster.Regel('X', 'einkommen', '>=', 50000, 'beide');
    fenster.bearbeiteRegeln([regel]);

    const eingabe = zeilen()[0].children[3].querySelector('input');
    eingabe.value = '';
    loeseAus(eingabe, 'change');

    expect(regel.grenzwert).toBe(0);
  });

  it('entfernt mit dem Löschen-Button genau die gewählte Regel', () => {
    const regeln = fenster.standardRegeln();
    fenster.bearbeiteRegeln(regeln);

    zeilen()[1].querySelector('button').click();

    expect(regeln).toHaveLength(5);
    expect(regeln.map(r => r.kennzahl)).not.toContain('verschuldungsquote');
    expect(zeilen()).toHaveLength(5);
  });

  it('löscht auch nach mehrfachem Löschen die richtige Regel', () => {
    const regeln = fenster.standardRegeln();
    fenster.bearbeiteRegeln(regeln);

    zeilen()[0].querySelector('button').click();
    zeilen()[0].querySelector('button').click();

    expect(regeln.map(r => r.kennzahl)).toEqual([
      'eigenmittelquote', 'freiesEinkommen', 'alterBeiKreditende', 'einkommen'
    ]);
  });

  it('zeigt bei leerem Regelwerk eine leere Tabelle', () => {
    fenster.bearbeiteRegeln([]);
    expect(zeilen()).toHaveLength(0);
  });
});

describe('Regelwerk-Ansicht', () => {
  const zeilen = () => dokument.querySelectorAll('#regel-tabelle tbody tr');

  it('öffnet die Regelansicht über die Navigation', () => {
    feld('nav-regeln').click();

    expect(sichtbareViews()).toEqual(['view-regeln']);
    expect(zeilen()).toHaveLength(6);
  });

  it('fügt über "Regel hinzufügen" eine neue Regel hinzu', () => {
    feld('nav-regeln').click();
    feld('btn-regel-neu').click();

    expect(fenster.regeln).toHaveLength(7);
    expect(zeilen()).toHaveLength(7);
    expect(fenster.regeln.at(-1).bezeichnung).toBe('Neue Regel');
  });

  it('speichert die Regeln im localStorage', () => {
    feld('nav-regeln').click();
    fenster.regeln[0].grenzwert = 0.2;
    feld('btn-regel-speichern').click();

    const gespeichert = JSON.parse(fenster.localStorage.getItem(fenster.REGEL_SCHLUESSEL));
    expect(gespeichert).toHaveLength(6);
    expect(gespeichert[0].grenzwert).toBe(0.2);
    expect(feld('regel-status').textContent).toBe('Regeln gespeichert.');
  });

  it('stellt mit "Standardregeln laden" das Standardregelwerk wieder her', () => {
    feld('nav-regeln').click();
    feld('btn-regel-neu').click();
    expect(fenster.regeln).toHaveLength(7);

    feld('btn-regel-standard').click();

    expect(fenster.regeln).toEqual(fenster.standardRegeln());
    expect(zeilen()).toHaveLength(6);
    expect(JSON.parse(fenster.localStorage.getItem(fenster.REGEL_SCHLUESSEL))).toHaveLength(6);
    expect(feld('regel-status').textContent).toBe('Standardregeln geladen.');
  });

  it('wendet geänderte Regeln auf die nächste Prüfung an', () => {
    feld('nav-regeln').click();
    fenster.regeln[0].grenzwert = 0.2;   // Belastungsquote des Referenzantrags liegt bei 0.305

    fenster.zeigeAntragsformular('privat');
    loeseAus(feld('form-antrag'), 'submit');

    expect(feld('empfehlung').textContent).toBe('Empfehlung: Kredit nicht vergeben');
  });
});

describe('setzeStatus', () => {
  it('zeigt den Text an und löscht ihn nach 3 Sekunden', () => {
    /* Die jsdom-Zeitgeber laufen im Fenster, darum wird window.setTimeout
       direkt ersetzt statt mit vi.useFakeTimers() gearbeitet. */
    const geplant = [];
    fenster.setTimeout = (rueckruf, verzoegerung) => {
      geplant.push({ rueckruf, verzoegerung });
      return 0;
    };

    fenster.setzeStatus('Regeln gespeichert.');
    expect(feld('regel-status').textContent).toBe('Regeln gespeichert.');
    expect(geplant).toHaveLength(1);
    expect(geplant[0].verzoegerung).toBe(3000);

    geplant[0].rueckruf();
    expect(feld('regel-status').textContent).toBe('');
  });
});

describe('Navigation zwischen den Ansichten', () => {
  it('führt von der Antragsansicht zurück zur Typ-Auswahl', () => {
    fenster.zeigeAntragsformular('privat');
    feld('btn-zurueck-typ').click();
    expect(sichtbareViews()).toEqual(['view-typ']);
  });

  it('führt vom Resultat zurück zum Formular', () => {
    fenster.zeigeResultat(privatErgebnis());
    feld('btn-zurueck-antrag').click();
    expect(sichtbareViews()).toEqual(['view-antrag']);
  });

  it('startet mit "Neue Prüfung" wieder bei der Typ-Auswahl', () => {
    fenster.zeigeResultat(privatErgebnis());
    feld('btn-neu').click();
    expect(sichtbareViews()).toEqual(['view-typ']);
  });

  it('führt über die Navigation zurück zur Kreditprüfung', () => {
    feld('nav-regeln').click();
    feld('nav-pruefung').click();
    expect(sichtbareViews()).toEqual(['view-typ']);
  });
});

describe('zeigeVerlauf', () => {
  const diagramme = () => [
    feld('diagramm-restschuld').querySelector('svg'),
    feld('diagramm-zinsen').querySelector('svg')
  ];

  it('zeichnet beide Diagramme zum Tilgungsplan', () => {
    fenster.zeigeVerlauf(privatErgebnis());

    diagramme().forEach(svg => expect(svg).not.toBeNull());
    expect(feld('diagramm-restschuld').querySelector('title').textContent)
      .toContain('Restschuld');
    expect(feld('diagramm-zinsen').querySelector('title').textContent)
      .toContain('Zinsanteil');
  });

  it('nennt im Hinweis die gesamten Zinszahlungen', () => {
    const ergebnis = privatErgebnis();
    fenster.zeigeVerlauf(ergebnis);

    const erwartet = fenster.formatiereWert(
      'kreditbetrag', fenster.gesamtzinsen(ergebnis.tilgungsplan)
    );
    expect(feld('verlauf-hinweis').textContent)
      .toBe('Gesamte Zinszahlungen über die Laufzeit: ' + erwartet);
  });

  it('kennzeichnet den Verlauf als hypothetisch, wenn der Kredit nicht empfohlen wird', () => {
    fenster.zeigeVerlauf(privatErgebnis({ kreditbetrag: 900000 }));

    expect(feld('verlauf-hinweis').textContent).toContain('hypothetischer Verlauf');
    diagramme().forEach(svg => expect(svg).not.toBeNull());
  });

  it('meldet einen fehlenden Verlauf und leert die Diagramme', () => {
    /* Ohne Kreditbetrag entsteht kein Tilgungsplan. */
    fenster.zeigeVerlauf(privatErgebnis());
    fenster.zeigeVerlauf(privatErgebnis({ kreditbetrag: 0 }));

    expect(feld('verlauf-hinweis').textContent).toContain('kein Verlauf');
    diagramme().forEach(svg => expect(svg).toBeNull());
  });

  it('verträgt ein Ergebnis ohne Tilgungsplan', () => {
    const ohnePlan = new fenster.Pruefergebnis(true, {}, [], [], 100, undefined);
    expect(() => fenster.zeigeVerlauf(ohnePlan)).not.toThrow();
    expect(feld('verlauf-hinweis').textContent).toContain('kein Verlauf');
  });

  it('beschriftet die x-Achse ab zwei Jahren Laufzeit in Jahren', () => {
    fenster.zeigeVerlauf(privatErgebnis({ laufzeitMonate: 120 }));
    const texte = [...feld('diagramm-restschuld').querySelectorAll('text')]
      .map(element => element.textContent);
    expect(texte).toContain('Jahre');
    expect(texte).not.toContain('Monate');
  });

  it('beschriftet die x-Achse unter zwei Jahren Laufzeit in Monaten', () => {
    fenster.zeigeVerlauf(privatErgebnis({ laufzeitMonate: 12, kreditbetrag: 10000 }));
    const texte = [...feld('diagramm-restschuld').querySelectorAll('text')]
      .map(element => element.textContent);
    expect(texte).toContain('Monate');
    expect(texte).not.toContain('Jahre');
  });

  it('ersetzt bei einer erneuten Prüfung die alten Diagramme', () => {
    fenster.zeigeVerlauf(privatErgebnis());
    fenster.zeigeVerlauf(privatErgebnis());

    expect(feld('diagramm-restschuld').children).toHaveLength(1);
    expect(feld('diagramm-zinsen').children).toHaveLength(1);
  });

  it('wird von zeigeResultat mitaufgerufen', () => {
    fenster.zeigeResultat(privatErgebnis());

    diagramme().forEach(svg => expect(svg).not.toBeNull());
    expect(feld('verlauf-hinweis').textContent).toContain('Zinszahlungen');
  });
});

describe('laufzeitSchritt', () => {
  it('beschriftet kurze Laufzeiten in Monatsschritten', () => {
    expect(fenster.laufzeitSchritt(6)).toBe(1);
    expect(fenster.laufzeitSchritt(12)).toBe(2);
    expect(fenster.laufzeitSchritt(18)).toBe(3);
  });

  it('beschriftet ab zwei Jahren in ganzen Jahren', () => {
    expect(fenster.laufzeitSchritt(24) % 12).toBe(0);
    expect(fenster.laufzeitSchritt(120) % 12).toBe(0);
    expect(fenster.laufzeitSchritt(240) % 12).toBe(0);
  });

  it('hält die Anzahl der Beschriftungen in einem lesbaren Rahmen', () => {
    [1, 6, 12, 24, 60, 120, 240, 480].forEach(monate => {
      const schritt = fenster.laufzeitSchritt(monate);
      expect(schritt, 'Laufzeit ' + monate).toBeGreaterThanOrEqual(1);
      expect(monate / schritt, 'Laufzeit ' + monate).toBeLessThanOrEqual(12);
    });
  });
});
