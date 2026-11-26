/* Klassendiagramm: diagramm.js - zeichneDiagramm(optionen) : SVGElement
   und zeigeDiagramm(zielId, optionen) : void */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { starteApp } from '../hilfen/app.js';

let fenster;
let dokument;
let schliesse;

beforeEach(() => {
  ({ fenster, schliesse } = starteApp());
  dokument = fenster.document;
});

afterEach(() => schliesse());

/** Standardoptionen mit drei x-Werten und einer Linienreihe. */
const optionen = (abweichungen = {}) => ({
  titel: 'Testdiagramm',
  xWerte: [0, 1, 2],
  reihen: [{ name: 'Reihe A', werte: [10, 20, 30], art: 'linie' }],
  ...abweichungen
});

describe('zeichneDiagramm - Grundgerüst', () => {
  it('erzeugt ein SVG-Element im richtigen Namensraum', () => {
    const svg = fenster.zeichneDiagramm(optionen());

    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.tagName).toBe('svg');
  });

  it('skaliert über eine viewBox statt über feste Pixel', () => {
    const svg = fenster.zeichneDiagramm(optionen());

    expect(svg.getAttribute('viewBox')).toBe('0 0 ' + fenster.DIA_BREITE + ' ' + fenster.DIA_HOEHE);
    expect(svg.getAttribute('width')).toBe('100%');
  });

  it('hinterlegt den Titel für Screenreader und setzt role="img"', () => {
    const svg = fenster.zeichneDiagramm(optionen({ titel: 'Entwicklung der Restschuld' }));

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelector('title').textContent).toBe('Entwicklung der Restschuld');
  });

  it('verwendet einen Standardtitel, wenn keiner angegeben ist', () => {
    const svg = fenster.zeichneDiagramm({ xWerte: [0, 1], reihen: [] });
    expect(svg.querySelector('title').textContent).toBe('Diagramm');
  });

  it('liefert ohne x-Werte ein leeres Diagramm mit Titel', () => {
    const svg = fenster.zeichneDiagramm(optionen({ xWerte: [] }));

    expect(svg.querySelector('title')).not.toBeNull();
    expect(svg.querySelectorAll('polyline, polygon')).toHaveLength(0);
    expect(svg.querySelectorAll('line')).toHaveLength(0);
  });

  it('kommt ohne jede Angabe aus', () => {
    expect(() => fenster.zeichneDiagramm({})).not.toThrow();
  });
});

describe('zeichneDiagramm - Reihen', () => {
  it('zeichnet eine Linienreihe als polyline mit einem Punkt pro x-Wert', () => {
    const svg = fenster.zeichneDiagramm(optionen());
    const linie = svg.querySelector('polyline');

    expect(linie).not.toBeNull();
    expect(linie.getAttribute('points').trim().split(/\s+/)).toHaveLength(3);
    expect(linie.getAttribute('fill')).toBe('none');
  });

  it('zeichnet eine Flächenreihe als geschlossenes polygon', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      reihen: [{ name: 'Reihe A', werte: [10, 20, 30], art: 'flaeche' }]
    }));
    const flaeche = svg.querySelector('polygon');

    expect(flaeche).not.toBeNull();
    /* Oberkante vorwärts plus Unterkante rückwärts = doppelt so viele Punkte. */
    expect(flaeche.getAttribute('points').trim().split(/\s+/)).toHaveLength(6);
  });

  it('zeichnet mehrere Reihen und vergibt Standardfarben aus der Palette', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      reihen: [
        { name: 'Zinsanteil', werte: [5, 4, 3], art: 'flaeche' },
        { name: 'Tilgungsanteil', werte: [1, 2, 3], art: 'flaeche' }
      ]
    }));

    const flaechen = svg.querySelectorAll('polygon');
    expect(flaechen).toHaveLength(2);
    expect(flaechen[0].getAttribute('fill')).toBe(fenster.DIAGRAMM_FARBEN[0]);
    expect(flaechen[1].getAttribute('fill')).toBe(fenster.DIAGRAMM_FARBEN[1]);
  });

  it('übernimmt eine explizit angegebene Farbe', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      reihen: [{ name: 'Restschuld', werte: [1, 2, 3], art: 'linie', farbe: '#2c3e50' }]
    }));

    expect(svg.querySelector('polyline').getAttribute('stroke')).toBe('#2c3e50');
  });

  it('zeichnet für jede Reihe einen Legendeneintrag', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      reihen: [
        { name: 'Zinsanteil', werte: [5, 4, 3], art: 'flaeche' },
        { name: 'Tilgungsanteil', werte: [1, 2, 3], art: 'flaeche' }
      ]
    }));

    const texte = [...svg.querySelectorAll('text')].map(element => element.textContent);
    expect(texte).toContain('Zinsanteil');
    expect(texte).toContain('Tilgungsanteil');
    expect(svg.querySelectorAll('rect')).toHaveLength(2);
  });
});

describe('zeichneDiagramm - Stapelung', () => {
  /** y-Koordinaten der Oberkante einer Reihe, aus den points ausgelesen. */
  const obenWerte = (element) => element.getAttribute('points')
    .trim().split(/\s+/).slice(0, 3)
    .map(punkt => Number(punkt.split(',')[1]));

  it('stapelt Reihen bei gestapelt: true aufeinander', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      gestapelt: true,
      reihen: [
        { name: 'Unten', werte: [10, 10, 10], art: 'flaeche' },
        { name: 'Oben', werte: [10, 10, 10], art: 'flaeche' }
      ]
    }));

    const [unten, oben] = svg.querySelectorAll('polygon');
    /* Kleineres y bedeutet weiter oben: die zweite Reihe liegt über der ersten. */
    obenWerte(oben).forEach((y, index) => {
      expect(y).toBeLessThan(obenWerte(unten)[index]);
    });
  });

  it('zeichnet Reihen ohne gestapelt: true von der Grundlinie aus', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      reihen: [
        { name: 'A', werte: [10, 10, 10], art: 'flaeche' },
        { name: 'B', werte: [10, 10, 10], art: 'flaeche' }
      ]
    }));

    const [erste, zweite] = svg.querySelectorAll('polygon');
    expect(obenWerte(zweite)).toEqual(obenWerte(erste));
  });
});

describe('zeichneDiagramm - Achsen', () => {
  it('beschriftet die y-Achse mit der übergebenen Formatfunktion', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      formatY: wert => 'CHF ' + wert
    }));

    const texte = [...svg.querySelectorAll('text')].map(element => element.textContent);
    expect(texte.filter(text => text.startsWith('CHF ')).length).toBeGreaterThan(1);
  });

  it('beschriftet die x-Achse mit der übergebenen Formatfunktion', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      xWerte: [0, 12, 24], xSchritt: 12, formatX: wert => wert / 12 + ' J'
    }));

    const texte = [...svg.querySelectorAll('text')].map(element => element.textContent);
    expect(texte).toContain('0 J');
    expect(texte).toContain('1 J');
    expect(texte).toContain('2 J');
  });

  it('zeigt den Achsentitel an', () => {
    const svg = fenster.zeichneDiagramm(optionen({ xTitel: 'Monate' }));
    const texte = [...svg.querySelectorAll('text')].map(element => element.textContent);
    expect(texte).toContain('Monate');
  });

  it('zeichnet Gitterlinien und eine y-Achse', () => {
    const svg = fenster.zeichneDiagramm(optionen());
    expect(svg.querySelectorAll('line').length).toBeGreaterThan(2);
  });

  it('kommt mit einem einzigen x-Wert aus', () => {
    expect(() => fenster.zeichneDiagramm(optionen({
      xWerte: [5], reihen: [{ name: 'A', werte: [1], art: 'linie' }]
    }))).not.toThrow();
  });

  it('kommt mit durchgehend 0 als Werten aus', () => {
    const svg = fenster.zeichneDiagramm(optionen({
      reihen: [{ name: 'A', werte: [0, 0, 0], art: 'linie' }]
    }));
    expect(svg.querySelector('polyline')).not.toBeNull();
  });
});

describe('netteSchrittweite', () => {
  it('liefert runde Schrittweiten aus der Zehnerreihe', () => {
    expect(fenster.netteSchrittweite(100, 5)).toBe(20);
    expect(fenster.netteSchrittweite(1000, 5)).toBe(200);
    expect(fenster.netteSchrittweite(50, 5)).toBe(10);
  });

  it('liefert 1 für eine Spanne von 0 oder ungültige Angaben', () => {
    expect(fenster.netteSchrittweite(0, 5)).toBe(1);
    expect(fenster.netteSchrittweite(-10, 5)).toBe(1);
    expect(fenster.netteSchrittweite(NaN, 5)).toBe(1);
  });

  it('wächst mit der Spanne und deckt sie bei der gewünschten Anzahl Schritte ab', () => {
    [50, 100, 1000, 150000].forEach(spanne => {
      const schritt = fenster.netteSchrittweite(spanne, 5);
      expect(schritt * 5).toBeGreaterThanOrEqual(spanne);
      expect(schritt).toBeGreaterThan(0);
    });
  });
});

describe('zeigeDiagramm', () => {
  it('zeichnet das Diagramm in das angegebene Ziel-Element', () => {
    fenster.zeigeDiagramm('diagramm-restschuld', optionen());

    const ziel = dokument.getElementById('diagramm-restschuld');
    expect(ziel.children).toHaveLength(1);
    expect(ziel.firstElementChild.tagName).toBe('svg');
  });

  it('ersetzt den vorherigen Inhalt des Ziel-Elements', () => {
    fenster.zeigeDiagramm('diagramm-restschuld', optionen());
    fenster.zeigeDiagramm('diagramm-restschuld', optionen());

    expect(dokument.getElementById('diagramm-restschuld').children).toHaveLength(1);
  });

  it('bleibt bei einem unbekannten Ziel-Element wirkungslos', () => {
    expect(() => fenster.zeigeDiagramm('gibtsNicht', optionen())).not.toThrow();
  });
});
