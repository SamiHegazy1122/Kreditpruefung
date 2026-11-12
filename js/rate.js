/* rate.js - Berechnung der monatlichen Kreditrate (Annuitaet) */

function monatsrate(betrag, zins, monate) {
  const i = zins / 100 / 12;           // Monatszinssatz
  if (monate <= 0) return 0;
  if (i === 0) return betrag / monate; // zinsloser Kredit
  return betrag * i / (1 - Math.pow(1 + i, -monate));
}
