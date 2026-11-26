/* Klassendiagramm: tilgungsplan.js - tilgungsplan(betrag, zins, monate) : Tilgungszeile[]
   und gesamtzinsen(plan) : number, sowie «class» Tilgungszeile. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { starteApp } from '../hilfen/app.js';

let fenster;
let schliesse;

beforeAll(() => { ({ fenster, schliesse } = starteApp()); });
afterAll(() => schliesse());

/** Referenzkredit: 150000 CHF, 3 %, 120 Monate -> Annuität 1448.4112 CHF. */
const referenzplan = () => fenster.tilgungsplan(150000, 3, 120);

describe('Tilgungszeile', () => {
  it('übernimmt alle fünf Konstruktorargumente in der Reihenfolge des Klassendiagramms', () => {
    const zeile = new fenster.Tilgungszeile(7, 1448.41, 300.12, 1148.29, 138000.55);

    expect(zeile.monat).toBe(7);
    expect(zeile.rate).toBe(1448.41);
    expect(zeile.zins).toBe(300.12);
    expect(zeile.tilgung).toBe(1148.29);
    expect(zeile.restschuld).toBe(138000.55);
  });

  it('besitzt genau die im Klassendiagramm beschriebenen Felder', () => {
    const zeile = new fenster.Tilgungszeile(1, 2, 3, 4, 5);
    expect(Object.keys(zeile)).toEqual(['monat', 'rate', 'zins', 'tilgung', 'restschuld']);
  });
});

describe('tilgungsplan - Aufbau', () => {
  it('erzeugt eine Zeile pro Monat der Laufzeit', () => {
    const plan = referenzplan();

    expect(plan).toHaveLength(120);
    expect(plan.map(zeile => zeile.monat)).toEqual(
      Array.from({ length: 120 }, (_wert, index) => index + 1)
    );
  });

  it('liefert echte Tilgungszeile-Instanzen', () => {
    referenzplan().forEach(zeile => expect(zeile).toBeInstanceOf(fenster.Tilgungszeile));
  });

  it('rundet die Laufzeit auf ganze Monate', () => {
    expect(fenster.tilgungsplan(10000, 3, 12.4)).toHaveLength(12);
    expect(fenster.tilgungsplan(10000, 3, 12.6)).toHaveLength(13);
  });
});

describe('tilgungsplan - Rechenlogik', () => {
  it('verzinst im ersten Monat die volle Kreditsumme', () => {
    const erste = referenzplan()[0];

    expect(erste.zins).toBeCloseTo(150000 * 0.03 / 12, 8);
    expect(erste.zins).toBeCloseTo(375, 8);
    expect(erste.rate).toBeCloseTo(fenster.monatsrate(150000, 3, 120), 8);
    expect(erste.tilgung).toBeCloseTo(erste.rate - erste.zins, 8);
    expect(erste.restschuld).toBeCloseTo(150000 - erste.tilgung, 8);
  });

  it('setzt jede Rate aus Zins- und Tilgungsanteil zusammen', () => {
    referenzplan().forEach((zeile, index) => {
      expect(zeile.rate, 'Monat ' + (index + 1)).toBeCloseTo(zeile.zins + zeile.tilgung, 8);
    });
  });

  it('verzinst jeden Monat die Restschuld des Vormonats', () => {
    const plan = referenzplan();
    const zinsSatzMonat = 3 / 100 / 12;

    for (let index = 1; index < plan.length; index++) {
      expect(plan[index].zins, 'Monat ' + (index + 1))
        .toBeCloseTo(plan[index - 1].restschuld * zinsSatzMonat, 8);
    }
  });

  it('führt die Restschuld streng fallend auf genau 0', () => {
    const plan = referenzplan();

    for (let index = 1; index < plan.length; index++) {
      expect(plan[index].restschuld).toBeLessThan(plan[index - 1].restschuld);
    }
    expect(plan.at(-1).restschuld).toBe(0);
  });

  it('tilgt in der Summe genau den Kreditbetrag', () => {
    const getilgt = referenzplan().reduce((summe, zeile) => summe + zeile.tilgung, 0);
    expect(getilgt).toBeCloseTo(150000, 6);
  });

  it('verschiebt den Anteil über die Laufzeit von Zins zu Tilgung', () => {
    const plan = referenzplan();

    expect(plan[0].zins).toBeGreaterThan(plan.at(-1).zins);
    expect(plan[0].tilgung).toBeLessThan(plan.at(-1).tilgung);
    /* Der Zinsanteil fällt monoton, weil die Restschuld monoton fällt. */
    for (let index = 1; index < plan.length; index++) {
      expect(plan[index].zins).toBeLessThan(plan[index - 1].zins);
    }
  });

  it('hält die Rate bis auf die letzte Zeile konstant', () => {
    const plan = referenzplan();
    const rate = plan[0].rate;

    plan.slice(0, -1).forEach((zeile, index) => {
      expect(zeile.rate, 'Monat ' + (index + 1)).toBeCloseTo(rate, 6);
    });
    /* Die letzte Rate darf wegen der Rundung geringfügig abweichen. */
    expect(plan.at(-1).rate).toBeCloseTo(rate, 2);
  });
});

describe('tilgungsplan - zinsloser Kredit', () => {
  it('tilgt bei Zinssatz 0 gleichmässig und ohne Zinsen', () => {
    const plan = fenster.tilgungsplan(12000, 0, 12);

    expect(plan).toHaveLength(12);
    plan.forEach(zeile => {
      expect(zeile.zins).toBe(0);
      expect(zeile.tilgung).toBeCloseTo(1000, 8);
      expect(zeile.rate).toBeCloseTo(1000, 8);
    });
    expect(plan.at(-1).restschuld).toBe(0);
  });
});

describe('tilgungsplan - Sonderfälle', () => {
  it('liefert einen leeren Plan bei Laufzeit 0 oder negativ', () => {
    expect(fenster.tilgungsplan(150000, 3, 0)).toEqual([]);
    expect(fenster.tilgungsplan(150000, 3, -12)).toEqual([]);
  });

  it('liefert einen leeren Plan ohne Kreditbetrag', () => {
    expect(fenster.tilgungsplan(0, 3, 120)).toEqual([]);
    expect(fenster.tilgungsplan(-5000, 3, 120)).toEqual([]);
  });

  it('kommt mit einer Laufzeit von einem Monat aus', () => {
    const plan = fenster.tilgungsplan(10000, 3, 1);

    expect(plan).toHaveLength(1);
    expect(plan[0].tilgung).toBeCloseTo(10000, 8);
    expect(plan[0].restschuld).toBe(0);
    expect(plan[0].zins).toBeCloseTo(25, 8);
  });
});

describe('gesamtzinsen', () => {
  it('summiert die Zinsanteile des gesamten Plans', () => {
    const plan = referenzplan();
    const erwartet = plan.reduce((summe, zeile) => summe + zeile.zins, 0);

    expect(fenster.gesamtzinsen(plan)).toBeCloseTo(erwartet, 8);
  });

  it('entspricht der Summe aller Raten minus dem Kreditbetrag', () => {
    const plan = referenzplan();
    const gezahlt = plan.reduce((summe, zeile) => summe + zeile.rate, 0);

    expect(fenster.gesamtzinsen(plan)).toBeCloseTo(gezahlt - 150000, 6);
  });

  it('liefert 0 für einen zinslosen Kredit und für einen leeren Plan', () => {
    expect(fenster.gesamtzinsen(fenster.tilgungsplan(12000, 0, 12))).toBe(0);
    expect(fenster.gesamtzinsen([])).toBe(0);
  });

  it('steigt mit längerer Laufzeit und höherem Zinssatz', () => {
    const zinsen = (zins, monate) => fenster.gesamtzinsen(fenster.tilgungsplan(150000, zins, monate));

    expect(zinsen(3, 240)).toBeGreaterThan(zinsen(3, 120));
    expect(zinsen(5, 120)).toBeGreaterThan(zinsen(3, 120));
  });
});

describe('Einbindung in pruefeKredit', () => {
  const antrag = (abweichungen = {}) => new fenster.Kreditantrag(
    'privat', 120000, 60000, 1600, 0, 150000, 120, 3, 40
  );

  it('legt den Tilgungsplan in das Prüfergebnis', () => {
    const ergebnis = fenster.pruefeKredit(antrag(), fenster.standardRegeln());

    expect(ergebnis.tilgungsplan).toHaveLength(120);
    expect(ergebnis.tilgungsplan[0]).toBeInstanceOf(fenster.Tilgungszeile);
  });

  it('weist den Tilgungsplan auch bei einer Ablehnung aus', () => {
    const abgelehnt = new fenster.Kreditantrag('privat', 120000, 60000, 1600, 0, 900000, 120, 3, 40);
    const ergebnis = fenster.pruefeKredit(abgelehnt, fenster.standardRegeln());

    expect(ergebnis.empfohlen).toBe(false);
    expect(ergebnis.monatsrate).toBeNull();
    /* Der Verlauf bleibt als hypothetische Information erhalten. */
    expect(ergebnis.tilgungsplan).toHaveLength(120);
  });

  it('nennt die Gesamtzinsen in den Berechnungsschritten', () => {
    const ergebnis = fenster.pruefeKredit(antrag(), fenster.standardRegeln());
    const gesamt = fenster.gesamtzinsen(ergebnis.tilgungsplan);

    expect(ergebnis.schritte[2]).toContain('Zinszahlungen');
    expect(ergebnis.schritte[2]).toContain(fenster.formatiereWert('kreditbetrag', gesamt));
  });
});
