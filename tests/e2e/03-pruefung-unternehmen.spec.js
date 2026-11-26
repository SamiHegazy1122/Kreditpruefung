/* E2E: Kreditprüfung für Unternehmen (Regelauswahl nach Antragstyp) */
import { test, expect } from '@playwright/test';
import { oeffneApp, waehleTyp, fuelleAntrag, pruefeKredit, UNTERNEHMEN_ANTRAG } from './hilfen.js';

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await waehleTyp(page, 'unternehmen');
});

test('versteckt im Antragsformular das Altersfeld', async ({ page }) => {
  await expect(page.locator('#antrag-titel')).toHaveText('Angaben zum Unternehmen');
  await expect(page.locator('#feld-alter')).toBeHidden();
});

test('lehnt ein Unternehmen unter dem Mindestgewinn ab', async ({ page }) => {
  await fuelleAntrag(page, UNTERNEHMEN_ANTRAG);
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  const verletzt = page.locator('#begruendung li.nein');
  await expect(verletzt).toHaveCount(1);
  await expect(verletzt).toContainText('Mindestgewinn');
});

test('empfiehlt ein Unternehmen über dem Mindestgewinn', async ({ page }) => {
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit vergeben');
  await expect(page.locator('#rate-text')).toContainText('Monatliche Rate: CHF');
});

test('wendet nur die Regeln für "beide" und "unternehmen" an', async ({ page }) => {
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);

  const begruendung = page.locator('#begruendung');
  await expect(page.locator('#begruendung li')).toHaveCount(4);
  await expect(begruendung).toContainText('Mindestgewinn');
  await expect(begruendung).not.toContainText('Freies Einkommen');
  await expect(begruendung).not.toContainText('Alter bei Kreditende');
});

test('weist in den Kennzahlen kein Alter bei Kreditende aus', async ({ page }) => {
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);

  const tabelle = page.locator('#kennzahlen-tabelle');
  await expect(page.locator('#kennzahlen-tabelle tbody tr')).toHaveCount(7);
  await expect(tabelle).not.toContainText('Alter bei Kreditende');
});

test('dokumentiert zehn Berechnungsschritte ohne Altersschritt', async ({ page }) => {
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);

  const schritte = page.locator('#schritte li');
  await expect(schritte).toHaveCount(10);
  await expect(page.locator('#schritte')).not.toContainText('Alter bei Kreditende');
});

test('lehnt ab, wenn die Belastungsquote überschritten wird', async ({ page }) => {
  await fuelleAntrag(page, {
    ...UNTERNEHMEN_ANTRAG, einkommen: 60000, kreditbetrag: 400000, laufzeitMonate: 120
  });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  await expect(page.locator('#begruendung li.nein').filter({ hasText: 'Belastungsquote' }))
    .toHaveCount(1);
});

test('behält den Antragstyp über "Angaben ändern" hinweg', async ({ page }) => {
  await fuelleAntrag(page, { ...UNTERNEHMEN_ANTRAG, einkommen: 200000 });
  await pruefeKredit(page);
  await page.getByRole('button', { name: 'Angaben ändern' }).click();
  await pruefeKredit(page);

  /* Weiterhin Unternehmensregeln: vier Begründungen, kein Altersschritt. */
  await expect(page.locator('#begruendung li')).toHaveCount(4);
  await expect(page.locator('#kennzahlen-tabelle')).not.toContainText('Alter bei Kreditende');
});
