/* E2E: Regelwerk der Bank - Bearbeiten, Persistenz im localStorage und Wirkung
   auf die Prüfung (Klassendiagramm: regelwerk.js -> localStorage, Regel). */
import { test, expect } from '@playwright/test';
import {
  oeffneApp, waehleTyp, fuelleAntrag, pruefeKredit, gespeicherteRegeln, UNTERNEHMEN_ANTRAG
} from './hilfen.js';

const zeilen = (page) => page.locator('#regel-tabelle tbody tr');

/** Grenzwertfeld der n-ten Regelzeile (vierte Spalte). */
const grenzwertFeld = (page, index) =>
  zeilen(page).nth(index).locator('td').nth(3).locator('input');

/** Die in den Zeilen ausgewaehlten Kennzahlen, in Tabellenreihenfolge. */
const gewaehlteKennzahlen = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#regel-tabelle tbody tr')]
    .map(zeile => zeile.querySelector('select').value)
);

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await page.locator('#nav-regeln').click();
});

test('zeigt die sechs Standardregeln mit allen Eingabefeldern', async ({ page }) => {
  await expect(page.locator('#view-regeln')).toBeVisible();
  await expect(zeilen(page)).toHaveCount(6);

  const erste = zeilen(page).first();
  await expect(erste.locator('td')).toHaveCount(6);
  await expect(erste.locator('input[type="text"]')).toHaveValue('Tragbarkeit: Belastungsquote');
  await expect(erste.locator('select').first()).toHaveValue('tragbarkeitsquote');
  await expect(grenzwertFeld(page, 0)).toHaveValue('0.35');
});

test('fügt eine neue Regel hinzu', async ({ page }) => {
  await page.getByRole('button', { name: 'Regel hinzufügen' }).click();

  await expect(zeilen(page)).toHaveCount(7);
  await expect(zeilen(page).last().locator('input[type="text"]')).toHaveValue('Neue Regel');
});

test('löscht eine Regel wieder', async ({ page }) => {
  await zeilen(page).nth(1).getByRole('button', { name: 'Löschen' }).click();

  await expect(zeilen(page)).toHaveCount(5);
  /* Nicht auf den Tabellentext pruefen: jede Zeile listet in ihrer Auswahlliste
     alle Kennzahlen auf. Entscheidend sind die ausgewaehlten Kennzahlen. */
  expect(await gewaehlteKennzahlen(page)).toEqual([
    'tragbarkeitsquote', 'eigenmittelquote', 'freiesEinkommen',
    'alterBeiKreditende', 'einkommen'
  ]);
});

test('speichert geänderte Regeln und meldet den Erfolg', async ({ page }) => {
  await grenzwertFeld(page, 0).fill('0.2');
  await grenzwertFeld(page, 0).blur();
  await page.getByRole('button', { name: 'Speichern' }).click();

  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  const gespeichert = await gespeicherteRegeln(page);
  expect(gespeichert).toHaveLength(6);
  expect(gespeichert[0].grenzwert).toBe(0.2);
});

test('blendet die Statusmeldung nach drei Sekunden wieder aus', async ({ page }) => {
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  await expect(page.locator('#regel-status')).toHaveText('', { timeout: 5000 });
});

test('behält gespeicherte Regeln nach dem Neuladen der Seite', async ({ page }) => {
  await grenzwertFeld(page, 0).fill('0.2');
  await grenzwertFeld(page, 0).blur();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  await page.reload();
  await page.locator('#nav-regeln').click();

  await expect(zeilen(page)).toHaveCount(6);
  await expect(grenzwertFeld(page, 0)).toHaveValue('0.2');
});

test('verwirft ungespeicherte Änderungen beim Neuladen', async ({ page }) => {
  await grenzwertFeld(page, 0).fill('0.99');
  await grenzwertFeld(page, 0).blur();

  await page.reload();
  await page.locator('#nav-regeln').click();

  await expect(grenzwertFeld(page, 0)).toHaveValue('0.35');
});

test('wendet ein verschärftes Regelwerk auf die nächste Prüfung an', async ({ page }) => {
  /* Belastungsquote des Referenzantrags liegt bei 30.5 % - mit Grenzwert 20 %
     muss derselbe Antrag abgelehnt werden. */
  await grenzwertFeld(page, 0).fill('0.2');
  await grenzwertFeld(page, 0).blur();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  await page.reload();
  await waehleTyp(page, 'privat');
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  await expect(page.locator('#begruendung li.nein').filter({ hasText: 'Belastungsquote' }))
    .toHaveCount(1);
});

test('wendet ein gelockertes Regelwerk auf die nächste Prüfung an', async ({ page }) => {
  /* Mit Grenzwert 20 % wird der Standardantrag (30.5 %) abgelehnt, mit 40 % nicht. */
  await grenzwertFeld(page, 0).fill('0.2');
  await grenzwertFeld(page, 0).blur();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  await page.locator('#nav-pruefung').click();
  await waehleTyp(page, 'privat');
  await pruefeKredit(page);
  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');

  await page.locator('#nav-regeln').click();
  await grenzwertFeld(page, 0).fill('0.4');
  await grenzwertFeld(page, 0).blur();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  await page.locator('#nav-pruefung').click();
  await waehleTyp(page, 'privat');
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit vergeben');
});

test('empfiehlt ohne jede Regel keine Vergabe', async ({ page }) => {
  for (let index = 0; index < 6; index++) {
    await zeilen(page).first().getByRole('button', { name: 'Löschen' }).click();
  }
  await expect(zeilen(page)).toHaveCount(0);

  await page.locator('#nav-pruefung').click();
  await waehleTyp(page, 'privat');
  await pruefeKredit(page);

  /* Ohne pruefbares Kriterium gibt es keine Grundlage fuer eine Vergabe. */
  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  await expect(page.locator('#rate-text')).toContainText('keine Monatsrate');
  await expect(page.locator('#begruendung li')).toHaveCount(1);
  await expect(page.locator('#begruendung li')).toContainText('Keine Regel definiert');
});

test('blockiert einen Unternehmenskredit nicht mehr durch eine Altersregel', async ({ page }) => {
  /* alterBeiKreditende existiert bei Unternehmen nicht. Auf "beide" gestellt
     galt die Regel frueher als verletzt und verhinderte jede Vergabe. */
  await zeilen(page).nth(4).locator('select').nth(2).selectOption('beide');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  await page.locator('#nav-pruefung').click();
  await waehleTyp(page, 'unternehmen');
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit vergeben');
  await expect(page.locator('#begruendung')).not.toContainText('Alter bei Kreditende');
});

test('stellt mit "Standardregeln laden" das Standardregelwerk wieder her', async ({ page }) => {
  await page.getByRole('button', { name: 'Regel hinzufügen' }).click();
  await grenzwertFeld(page, 0).fill('0.99');
  await grenzwertFeld(page, 0).blur();
  await expect(zeilen(page)).toHaveCount(7);

  await page.getByRole('button', { name: 'Standardregeln laden' }).click();

  await expect(page.locator('#regel-status')).toHaveText('Standardregeln geladen.');
  await expect(zeilen(page)).toHaveCount(6);
  await expect(grenzwertFeld(page, 0)).toHaveValue('0.35');

  /* Die Standardregeln werden dabei auch persistiert. */
  const gespeichert = await gespeicherteRegeln(page);
  expect(gespeichert).toHaveLength(6);
  expect(gespeichert[0].grenzwert).toBe(0.35);
});

test('übernimmt eine geänderte Kennzahl und einen geänderten Operator', async ({ page }) => {
  const erste = zeilen(page).first();
  await erste.locator('input[type="text"]').fill('Mindestvermögen');
  await erste.locator('select').nth(0).selectOption('vermoegen');
  await erste.locator('select').nth(1).selectOption('>=');
  await grenzwertFeld(page, 0).fill('50000');
  await grenzwertFeld(page, 0).blur();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#regel-status')).toHaveText('Regeln gespeichert.');

  const gespeichert = await gespeicherteRegeln(page);
  expect(gespeichert[0]).toEqual({
    bezeichnung: 'Mindestvermögen',
    kennzahl: 'vermoegen',
    operator: '>=',
    grenzwert: 50000,
    giltFuer: 'beide'
  });
});

test('startet mit den Standardregeln, wenn der localStorage beschädigt ist', async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('kreditpruefung.regeln', '{kein gueltiges json')
  );
  await page.reload();
  await page.locator('#nav-regeln').click();

  await expect(zeilen(page)).toHaveCount(6);
  await expect(grenzwertFeld(page, 0)).toHaveValue('0.35');
});
