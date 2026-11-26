/* E2E: Verlauf über die Laufzeit - Tilgungsplan und Diagramme
   (Klassendiagramm: tilgungsplan.js, diagramm.js, Tilgungszeile) */
import { test, expect } from '@playwright/test';
import { oeffneApp, waehleTyp, fuelleAntrag, pruefeKredit, UNTERNEHMEN_ANTRAG } from './hilfen.js';

const restschuldDiagramm = (page) => page.locator('#diagramm-restschuld svg');
const zinsenDiagramm = (page) => page.locator('#diagramm-zinsen svg');

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await waehleTyp(page, 'privat');
});

test('zeigt nach der Prüfung beide Verlaufsdiagramme', async ({ page }) => {
  await pruefeKredit(page);

  await expect(restschuldDiagramm(page)).toBeVisible();
  await expect(zinsenDiagramm(page)).toBeVisible();
  await expect(restschuldDiagramm(page).locator('title')).toContainText('Restschuld');
  await expect(zinsenDiagramm(page).locator('title')).toContainText('Zinsanteil');
});

test('nennt die gesamten Zinszahlungen über der Grafik', async ({ page }) => {
  await pruefeKredit(page);

  const hinweis = page.locator('#verlauf-hinweis');
  await expect(hinweis).toContainText('Gesamte Zinszahlungen über die Laufzeit:');
  await expect(hinweis).toContainText('CHF');
  await expect(hinweis).not.toContainText('hypothetisch');
});

test('beschriftet beide Diagramme mit einer Legende', async ({ page }) => {
  await pruefeKredit(page);

  /* Die Beschriftungen sind SVG-<text>-Elemente, darum werden ihre Inhalte
     direkt ausgelesen statt ueber Text-Locator gesucht. */
  const beschriftungen = (zielId) => page.evaluate((id) =>
    [...document.querySelectorAll('#' + id + ' svg text')].map(element => element.textContent),
    zielId
  );

  expect(await beschriftungen('diagramm-restschuld')).toContain('Restschuld');
  const zinsen = await beschriftungen('diagramm-zinsen');
  expect(zinsen).toContain('Zinsanteil');
  expect(zinsen).toContain('Tilgungsanteil');
});

test('zeichnet den Verlauf auch bei einer Ablehnung, aber als hypothetisch', async ({ page }) => {
  await fuelleAntrag(page, { kreditbetrag: 900000 });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  await expect(restschuldDiagramm(page)).toBeVisible();
  await expect(page.locator('#verlauf-hinweis')).toContainText('hypothetischer Verlauf');
});

test('beschriftet die x-Achse ab zwei Jahren Laufzeit in Jahren', async ({ page }) => {
  await fuelleAntrag(page, { laufzeitMonate: 120 });
  await pruefeKredit(page);

  const texte = await page.evaluate(() =>
    [...document.querySelectorAll('#diagramm-restschuld svg text')].map(e => e.textContent));
  expect(texte).toContain('Jahre');
  expect(texte).not.toContain('Monate');
});

test('beschriftet die x-Achse unter zwei Jahren Laufzeit in Monaten', async ({ page }) => {
  await fuelleAntrag(page, { kreditbetrag: 10000, laufzeitMonate: 12 });
  await pruefeKredit(page);

  const texte = await page.evaluate(() =>
    [...document.querySelectorAll('#diagramm-restschuld svg text')].map(e => e.textContent));
  expect(texte).toContain('Monate');
  expect(texte).not.toContain('Jahre');
});

test('zeichnet pro Laufzeitmonat einen Punkt plus den Kreditstart', async ({ page }) => {
  await fuelleAntrag(page, { kreditbetrag: 10000, laufzeitMonate: 24 });
  await pruefeKredit(page);

  const punkte = await restschuldDiagramm(page).locator('polyline').getAttribute('points');
  expect(punkte.trim().split(/\s+/)).toHaveLength(25);
});

test('zeichnet die Diagramme bei einer erneuten Prüfung neu', async ({ page }) => {
  await pruefeKredit(page);
  await page.getByRole('button', { name: 'Angaben ändern' }).click();
  await fuelleAntrag(page, { laufzeitMonate: 60 });
  await pruefeKredit(page);

  await expect(page.locator('#diagramm-restschuld > *')).toHaveCount(1);
  await expect(page.locator('#diagramm-zinsen > *')).toHaveCount(1);
});

test('zeigt den Verlauf auch für Unternehmensanträge', async ({ page }) => {
  await page.getByRole('button', { name: 'Zurück' }).click();
  await waehleTyp(page, 'unternehmen');
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);

  await expect(restschuldDiagramm(page)).toBeVisible();
  await expect(zinsenDiagramm(page)).toBeVisible();
});
