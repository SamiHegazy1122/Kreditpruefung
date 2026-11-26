/* Klassendiagramm: regelwerk.js - ladeRegeln() / speichereRegeln(regeln) / standardRegeln()
   sowie die Diagramm-Kante "liest/schreibt" nach localStorage. */
import { describe, it, expect, afterEach } from 'vitest';
import { starteApp, SPEICHER_SCHLUESSEL } from '../hilfen/app.js';

let offen = [];

function app(optionen) {
  const instanz = starteApp(optionen);
  offen.push(instanz.schliesse);
  return instanz.fenster;
}

afterEach(() => {
  offen.forEach(schliesse => schliesse());
  offen = [];
});

describe('standardRegeln', () => {
  it('liefert die sechs Standardregeln der Bank', () => {
    const regeln = app().standardRegeln();

    expect(regeln).toHaveLength(6);
    expect(regeln.map(r => [r.kennzahl, r.operator, r.grenzwert, r.giltFuer])).toEqual([
      ['tragbarkeitsquote', '<=', 0.35, 'beide'],
      ['verschuldungsquote', '<=', 5, 'beide'],
      ['eigenmittelquote', '>=', 0.1, 'beide'],
      ['freiesEinkommen', '>=', 500, 'privat'],
      ['alterBeiKreditende', '<=', 70, 'privat'],
      ['einkommen', '>=', 50000, 'unternehmen']
    ]);
  });

  it('liefert echte Regel-Instanzen mit nicht leerer Bezeichnung', () => {
    const fenster = app();
    fenster.standardRegeln().forEach(regel => {
      expect(regel).toBeInstanceOf(fenster.Regel);
      expect(regel.bezeichnung.length).toBeGreaterThan(0);
    });
  });

  it('gibt bei jedem Aufruf neue Objekte zurück (kein geteilter Zustand)', () => {
    const fenster = app();
    const ersteListe = fenster.standardRegeln();
    ersteListe[0].grenzwert = 0.99;

    const zweiteListe = fenster.standardRegeln();
    expect(zweiteListe[0].grenzwert).toBe(0.35);
    expect(zweiteListe[0]).not.toBe(ersteListe[0]);
  });

  it('verwendet nur die Operatoren <= und >= sowie gültige giltFuer-Werte', () => {
    app().standardRegeln().forEach(regel => {
      expect(['<=', '>=']).toContain(regel.operator);
      expect(['beide', 'privat', 'unternehmen']).toContain(regel.giltFuer);
    });
  });
});

describe('ladeRegeln', () => {
  it('liefert die Standardregeln, wenn im localStorage nichts gespeichert ist', () => {
    const fenster = app();
    expect(fenster.localStorage.getItem(SPEICHER_SCHLUESSEL)).toBeNull();
    expect(fenster.ladeRegeln()).toEqual(fenster.standardRegeln());
  });

  it('liest gespeicherte Regeln aus dem localStorage', () => {
    const fenster = app({
      regeln: [{ bezeichnung: 'Eigene Regel', kennzahl: 'eigenmittelquote', operator: '>=', grenzwert: 0.25, giltFuer: 'beide' }]
    });

    const regeln = fenster.ladeRegeln();
    expect(regeln).toHaveLength(1);
    expect(regeln[0].bezeichnung).toBe('Eigene Regel');
    expect(regeln[0].grenzwert).toBe(0.25);
  });

  it('rehydriert die gespeicherten Daten zu echten Regel-Instanzen', () => {
    const fenster = app({
      regeln: [{ bezeichnung: 'A', kennzahl: 'tragbarkeitsquote', operator: '<=', grenzwert: 0.3, giltFuer: 'beide' }]
    });
    expect(fenster.ladeRegeln()[0]).toBeInstanceOf(fenster.Regel);
  });

  it('ignoriert unbekannte Zusatzfelder im gespeicherten JSON', () => {
    const fenster = app({
      regeln: [{ bezeichnung: 'A', kennzahl: 'tragbarkeitsquote', operator: '<=', grenzwert: 0.3, giltFuer: 'beide', unbekannt: 'x' }]
    });
    expect(Object.keys(fenster.ladeRegeln()[0])).toEqual(
      ['bezeichnung', 'kennzahl', 'operator', 'grenzwert', 'giltFuer']
    );
  });

  it('fällt bei kaputtem JSON auf die Standardregeln zurück, ohne zu werfen', () => {
    const fenster = app({ roherSpeicher: '{kein gueltiges json' });
    expect(() => fenster.ladeRegeln()).not.toThrow();
    expect(fenster.ladeRegeln()).toEqual(fenster.standardRegeln());
  });

  it('fällt zurück, wenn das gespeicherte JSON kein Array ist', () => {
    for (const inhalt of ['{}', 'null', '42', '"text"']) {
      const fenster = app({ roherSpeicher: inhalt });
      expect(fenster.ladeRegeln(), `Speicherinhalt ${inhalt}`).toEqual(fenster.standardRegeln());
    }
  });

  it('liefert eine leere Liste, wenn ein leeres Array gespeichert ist', () => {
    const fenster = app({ regeln: [] });
    /* Ein leerer String ist falsy, ein "[]" aber nicht - die leere Regelliste
       muss erhalten bleiben und darf nicht als "nichts gespeichert" gelten. */
    expect(fenster.ladeRegeln()).toEqual([]);
  });
});

describe('speichereRegeln', () => {
  it('schreibt die Regeln unter dem Schlüssel kreditpruefung.regeln in den localStorage', () => {
    const fenster = app();
    fenster.speichereRegeln([new fenster.Regel('X', 'einkommen', '>=', 1000, 'beide')]);

    const roh = fenster.localStorage.getItem(SPEICHER_SCHLUESSEL);
    expect(roh).not.toBeNull();
    expect(JSON.parse(roh)).toEqual([
      { bezeichnung: 'X', kennzahl: 'einkommen', operator: '>=', grenzwert: 1000, giltFuer: 'beide' }
    ]);
  });

  it('ist mit ladeRegeln verlustfrei (Round-Trip)', () => {
    const fenster = app();
    const original = fenster.standardRegeln();
    original[0].grenzwert = 0.28;

    fenster.speichereRegeln(original);
    const geladen = fenster.ladeRegeln();

    expect(geladen).toEqual(original);
    expect(geladen[0].grenzwert).toBe(0.28);
  });

  it('überschreibt vorher gespeicherte Regeln', () => {
    const fenster = app({ regeln: [{ bezeichnung: 'Alt', kennzahl: 'einkommen', operator: '>=', grenzwert: 1, giltFuer: 'beide' }] });
    fenster.speichereRegeln([new fenster.Regel('Neu', 'einkommen', '>=', 2, 'beide')]);

    const geladen = fenster.ladeRegeln();
    expect(geladen).toHaveLength(1);
    expect(geladen[0].bezeichnung).toBe('Neu');
  });
});
