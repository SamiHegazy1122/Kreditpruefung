/* ui.js - Darstellung und Benutzerinteraktion */

let regeln = ladeRegeln();
let aktuellerTyp = 'privat';

/* ---------- Hilfsfunktionen ---------- */

function zeigeView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('versteckt'));
  document.getElementById(id).classList.remove('versteckt');
}

function zahl(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

/* ---------- Kreditpruefung ---------- */

function zeigeTypAuswahl() {
  zeigeView('view-typ');
}

function zeigeAntragsformular(typ) {
  aktuellerTyp = typ;
  document.getElementById('antrag-titel').textContent = typ === 'privat'
    ? 'Angaben zur Privatperson / zum Haushalt'
    : 'Angaben zum Unternehmen';
  document.getElementById('feld-alter').classList.toggle('versteckt', typ !== 'privat');
  zeigeView('view-antrag');
}

function leseAntrag(typ) {
  return new Kreditantrag(
    typ,
    zahl('einkommen'),
    zahl('vermoegen'),
    zahl('wohnkosten'),
    zahl('bestehendeKredite'),
    zahl('kreditbetrag'),
    zahl('laufzeitMonate'),
    zahl('zinssatz'),
    typ === 'privat' ? zahl('alter') : null
  );
}

function zeigeResultat(ergebnis) {
  const empfehlung = document.getElementById('empfehlung');
  empfehlung.textContent = ergebnis.empfohlen
    ? 'Empfehlung: Kredit vergeben'
    : 'Empfehlung: Kredit nicht vergeben';
  empfehlung.className = 'empfehlung ' + (ergebnis.empfohlen ? 'ja' : 'nein');

  document.getElementById('rate-text').textContent = ergebnis.monatsrate !== null
    ? 'Monatliche Rate: ' + formatiereWert('monatsrate', ergebnis.monatsrate)
    : 'Es wird keine Monatsrate ausgewiesen, da der Kredit nicht empfohlen wird.';

  const liste = document.getElementById('begruendung');
  liste.innerHTML = '';
  ergebnis.begruendung.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = text.indexOf('nicht erfüllt') >= 0 ? 'nein' : 'ja';
    liste.appendChild(li);
  });

  const tbody = document.querySelector('#kennzahlen-tabelle tbody');
  tbody.innerHTML = '';
  ['monatsrate', 'monatsbelastung', 'jahresbelastung', 'tragbarkeitsquote',
   'verschuldungsquote', 'eigenmittelquote', 'freiesEinkommen', 'alterBeiKreditende']
    .forEach(name => {
      const wert = ergebnis.kennzahlen[name];
      if (wert === null || wert === undefined) return;
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      const td2 = document.createElement('td');
      td1.textContent = bezeichnungKennzahl(name);
      td2.textContent = formatiereWert(name, wert);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });

  zeigeBerechnungsschritte(ergebnis);
  zeigeView('view-resultat');
}

function zeigeBerechnungsschritte(ergebnis) {
  const liste = document.getElementById('schritte');
  liste.innerHTML = '';
  ergebnis.schritte.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    liste.appendChild(li);
  });
}

/* ---------- Regelwerk ---------- */

function bearbeiteRegeln(regelliste) {
  const tbody = document.querySelector('#regel-tabelle tbody');
  tbody.innerHTML = '';

  regelliste.forEach((regel, index) => {
    const tr = document.createElement('tr');

    const bezeichnung = document.createElement('input');
    bezeichnung.type = 'text';
    bezeichnung.value = regel.bezeichnung;
    bezeichnung.addEventListener('change', () => { regel.bezeichnung = bezeichnung.value; });

    const kennzahl = document.createElement('select');
    Object.keys(KENNZAHLEN).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = bezeichnungKennzahl(name);
      if (name === regel.kennzahl) option.selected = true;
      kennzahl.appendChild(option);
    });
    kennzahl.addEventListener('change', () => { regel.kennzahl = kennzahl.value; });

    const operator = document.createElement('select');
    ['<=', '>='].forEach(op => {
      const option = document.createElement('option');
      option.value = op;
      option.textContent = op;
      if (op === regel.operator) option.selected = true;
      operator.appendChild(option);
    });
    operator.addEventListener('change', () => { regel.operator = operator.value; });

    const grenzwert = document.createElement('input');
    grenzwert.type = 'number';
    grenzwert.step = 'any';
    grenzwert.value = regel.grenzwert;
    grenzwert.addEventListener('change', () => { regel.grenzwert = parseFloat(grenzwert.value) || 0; });

    const giltFuer = document.createElement('select');
    ['beide', 'privat', 'unternehmen'].forEach(wert => {
      const option = document.createElement('option');
      option.value = wert;
      option.textContent = wert;
      if (wert === regel.giltFuer) option.selected = true;
      giltFuer.appendChild(option);
    });
    giltFuer.addEventListener('change', () => { regel.giltFuer = giltFuer.value; });

    const loeschen = document.createElement('button');
    loeschen.type = 'button';
    loeschen.textContent = 'Löschen';
    loeschen.addEventListener('click', () => {
      regelliste.splice(index, 1);
      bearbeiteRegeln(regelliste);
    });

    [bezeichnung, kennzahl, operator, grenzwert, giltFuer, loeschen].forEach(element => {
      const td = document.createElement('td');
      td.appendChild(element);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function setzeStatus(text) {
  const status = document.getElementById('regel-status');
  status.textContent = text;
  setTimeout(() => { status.textContent = ''; }, 3000);
}

/* ---------- Ereignisse ---------- */

document.querySelectorAll('[data-typ]').forEach(button => {
  button.addEventListener('click', () => zeigeAntragsformular(button.dataset.typ));
});

document.getElementById('form-antrag').addEventListener('submit', event => {
  event.preventDefault();
  const antrag = leseAntrag(aktuellerTyp);
  zeigeResultat(pruefeKredit(antrag, regeln));
});

document.getElementById('btn-zurueck-typ').addEventListener('click', zeigeTypAuswahl);
document.getElementById('btn-zurueck-antrag').addEventListener('click', () => zeigeView('view-antrag'));
document.getElementById('btn-neu').addEventListener('click', zeigeTypAuswahl);
document.getElementById('nav-pruefung').addEventListener('click', zeigeTypAuswahl);

document.getElementById('nav-regeln').addEventListener('click', () => {
  bearbeiteRegeln(regeln);
  zeigeView('view-regeln');
});

document.getElementById('btn-regel-neu').addEventListener('click', () => {
  regeln.push(new Regel('Neue Regel', 'tragbarkeitsquote', '<=', 0.35, 'beide'));
  bearbeiteRegeln(regeln);
});

document.getElementById('btn-regel-speichern').addEventListener('click', () => {
  speichereRegeln(regeln);
  setzeStatus('Regeln gespeichert.');
});

document.getElementById('btn-regel-standard').addEventListener('click', () => {
  regeln = standardRegeln();
  speichereRegeln(regeln);
  bearbeiteRegeln(regeln);
  setzeStatus('Standardregeln geladen.');
});

zeigeTypAuswahl();
