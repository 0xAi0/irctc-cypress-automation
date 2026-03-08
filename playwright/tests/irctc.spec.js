const { test, expect } = require('@playwright/test');
const bookingData = require('../../cypress/fixtures/passenger_data.json');
const { formatDate, hasTatkalAlreadyOpened, tatkalOpenTimings } = require('../utils/date');
const { requestCaptchaText } = require('../services/captcha-solver');

const MAX_CAPTCHA_ATTEMPTS = Number(process.env.MAX_CAPTCHA_ATTEMPTS || 25);
const MANUAL_CAPTCHA = process.env.MANUAL_CAPTCHA === 'true';

function getCredential(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

async function bodyText(page) {
  return (await page.locator('body').innerText()) || '';
}

async function solveCaptchaBlock(page, request, attempts = MAX_CAPTCHA_ATTEMPTS) {
  for (let i = 0; i < attempts; i += 1) {
    const text = await bodyText(page);

    if (text.includes('Logout') || text.includes('Payment Methods')) {
      return;
    }

    if (MANUAL_CAPTCHA) {
      await page.locator('#captcha').focus();
      await page.waitForTimeout(2000);
      continue;
    }

    const image = await page.locator('.captcha-img').getAttribute('src');
    if (!image) throw new Error('Captcha image not found');

    const captcha = await requestCaptchaText(request, image);
    await page.locator('#captcha').fill(captcha);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
  }

  throw new Error(`Captcha could not be solved in ${attempts} attempts`);
}

async function pickAutocompleteOption(page, inputLocator, value) {
  await inputLocator.fill('');
  await inputLocator.type(value, { delay: 80 });
  await page.locator('#p-highlighted-option').first().click();
}

async function selectQuota(page) {
  const { TATKAL, PREMIUM_TATKAL } = bookingData;

  if (TATKAL && PREMIUM_TATKAL) {
    throw new Error('Set either TATKAL or PREMIUM_TATKAL true, not both');
  }

  if (!TATKAL && !PREMIUM_TATKAL) return;

  await page.locator('#journeyQuota .ui-dropdown').click();
  const quotaIndex = TATKAL ? 6 : 7;
  await page.locator(`:nth-child(${quotaIndex}) > .ui-dropdown-item`).click();
}

async function waitForTatkalIfNeeded(page) {
  if (!bookingData.TATKAL || hasTatkalAlreadyOpened(bookingData.TRAIN_COACH)) return;

  const expected = tatkalOpenTimings[bookingData.TRAIN_COACH];
  await expect(page.locator('div.h_head1')).toContainText(expected, { timeout: 300000 });
}

async function openMatchingTrain(page) {
  const trainCards = page.locator(':nth-child(n) > .bull-back');
  const count = await trainCards.count();

  for (let i = 0; i < count; i += 1) {
    const card = trainCards.nth(i);
    const text = await card.innerText();
    if (!text.includes(bookingData.TRAIN_NO) || !text.includes(bookingData.TRAIN_COACH)) continue;

    await card.locator(`text=${bookingData.TRAIN_COACH}`).first().click();
    await page.locator(':nth-child(n) > .bull-back > app-train-avl-enq > :nth-child(1) > :nth-child(7) > :nth-child(1)').filter({ hasText: formatDate(bookingData.TRAVEL_DATE) }).first().click();
    await page.locator(':nth-child(n) > .bull-back > app-train-avl-enq > [style="padding-top: 10px; padding-bottom: 20px;"]', { hasText: 'Book Now' }).first().click();
    return true;
  }

  return false;
}

async function fillPassengers(page) {
  const passengers = bookingData.PASSENGER_DETAILS || [];

  for (let i = 1; i < passengers.length; i += 1) {
    await page.locator('.pull-left > a > :nth-child(1)').click();
  }

  const names = page.locator('.ui-autocomplete input');
  const ages = page.locator('input[formcontrolname="passengerAge"]');
  const genders = page.locator('select[formcontrolname="passengerGender"]');
  const berths = page.locator('select[formcontrolname="passengerBerthChoice"]');

  for (let i = 0; i < passengers.length; i += 1) {
    const p = passengers[i];
    await names.nth(i).fill(p.NAME);
    await ages.nth(i).fill(String(p.AGE));
    await genders.nth(i).selectOption({ label: p.GENDER });
    await berths.nth(i).selectOption({ label: p.SEAT });
  }

  const food = page.locator('select[formcontrolname="passengerFoodChoice"]');
  const foodCount = await food.count();
  for (let i = 0; i < Math.min(foodCount, passengers.length); i += 1) {
    await food.nth(i).selectOption({ label: passengers[i].FOOD });
  }
}

test('IRCTC tatkal booking flow (Playwright migration)', async ({ page, request }) => {
  const username = getCredential('USERNAME');
  const password = getCredential('PASSWORD');

  await page.goto('/nget/train-search', { waitUntil: 'domcontentloaded', timeout: 90000 });

  await page.locator('.h_head1 > .search_btn').click();
  await page.locator('input[placeholder="User Name"]').fill(username);
  await page.locator('input[placeholder="Password"]').fill(password);

  await solveCaptchaBlock(page, request);

  const text = await bodyText(page);
  if (text.includes('Your Last Transaction')) {
    await page.locator('.ui-dialog-footer > .ng-tns-c19-3 > .text-center > .btn').click();
  }

  await pickAutocompleteOption(page, page.locator('.ui-autocomplete > .ng-tns-c57-8'), bookingData.SOURCE_STATION);
  await pickAutocompleteOption(page, page.locator('.ui-autocomplete > .ng-tns-c57-9'), bookingData.DESTINATION_STATION);

  await page.locator('.ui-calendar').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.locator('.ui-calendar').fill(bookingData.TRAVEL_DATE);

  await selectQuota(page);
  await page.locator('.col-md-3 > .search_btn').click();

  await waitForTatkalIfNeeded(page);
  const trainFound = await openMatchingTrain(page);
  expect(trainFound).toBeTruthy();

  await expect(page.locator('.dull-back.train-Header')).toBeVisible();

  if (bookingData.BOARDING_STATION) {
    await page.locator('.ui-dropdown.ui-widget.ui-corner-all').click();
    await page.locator('li.ui-dropdown-item', { hasText: bookingData.BOARDING_STATION }).click();
  }

  await fillPassengers(page);

  const pageText = await bodyText(page);
  if (pageText.includes('Book only if confirm berths are allotted')) {
    await page.locator(':nth-child(2) > .css-label_c').click();
  }
  if (pageText.includes('Consider for Auto Upgradation.')) {
    await page.getByText('Consider for Auto Upgradation.').first().click();
  }

  await page.locator('#\\32  > .ui-radiobutton > .ui-radiobutton-box').click();
  await page.locator('.train_Search').click();

  await solveCaptchaBlock(page, request);

  await page.locator(':nth-child(3) > .col-pad').click();
  await page.locator('.col-sm-9 > app-bank > #bank-type').click();
  await page.locator('.col-sm-9 > app-bank > #bank-type > :nth-child(2) > table > tr > :nth-child(1) > .col-lg-12 > .border-all > .col-xs-12 > .col-pad').click();

  await page.locator('.btn').click();
});
