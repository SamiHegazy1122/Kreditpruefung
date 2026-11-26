/* Klassendiagramm: rate.js - monatsrate(betrag, zins, monate) : number */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { starteApp } from '../hilfen/app.js';

let monatsrate;
let schliesse;

beforeAll(() => {
  const app = starteApp();
  monatsrate = app.fenster.monatsrate;
  schliesse = app.schliesse;
});
afterAll(() => schliesse());

describe('monatsrate - Annuität', () => {
  it('berechnet die Annuität des Referenzkredits (150000 CHF, 3 %, 120 Monate)', () => {
    expect(monatsrate(150000, 3, 120)).toBeCloseTo(1448.4112, 4);
  });

  it('berechnet die Annuität für eine kürzere Laufzeit (20000 CHF, 3 %, 60 Monate)', () => {
    expect(monatsrate(20000, 3, 60)).toBeCloseTo(359.3738, 4);
  });

  it('entspricht der Annuitätenformel betrag * i / (1 - (1+i)^-n)', () => {
    const i = 4.5 / 100 / 12;
    const erwartet = 250000 * i / (1 - Math.pow(1 + i, -240));
    expect(monatsrate(250000, 4.5, 240)).toBeCloseTo(erwartet, 10);
  });
});

describe('monatsrate - Sonderfälle', () => {
  it('teilt bei Zinssatz 0 den Betrag gleichmässig auf die Laufzeit auf', () => {
    expect(monatsrate(12000, 0, 12)).toBe(1000);
    expect(monatsrate(90000, 0, 180)).toBe(500);
  });

  it('liefert 0, wenn die Laufzeit 0 oder negativ ist', () => {
    expect(monatsrate(150000, 3, 0)).toBe(0);
    expect(monatsrate(150000, 3, -12)).toBe(0);
    expect(monatsrate(150000, 0, 0)).toBe(0);
  });

  it('liefert 0 für einen Kreditbetrag von 0', () => {
    expect(monatsrate(0, 3, 120)).toBe(0);
    expect(monatsrate(0, 0, 120)).toBe(0);
  });
});

describe('monatsrate - fachliche Eigenschaften', () => {
  it('sinkt mit längerer Laufzeit', () => {
    const raten = [60, 120, 180, 240].map(monate => monatsrate(150000, 3, monate));
    for (let n = 1; n < raten.length; n++) {
      expect(raten[n]).toBeLessThan(raten[n - 1]);
    }
  });

  it('steigt mit höherem Zinssatz', () => {
    const raten = [0, 1, 3, 5, 8].map(zins => monatsrate(150000, zins, 120));
    for (let n = 1; n < raten.length; n++) {
      expect(raten[n]).toBeGreaterThan(raten[n - 1]);
    }
  });

  it('skaliert linear mit dem Kreditbetrag', () => {
    expect(monatsrate(300000, 3, 120)).toBeCloseTo(2 * monatsrate(150000, 3, 120), 8);
  });

  it('ergibt in der Summe mindestens den Kreditbetrag (Zinsen gehen nicht verloren)', () => {
    expect(monatsrate(150000, 3, 120) * 120).toBeGreaterThan(150000);
    expect(monatsrate(150000, 0, 120) * 120).toBeCloseTo(150000, 8);
  });
});
