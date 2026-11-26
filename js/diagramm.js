/* diagramm.js - Minimaler SVG-Diagrammgenerator ohne externe Bibliothek */

const SVG_NS = 'http://www.w3.org/2000/svg';
const DIAGRAMM_FARBEN = ['#2c3e50', '#a55', '#5a5'];

/* Zeichenflaeche in viewBox-Einheiten. Bewusst feste Groesse: beim Zeichnen ist
   das Resultat-View noch versteckt, eine Pixelmessung wuerde 0 ergeben. */
const DIA_BREITE = 640;
const DIA_HOEHE = 280;
const DIA_RAND = { links: 74, rechts: 14, oben: 14, unten: 64 };

/* ---------- Hilfsfunktionen ---------- */

/* SVG-Elemente brauchen createElementNS, createElement erzeugt kein gueltiges SVG */
function svgElement(name, attribute) {
  const element = document.createElementNS(SVG_NS, name);
  Object.keys(attribute || {}).forEach(schluessel => {
    element.setAttribute(schluessel, attribute[schluessel]);
  });
  return element;
}

function svgText(x, y, inhalt, attribute) {
  const element = svgElement('text', Object.assign({ x: x, y: y, 'font-size': 10 }, attribute || {}));
  element.textContent = inhalt;
  return element;
}

/* Runde Schrittweite, damit die Achse lesbare Werte zeigt */
function netteSchrittweite(spanne, anzahlSchritte) {
  if (!(spanne > 0)) return 1;
  const roh = spanne / anzahlSchritte;
  const groessenordnung = Math.pow(10, Math.floor(Math.log10(roh)));
  const vielfache = [1, 2, 2.5, 5, 10];
  for (let k = 0; k < vielfache.length; k++) {
    if (vielfache[k] * groessenordnung >= roh) return vielfache[k] * groessenordnung;
  }
  return 10 * groessenordnung;
}

/* Bereitet die Reihen auf: gestapelt werden die Werte aufeinander addiert.
   Rueckgabe: { reihen: [{ name, art, farbe, unten[], oben[] }], max } */
function stapleReihen(reihen, gestapelt) {
  const anzahl = reihen.length > 0 ? reihen[0].werte.length : 0;
  const basis = new Array(anzahl).fill(0);
  let max = 0;

  const aufbereitet = reihen.map((reihe, nummer) => {
    const unten = gestapelt ? basis.slice() : new Array(anzahl).fill(0);
    const oben = reihe.werte.map((wert, index) => unten[index] + wert);
    if (gestapelt) oben.forEach((wert, index) => { basis[index] = wert; });
    oben.forEach(wert => { if (isFinite(wert) && wert > max) max = wert; });
    return {
      name: reihe.name,
      art: reihe.art,
      farbe: reihe.farbe || DIAGRAMM_FARBEN[nummer % DIAGRAMM_FARBEN.length],
      unten: unten,
      oben: oben
    };
  });

  return { reihen: aufbereitet, max: max };
}

function zeichneLegende(svg, reihen, x, y) {
  let versatz = 0;
  reihen.forEach(reihe => {
    svg.appendChild(svgElement('rect', {
      x: x + versatz, y: y - 8, width: 10, height: 10, fill: reihe.farbe
    }));
    svg.appendChild(svgText(x + versatz + 14, y, reihe.name));
    versatz += 24 + reihe.name.length * 5.6;   // grobe Textbreite bei 10px Arial
  });
}

/* ---------- Oeffentliche Schnittstelle ---------- */

/* optionen = {
     titel:     string,            // nur fuer Screenreader (<title>)
     xWerte:    number[],          // numerische, aufsteigende x-Achse
     reihen:    [{ name, werte: number[], art: 'linie' | 'flaeche', farbe? }],
     gestapelt: boolean,           // Reihen aufeinander stapeln
     xTitel:    string,
     xSchritt:  number,            // Abstand der x-Beschriftungen (optional)
     formatX:   (wert) => string,
     formatY:   (wert) => string
   } */
function zeichneDiagramm(optionen) {
  const xWerte = optionen.xWerte || [];
  const formatX = optionen.formatX || (wert => String(wert));
  const formatY = optionen.formatY || (wert => String(wert));

  const svg = svgElement('svg', {
    viewBox: '0 0 ' + DIA_BREITE + ' ' + DIA_HOEHE,
    width: '100%',
    role: 'img'
  });
  const titel = svgElement('title');
  titel.textContent = optionen.titel || 'Diagramm';
  svg.appendChild(titel);
  if (xWerte.length === 0) return svg;

  const links = DIA_RAND.links;
  const rechts = DIA_BREITE - DIA_RAND.rechts;
  const oben = DIA_RAND.oben;
  const unten = DIA_HOEHE - DIA_RAND.unten;

  const xMin = xWerte[0];
  const xMax = xWerte[xWerte.length - 1];
  const aufbereitet = stapleReihen(optionen.reihen || [], optionen.gestapelt === true);
  const ySchritt = netteSchrittweite(aufbereitet.max, 5);
  const yMax = Math.max(ySchritt, Math.ceil(aufbereitet.max / ySchritt) * ySchritt);

  const xPos = wert => xMax === xMin
    ? (links + rechts) / 2
    : links + (rechts - links) * (wert - xMin) / (xMax - xMin);
  const yPos = wert => unten - (unten - oben) * (wert / yMax);

  /* Gitter und y-Beschriftung */
  const anzahlLinien = Math.round(yMax / ySchritt);
  for (let k = 0; k <= anzahlLinien; k++) {
    const wert = k * ySchritt;
    const y = yPos(wert);
    svg.appendChild(svgElement('line', {
      x1: links, y1: y, x2: rechts, y2: y, stroke: k === 0 ? '#888' : '#ddd'
    }));
    svg.appendChild(svgText(links - 6, y + 3, formatY(wert), { 'text-anchor': 'end' }));
  }
  svg.appendChild(svgElement('line', {
    x1: links, y1: oben, x2: links, y2: unten, stroke: '#888'
  }));

  /* Reihen: Flaechen zuerst, Linien darueber */
  aufbereitet.reihen.forEach(reihe => {
    const obenPunkte = reihe.oben.map((wert, index) => xPos(xWerte[index]) + ',' + yPos(wert));
    if (reihe.art === 'flaeche') {
      const untenPunkte = reihe.unten
        .map((wert, index) => xPos(xWerte[index]) + ',' + yPos(wert))
        .reverse();
      svg.appendChild(svgElement('polygon', {
        points: obenPunkte.concat(untenPunkte).join(' '),
        fill: reihe.farbe, 'fill-opacity': 0.7, stroke: reihe.farbe, 'stroke-width': 0.5
      }));
    } else {
      svg.appendChild(svgElement('polyline', {
        points: obenPunkte.join(' '), fill: 'none', stroke: reihe.farbe, 'stroke-width': 2
      }));
    }
  });

  /* x-Beschriftung auf runden Werten */
  const xSchritt = optionen.xSchritt > 0
    ? optionen.xSchritt
    : netteSchrittweite(xMax - xMin, 8);
  for (let wert = xMin; wert <= xMax + xSchritt / 1000; wert += xSchritt) {
    const x = xPos(wert);
    svg.appendChild(svgElement('line', { x1: x, y1: unten, x2: x, y2: unten + 4, stroke: '#888' }));
    svg.appendChild(svgText(x, unten + 15, formatX(wert), { 'text-anchor': 'middle' }));
  }
  if (optionen.xTitel) {
    svg.appendChild(svgText((links + rechts) / 2, unten + 31, optionen.xTitel, {
      'text-anchor': 'middle'
    }));
  }

  zeichneLegende(svg, aufbereitet.reihen, links, DIA_HOEHE - 6);
  return svg;
}

/* Zeichnet das Diagramm in ein Ziel-Element und ersetzt dessen Inhalt */
function zeigeDiagramm(zielId, optionen) {
  const ziel = document.getElementById(zielId);
  if (!ziel) return;
  ziel.innerHTML = '';
  ziel.appendChild(zeichneDiagramm(optionen));
}
