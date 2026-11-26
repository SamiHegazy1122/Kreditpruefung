/* E2E: Kreditprüfung für Privatpersonen
   (Klassendiagramm: ui.js -> pruefung.js -> rate.js, Kreditantrag, Pruefergebnis) */
import { test, expect } from '@playwright/test';
import { oeffneApp, waehleTyp, fuelleAntrag, pruefeKredit } from './hilfen.js';

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await waehleTyp(page, 'privat');
});

test('zeigt im Antragsformular das Altersfeld', async ({ page }) => {
  await expect(page.locator('#antrag-titel')).toHaveText('Angaben zur Privatperson / zum Haushalt');
  await expect(page.locator('#feld-alter')).toBeVisible();
  await expect(page.locator('#alter')).toHaveValue('40');
});

test('empfiehlt den Kredit bei tragbaren Vorgabewerten', async ({ page }) => {
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit vergeben');
  await expect(page.locator('#empfehlung')).toHaveClass('empfehlung ja');
  await expect(page.locator('#rate-text')).toContainText('Monatliche Rate: CHF');
  /* 150000 CHF, 3 %, 120 Monate -> Annuitaet 1448.41 CHF */
  await expect(page.locator('#rate-text')).toContainText('448.41');
});

test('begründet die Empfehlung mit allen fünf anwendbaren Regeln', async ({ page }) => {
  await pruefeKredit(page);

  const eintraege = page.locator('#begruendung li');
  await expect(eintraege).toHaveCount(5);
  await expect(eintraege.filter({ hasText: 'nicht erfüllt' })).toHaveCount(0);
  await expect(page.locator('#begruendung li.ja')).toHaveCount(5);
  await expect(page.locator('#begruendung')).toContainText('Freies Einkommen');
  await expect(page.locator('#begruendung')).toContainText('Alter bei Kreditende');
});

test('zeigt die Kennzahlen inklusive Alter bei Kreditende', async ({ page }) => {
  await pruefeKredit(page);

  const zeilen = page.locator('#kennzahlen-tabelle tbody tr');
  await expect(zeilen).toHaveCount(8);
  await expect(zeilen.first()).toContainText('Monatsrate neuer Kredit');
  await expect(page.locator('#kennzahlen-tabelle')).toContainText('Alter bei Kreditende');
  /* Alter 40 + 120 Monate Laufzeit = 50.0 Jahre */
  await expect(page.locator('#kennzahlen-tabelle')).toContainText('50.0 Jahre');
  await expect(page.locator('#kennzahlen-tabelle')).toContainText('30.5 %');
});

test('legt alle elf Berechnungsschritte nachvollziehbar dar', async ({ page }) => {
  await pruefeKredit(page);

  const schritte = page.locator('#schritte li');
  await expect(schritte).toHaveCount(11);
  await expect(schritte.first()).toContainText('Monatszinssatz');
  await expect(schritte.nth(1)).toContainText('Monatsrate');
  await expect(schritte.nth(2)).toContainText('Zinszahlungen');
  await expect(schritte.last()).toContainText('Alter bei Kreditende');
});

test('lehnt einen zu hohen Kreditbetrag ab und weist keine Rate aus', async ({ page }) => {
  await fuelleAntrag(page, { kreditbetrag: 900000 });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  await expect(page.locator('#empfehlung')).toHaveClass('empfehlung nein');
  await expect(page.locator('#rate-text')).toContainText('keine Monatsrate');
  await expect(page.locator('#rate-text')).not.toContainText('CHF');
  await expect(page.locator('#begruendung li.nein')).toHaveCount(4);
});

test('lehnt ab, wenn das Alter bei Kreditende über 70 liegt', async ({ page }) => {
  await fuelleAntrag(page, { alter: 64, laufzeitMonate: 120 });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  await expect(page.locator('#begruendung li.nein').filter({ hasText: 'Alter bei Kreditende' }))
    .toHaveCount(1);
});

test('lehnt ab, wenn das freie Einkommen unter 500 CHF liegt', async ({ page }) => {
  /* Nur die Regel "Freies Einkommen" ist gesetzt, damit genau sie den
     Ausschlag gibt - bei den Standardregeln wuerde zuerst die
     Belastungsquote greifen. */
  await oeffneApp(page, {
    regeln: [{
      bezeichnung: 'Freies Einkommen pro Monat', kennzahl: 'freiesEinkommen',
      operator: '>=', grenzwert: 500, giltFuer: 'privat'
    }]
  });
  await waehleTyp(page, 'privat');
  await fuelleAntrag(page, { einkommen: 30000, kreditbetrag: 60000 });
  await pruefeKredit(page);

  await expect(page.locator('#empfehlung')).toHaveText('Empfehlung: Kredit nicht vergeben');
  const verletzt = page.locator('#begruendung li.nein');
  await expect(verletzt).toHaveCount(1);
  await expect(verletzt).toContainText('Freies Einkommen');
});

test('rechnet bestehende Kredite in die Belastung ein', async ({ page }) => {
  await pruefeKredit(page);
  const ohneBestand = await page.locator('#kennzahlen-tabelle tbody tr').nth(1).innerText();

  await page.getByRole('button', { name: 'Angaben ändern' }).click();
  await fuelleAntrag(page, { bestehendeKredite: 60000 });
  await pruefeKredit(page);
  const mitBestand = await page.locator('#kennzahlen-tabelle tbody tr').nth(1).innerText();

  expect(mitBestand).not.toBe(ohneBestand);
  await expect(page.locator('#schritte li').nth(3)).toContainText('bestehender Kredite');
});

test('senkt die Monatsrate bei längerer Laufzeit', async ({ page }) => {
  const rate = async () => (await page.locator('#rate-text').innerText())
    .replace(/[^0-9.]/g, '');

  await fuelleAntrag(page, { laufzeitMonate: 120 });
  await pruefeKredit(page);
  const kurz = Number(await rate());

  await page.getByRole('button', { name: 'Angaben ändern' }).click();
  await fuelleAntrag(page, { laufzeitMonate: 240 });
  await pruefeKredit(page);
  const lang = Number(await rate());

  expect(lang).toBeLessThan(kurz);
});
