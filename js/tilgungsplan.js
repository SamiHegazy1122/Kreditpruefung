/* tilgungsplan.js - Verlauf von Restschuld, Zins und Tilgung ueber die Laufzeit */

/* Erstellt den Tilgungsplan eines Annuitaetenkredits.
   Rueckgabe: Tilgungszeile[] - eine Zeile pro Monat, leer bei unzulaessigen Angaben. */
function tilgungsplan(betrag, zins, monate) {
  const anzahl = Math.max(0, Math.round(monate));
  if (anzahl <= 0 || betrag <= 0) return [];

  const i = zins / 100 / 12;                    // Monatszinssatz
  const rate = monatsrate(betrag, zins, anzahl);
  const plan = [];
  let restschuld = betrag;

  for (let monat = 1; monat <= anzahl; monat++) {
    const zinsAnteil = restschuld * i;
    let tilgungsAnteil = rate - zinsAnteil;
    /* Letzte Rate bzw. Rundungsdrift: nie mehr tilgen als noch offen ist */
    if (monat === anzahl || tilgungsAnteil > restschuld) tilgungsAnteil = restschuld;
    restschuld -= tilgungsAnteil;
    if (restschuld < 0.005) restschuld = 0;     // Rappen-Rundung
    plan.push(new Tilgungszeile(
      monat, zinsAnteil + tilgungsAnteil, zinsAnteil, tilgungsAnteil, restschuld
    ));
  }

  return plan;
}

/* Summe aller Zinszahlungen ueber die gesamte Laufzeit */
function gesamtzinsen(plan) {
  return plan.reduce((summe, zeile) => summe + zeile.zins, 0);
}
