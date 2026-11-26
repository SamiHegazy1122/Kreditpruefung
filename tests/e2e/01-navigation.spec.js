/* E2E: Navigation durch die Ansichten (Klassendiagramm: ui.js) */
import { test, expect } from '@playwright/test';
import { oeffneApp, waehleTyp, pruefeKredit } from './hilfen.js';

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
});

test('startet mit der Auswahl des Antragstyps', async ({ page }) => {
  await expect(page.locator('#view-typ')).toBeVisible();
  await expect(page.locator('#view-antrag')).toBeHidden();
  await expect(page.locator('#view-resultat')).toBeHidden();
  await expect(page.locator('#view-regeln')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Wer stellt den Kreditantrag?' })).toBeVisible();
});

test('führt von der Typ-Auswahl zum Antragsformular und zurück', async ({ page }) => {
  await waehleTyp(page, 'privat');
  await expect(page.locator('#view-antrag')).toBeVisible();
  await expect(page.locator('#antrag-titel')).toContainText('Privatperson');

  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.locator('#view-typ')).toBeVisible();
  await expect(page.locator('#view-antrag')).toBeHidden();
});

test('führt vom Resultat zurück zum Formular und zur neuen Prüfung', async ({ page }) => {
  await waehleTyp(page, 'privat');
  await pruefeKredit(page);
  await expect(page.locator('#view-resultat')).toBeVisible();

  await page.getByRole('button', { name: 'Angaben ändern' }).click();
  await expect(page.locator('#view-antrag')).toBeVisible();

  await pruefeKredit(page);
  await page.getByRole('button', { name: 'Neue Prüfung' }).click();
  await expect(page.locator('#view-typ')).toBeVisible();
});

test('wechselt über die Kopfnavigation zwischen Prüfung und Regelwerk', async ({ page }) => {
  await page.locator('#nav-regeln').click();
  await expect(page.locator('#view-regeln')).toBeVisible();
  await expect(page.locator('#view-typ')).toBeHidden();

  await page.locator('#nav-pruefung').click();
  await expect(page.locator('#view-typ')).toBeVisible();
  await expect(page.locator('#view-regeln')).toBeHidden();
});

test('zeigt immer nur eine Ansicht gleichzeitig', async ({ page }) => {
  const sichtbare = async () => page.locator('.view:not(.versteckt)').count();

  expect(await sichtbare()).toBe(1);
  await waehleTyp(page, 'unternehmen');
  expect(await sichtbare()).toBe(1);
  await pruefeKredit(page);
  expect(await sichtbare()).toBe(1);
  await page.locator('#nav-regeln').click();
  expect(await sichtbare()).toBe(1);
});
