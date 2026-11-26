/* Gemeinsame Hilfsfunktionen für die E2E-Tests. */

export const SPEICHER_SCHLUESSEL = 'kreditpruefung.regeln';

/** Antragswerte, die den Vorgabewerten der Formularfelder entsprechen. */
export const REFERENZ_ANTRAG = {
  einkommen: 120000,
  vermoegen: 60000,
  wohnkosten: 1600,
  bestehendeKredite: 0,
  kreditbetrag: 150000,
  laufzeitMonate: 120,
  zinssatz: 3,
  alter: 40
};

/** Unternehmensantrag, bei dem nur der Mindestgewinn kritisch ist. */
export const UNTERNEHMEN_ANTRAG = {
  einkommen: 40000,
  vermoegen: 10000,
  wohnkosten: 0,
  bestehendeKredite: 0,
  kreditbetrag: 20000,
  laufzeitMonate: 60,
  zinssatz: 3
};

/** Öffnet die Applikation; optional mit vorab gesetzten Regeln im localStorage. */
export async function oeffneApp(page, { regeln = null } = {}) {
  if (regeln) {
    await page.addInitScript(
      ([schluessel, inhalt]) => window.localStorage.setItem(schluessel, inhalt),
      [SPEICHER_SCHLUESSEL, JSON.stringify(regeln)]
    );
  }
  await page.goto('/');
}

/** Wählt den Antragstyp und öffnet damit das Antragsformular. */
export async function waehleTyp(page, typ) {
  await page.locator(`[data-typ="${typ}"]`).click();
}

/** Füllt die angegebenen Formularfelder. */
export async function fuelleAntrag(page, werte) {
  for (const [id, wert] of Object.entries(werte)) {
    await page.locator(`#${id}`).fill(String(wert));
  }
}

/** Sendet das Antragsformular ab. */
export async function pruefeKredit(page) {
  await page.getByRole('button', { name: 'Kredit prüfen' }).click();
}

/** Liest den aktuellen localStorage-Inhalt des Regelwerks. */
export async function gespeicherteRegeln(page) {
  const roh = await page.evaluate(
    (schluessel) => window.localStorage.getItem(schluessel), SPEICHER_SCHLUESSEL
  );
  return roh === null ? null : JSON.parse(roh);
}
