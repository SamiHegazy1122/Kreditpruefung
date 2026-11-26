/* E2E: HTML5-Validierung des Antragsformulars.
   Diese Prüfungen laufen nur im echten Browser - jsdom erzwingt die
   Constraint-Validierung beim Absenden nicht. */
import { test, expect } from '@playwright/test';
import { oeffneApp, waehleTyp, pruefeKredit } from './hilfen.js';

/** Ist das Formular aus Sicht des Browsers absendbar? */
const formularGueltig = (page) =>
  page.evaluate(() => document.getElementById('form-antrag').checkValidity());

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await waehleTyp(page, 'privat');
});

test('akzeptiert die Vorgabewerte des Formulars', async ({ page }) => {
  /* Regressionsschutz: min="1" mit step="100" machte den Vorgabewert 150000
     ungültig, wodurch das Absenden wirkungslos blieb. */
  expect(await formularGueltig(page)).toBe(true);

  const ungueltige = await page.evaluate(() =>
    [...document.querySelectorAll('#form-antrag input')]
      .filter(eingabe => !eingabe.checkValidity())
      .map(eingabe => eingabe.id + ': ' + eingabe.validationMessage)
  );
  expect(ungueltige).toEqual([]);
});

test('akzeptiert Kreditbeträge in Hunderterschritten', async ({ page }) => {
  for (const betrag of ['100', '1000', '150000', '900000']) {
    await page.locator('#kreditbetrag').fill(betrag);
    expect(await formularGueltig(page), 'Kreditbetrag ' + betrag).toBe(true);
  }
});

test('blockiert das Absenden ohne Kreditbetrag', async ({ page }) => {
  await page.locator('#kreditbetrag').fill('');
  expect(await formularGueltig(page)).toBe(false);

  await pruefeKredit(page);

  await expect(page.locator('#view-antrag')).toBeVisible();
  await expect(page.locator('#view-resultat')).toBeHidden();
  await expect(page.locator('#empfehlung')).toHaveText('');
});

test('blockiert das Absenden bei einer Laufzeit von 0 Monaten', async ({ page }) => {
  await page.locator('#laufzeitMonate').fill('0');
  expect(await formularGueltig(page)).toBe(false);

  await pruefeKredit(page);
  await expect(page.locator('#view-resultat')).toBeHidden();
});

test('blockiert das Absenden bei negativen Beträgen', async ({ page }) => {
  await page.locator('#einkommen').fill('-5000');
  expect(await formularGueltig(page)).toBe(false);

  await pruefeKredit(page);
  await expect(page.locator('#view-resultat')).toBeHidden();
});

test('blockiert ein Alter unter 18 Jahren', async ({ page }) => {
  await page.locator('#alter').fill('15');
  expect(await formularGueltig(page)).toBe(false);

  await pruefeKredit(page);
  await expect(page.locator('#view-resultat')).toBeHidden();
});

test('ignoriert das versteckte Altersfeld bei Unternehmen', async ({ page }) => {
  await page.getByRole('button', { name: 'Zurück' }).click();
  await waehleTyp(page, 'unternehmen');
  await page.locator('#einkommen').fill('200000');
  await page.locator('#kreditbetrag').fill('20000');

  expect(await formularGueltig(page)).toBe(true);
  await pruefeKredit(page);
  await expect(page.locator('#view-resultat')).toBeVisible();
});

test('nennt alle Pflichtfelder im Formular', async ({ page }) => {
  const pflichtfelder = await page.evaluate(() =>
    [...document.querySelectorAll('#form-antrag input[required]')].map(eingabe => eingabe.id)
  );

  expect(pflichtfelder).toEqual([
    'einkommen', 'vermoegen', 'wohnkosten', 'bestehendeKredite',
    'kreditbetrag', 'laufzeitMonate', 'zinssatz'
  ]);
  /* Das Alter ist bewusst nicht zwingend, da es nur für Privatpersonen gilt. */
  expect(pflichtfelder).not.toContain('alter');
});
