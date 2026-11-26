/* Klassendiagramm: «class» Kreditantrag, «class» Pruefergebnis, «class» Regel (js/modelle.js) */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { starteApp, REFERENZ_ANTRAG } from '../hilfen/app.js';

let fenster;
let schliesse;

beforeAll(() => { ({ fenster, schliesse } = starteApp()); });
afterAll(() => schliesse());

describe('Kreditantrag', () => {
  it('übernimmt alle neun Konstruktorargumente in der Reihenfolge des Klassendiagramms', () => {
    const antrag = new fenster.Kreditantrag(
      'privat', 120000, 60000, 1600, 5000, 150000, 120, 3, 40
    );

    expect(antrag.typ).toBe('privat');
    expect(antrag.einkommen).toBe(120000);
    expect(antrag.vermoegen).toBe(60000);
    expect(antrag.wohnkosten).toBe(1600);
    expect(antrag.bestehendeKredite).toBe(5000);
    expect(antrag.kreditbetrag).toBe(150000);
    expect(antrag.laufzeitMonate).toBe(120);
    expect(antrag.zinssatz).toBe(3);
    expect(antrag.alter).toBe(40);
  });

  it('besitzt genau die im Klassendiagramm beschriebenen Felder', () => {
    const antrag = new fenster.Kreditantrag('privat', 1, 2, 3, 4, 5, 6, 7, 8);
    expect(Object.keys(antrag)).toEqual(Object.keys(REFERENZ_ANTRAG));
  });

  it('akzeptiert für Unternehmen ein Alter von null', () => {
    const antrag = new fenster.Kreditantrag('unternehmen', 200000, 50000, 0, 0, 100000, 60, 3, null);
    expect(antrag.typ).toBe('unternehmen');
    expect(antrag.alter).toBeNull();
  });
});

describe('Pruefergebnis', () => {
  it('übernimmt alle fünf Konstruktorargumente', () => {
    const begruendung = [new fenster.Begruendung('Regel A -> erfüllt', true)];
    const ergebnis = new fenster.Pruefergebnis(
      true, { monatsrate: 100 }, begruendung, ['Schritt 1'], 100
    );

    expect(ergebnis.empfohlen).toBe(true);
    expect(ergebnis.kennzahlen).toEqual({ monatsrate: 100 });
    expect(ergebnis.begruendung).toEqual(begruendung);
    expect(ergebnis.schritte).toEqual(['Schritt 1']);
    expect(ergebnis.monatsrate).toBe(100);
  });

  it('lässt monatsrate null zu (Kredit nicht empfohlen)', () => {
    const ergebnis = new fenster.Pruefergebnis(false, {}, [], [], null);
    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.monatsrate).toBeNull();
  });
});

describe('Begruendung', () => {
  it('übernimmt Text und erfuellt-Flag', () => {
    const begruendung = new fenster.Begruendung('Tragbarkeit: 30.5 % <= 35.0 % -> erfüllt', true);

    expect(begruendung.text).toBe('Tragbarkeit: 30.5 % <= 35.0 % -> erfüllt');
    expect(begruendung.erfuellt).toBe(true);
  });

  it('besitzt genau die Felder text und erfuellt', () => {
    expect(Object.keys(new fenster.Begruendung('x', false))).toEqual(['text', 'erfuellt']);
  });
});

describe('Regel', () => {
  it('übernimmt alle fünf Konstruktorargumente in der Reihenfolge des Klassendiagramms', () => {
    const regel = new fenster.Regel('Tragbarkeit', 'tragbarkeitsquote', '<=', 0.35, 'beide');

    expect(regel.bezeichnung).toBe('Tragbarkeit');
    expect(regel.kennzahl).toBe('tragbarkeitsquote');
    expect(regel.operator).toBe('<=');
    expect(regel.grenzwert).toBe(0.35);
    expect(regel.giltFuer).toBe('beide');
  });

  it('serialisiert sich verlustfrei nach JSON (Grundlage der Persistenz)', () => {
    const regel = new fenster.Regel('Alter bei Kreditende', 'alterBeiKreditende', '<=', 70, 'privat');
    expect(JSON.parse(JSON.stringify(regel))).toEqual({
      bezeichnung: 'Alter bei Kreditende',
      kennzahl: 'alterBeiKreditende',
      operator: '<=',
      grenzwert: 70,
      giltFuer: 'privat'
    });
  });
});
