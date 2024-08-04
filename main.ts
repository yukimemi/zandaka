// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/08/04 14:23:31.
// =============================================================================

import "@std/dotenv/load";
import type { Deposit, MutualFund, PhysicalStock, Point, TotalAsset } from "./type.ts";
import {
  DepositSchema,
  MutualFundSchema,
  PhysicalStockSchema,
  PointSchema,
  TotalAssetSchema,
} from "./type.ts";
import { delay } from "@std/async/delay";
import { launch, Page } from "@astral/astral";
import { tabletojson } from "npm:tabletojson";
import { z } from "npm:zod@3.23.8";

const headless = true;
const signInPage = "https://moneyforward.com/me";

const browser = await launch({
  headless,
});
const page = await browser.newPage(signInPage);

await signin(page);

// await updateAll(page);

const portfolioButton = await page.$(`a[href="/bs/portfolio"]`);
await Promise.all([
  page.waitForNavigation(),
  portfolioButton!.click(),
]);

const pageHtml = await page.evaluate(() => {
  return document.body.innerHTML;
});

// console.log({ pageHtml });

const tables = tabletojson.convert(pageHtml);
// console.log(tables);

const totalAssets = tables[0];
const deposits = tables[1];
const physicalStocks = tables[2];
const mutualFunds = tables[3];
const points = tables[4];

const totalAssetsParsed = totalAssets.map((v: Record<string, string>, i: number): TotalAsset => {
  const totalAsset = {
    name: "",
    price: v["ポイント・マイル"],
    ratio: v["1"],
  };

  if (i == 0) {
    totalAsset.name = "預金・現金・暗号資産";
  }
  if (i == 1) {
    totalAsset.name = "株式(現物)";
  }
  if (i == 2) {
    totalAsset.name = "投資信託";
  }
  if (i == 3) {
    totalAsset.name = "ポイント・マイル";
  }
  return TotalAssetSchema.parse(totalAsset);
});
console.log({ totalAssetsParsed });

const depositsParsed = deposits.map((v: Record<string, string>): Deposit => {
  const deposit = {
    name: v["種類・名称"],
    price: v["残高"],
    financialInstitution: v["保有金融機関"],
  };
  return DepositSchema.parse(deposit);
});
console.log({ depositsParsed });

// console.log({ physicalStocks });
const physicalStocksParsed = physicalStocks.map((v: Record<string, string>): PhysicalStock => {
  const physicalStock = {
    code: v["銘柄コード"],
    name: v["銘柄名"],
    quantity: v["保有数"],
    averageAcquisitionPrice: v["平均取得単価"],
    currentPrice: v["現在値"],
    valuationAmount: v["評価額"],
    previousDayDifference: v["前日比"],
    valuationGainLoss: v["評価損益"],
    valuationGainLossRate: v["評価損益率"],
    financialInstitution: v["保有金融機関"],
    acquisitionDate: v["取得日"],
  };
  return PhysicalStockSchema.parse(physicalStock);
});
console.log({ physicalStocksParsed });

// console.log({ mutualFunds });
const mutualFundsParsed = mutualFunds.map((v: Record<string, string>): MutualFund => {
  const mutualFund = {
    name: v["銘柄名"],
    quantity: v["保有数"],
    averageAcquisitionPrice: v["平均取得単価"],
    currentPrice: v["基準価額"],
    valuationAmount: v["評価額"],
    previousDayDifference: v["前日比"],
    valuationGainLoss: v["評価損益"],
    valuationGainLossRate: v["評価損益率"],
    financialInstitution: v["保有金融機関"],
  };
  return MutualFundSchema.parse(mutualFund);
});
console.log({ mutualFundsParsed });

// console.log({ points });
const pointsParsed = points.map((v: Record<string, string>): Point => {
  const point = {
    name: v["名称"],
    type: v["種類"],
    pointsOrMiles: v["ポイント・マイル数"],
    conversionRate: v["換算レート"],
    currentValue: v["現在の価値"],
    expirationDate: v["有効期限"],
    financialInstitution: v["保有金融機関"],
  };
  return PointSchema.parse(point);
});
console.log({ pointsParsed });

await delay(10000000);

await browser.close();

async function signin(page: Page): Promise<void> {
  const toppage = await page.screenshot();
  Deno.writeFileSync("toppage.png", toppage);

  const signInButton = await page.$(`a[href="/sign_in"]`);
  await Promise.all([
    page.waitForNavigation(),
    signInButton!.click(),
  ]);

  const mail = z.string().parse(Deno.env.get("MONEYFORWARD_EMAIL"));
  const mailInput = await page.$(`input[name="mfid_user[email]"]`);
  await mailInput!.type(mail, { delay: 10 });

  const submitButton1 = await page.$(`button[id="submitto"]`);
  await Promise.all([
    page.waitForNavigation(),
    submitButton1!.click(),
  ]);

  const pass = z.string().parse(Deno.env.get("MONEYFORWARD_PASS"));
  const passInput = await page.$(`input[name="mfid_user[password]"]`);
  await passInput!.type(pass, { delay: 10 });
  const submitButton2 = await page.$(`button[id="submitto"]`);
  await Promise.all([
    page.waitForNavigation(),
    submitButton2!.click(),
  ]);
}

async function updateAll(page: Page): Promise<void> {
  const updateAllButton = await page.$(`a[href="/aggregation_queue"]`);
  await Promise.all([
    page.waitForNavigation(),
    updateAllButton!.click(),
  ]);
}
