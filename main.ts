// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/08/04 14:23:31.
// =============================================================================

import "@std/dotenv/load";
import type { Deposit, MutualFund, PhysicalStock, SalePoint, TotalAsset } from "./type.ts";
import {
  DepositSchema,
  MutualFundSchema,
  PhysicalStockSchema,
  SalePointSchema,
  TotalAssetSchema,
} from "./type.ts";
import { delay } from "@std/async/delay";
import { launch, Page } from "@astral/astral";
import { tabletojson } from "npm:tabletojson";
import { z } from "npm:zod@3.23.8";
import { InfluxDB, Point } from "npm:@influxdata/influxdb-client";

const headless = true;
const signInPage = "https://moneyforward.com/me";

const browser = await launch({
  headless,
});
const page = await browser.newPage(signInPage);

await signin(page);

await updateAll(page);

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
const salePoints = tables[4];

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
const aggregatedDeposits = depositsParsed.reduce((acc: Deposit[], deposit: Deposit) => {
  const existingDeposit = acc.find((item) =>
    item.financialInstitution === deposit.financialInstitution
  );
  if (existingDeposit) {
    existingDeposit.price += deposit.price;
  } else {
    acc.push({ ...deposit });
  }
  return acc;
}, []);
console.log({ aggregatedDeposits });

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
const aggregatedStocks = physicalStocksParsed.reduce(
  (acc: PhysicalStock[], stock: PhysicalStock) => {
    const existingStock = acc.find((item) => item.code === stock.code);
    if (existingStock) {
      existingStock.quantity += stock.quantity;
      existingStock.valuationAmount += stock.valuationAmount;
      existingStock.previousDayDifference += stock.previousDayDifference;
      existingStock.valuationGainLoss += stock.valuationGainLoss;
      existingStock.valuationGainLossRate =
        (existingStock.valuationGainLoss / existingStock.valuationAmount) * 100;
    } else {
      acc.push({ ...stock });
    }
    return acc;
  },
  [],
);
console.log({ aggregatedStocks });

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
const aggregatedFunds = mutualFundsParsed.reduce((acc: MutualFund[], fund: MutualFund) => {
  const existingFund = acc.find((item) => item.name === fund.name);
  if (existingFund) {
    existingFund.quantity += fund.quantity;
    existingFund.valuationAmount += fund.valuationAmount;
    existingFund.previousDayDifference += fund.previousDayDifference;
    existingFund.valuationGainLoss += fund.valuationGainLoss;
    existingFund.valuationGainLossRate =
      (existingFund.valuationGainLoss / existingFund.valuationAmount) * 100;
  } else {
    acc.push({ ...fund });
  }
  return acc;
}, []);
console.log({ aggregatedFunds });

// console.log({ salePoints });
const salePointsParsed = salePoints.map((v: Record<string, string>): SalePoint => {
  const salePoint = {
    name: v["名称"],
    type: v["種類"],
    pointsOrMiles: v["ポイント・マイル数"],
    conversionRate: v["換算レート"],
    currentValue: v["現在の価値"],
    expirationDate: v["有効期限"],
    financialInstitution: v["保有金融機関"],
  };
  return SalePointSchema.parse(salePoint);
});
console.log({ salePointsParsed });
const aggregatedSalePoints = salePointsParsed.reduce((acc: SalePoint[], point: SalePoint) => {
  const existingPoint = acc.find((item) => item.name === point.name);
  if (existingPoint) {
    existingPoint.pointsOrMiles += point.pointsOrMiles;
    existingPoint.currentValue += point.currentValue;
  } else {
    acc.push({ ...point });
  }
  return acc;
}, []);
console.log({ aggregatedSalePoints });

const now = new Date();

const influxDbUrl = z.string().parse(Deno.env.get("INFLUXDB_URL"));
const influxDbToken = z.string().parse(Deno.env.get("INFLUXDB_TOKEN"));
const influxDbOrg = z.string().parse(Deno.env.get("INFLUXDB_ORG"));
const influxDbBucket = z.string().parse(Deno.env.get("INFLUXDB_BUCKET"));

const writeApi = new InfluxDB({ url: influxDbUrl, token: influxDbToken }).getWriteApi(
  influxDbOrg,
  influxDbBucket,
  "s",
);

// Point totalAssets
for (const totalAsset of totalAssetsParsed) {
  const point = new Point("total_assets")
    .tag("name", totalAsset.name)
    .floatField("price", totalAsset.price)
    .floatField("ratio", totalAsset.ratio)
    .timestamp(now);
  writeApi.writePoint(point);
}
// Point deposits
for (const deposit of depositsParsed) {
  const point = new Point("deposits")
    .tag("name", deposit.name)
    .floatField("price", deposit.price)
    .tag("financial_institution", deposit.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}
// Point aggregatedDeposits
for (const aggregatedDeposit of aggregatedDeposits) {
  const point = new Point("aggregated_deposits")
    .tag("name", aggregatedDeposit.name)
    .floatField("price", aggregatedDeposit.price)
    .tag("financial_institution", aggregatedDeposit.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}

// Point physicalStocks
for (const physicalStock of physicalStocksParsed) {
  const point = new Point("physical_stocks")
    .tag("code", physicalStock.code)
    .tag("name", physicalStock.name)
    .floatField("quantity", physicalStock.quantity)
    .floatField("average_acquisition_price", physicalStock.averageAcquisitionPrice)
    .floatField("current_price", physicalStock.currentPrice)
    .floatField("valuation_amount", physicalStock.valuationAmount)
    .floatField("previous_day_difference", physicalStock.previousDayDifference)
    .floatField("valuation_gain_loss", physicalStock.valuationGainLoss)
    .floatField("valuation_gain_loss_rate", physicalStock.valuationGainLossRate)
    .tag("financial_institution", physicalStock.financialInstitution)
    .tag("acquisition_date", physicalStock.acquisitionDate)
    .timestamp(now);
  writeApi.writePoint(point);
}
// Point aggregatedStocks
for (const aggregatedStock of aggregatedStocks) {
  const point = new Point("aggregated_stocks")
    .tag("name", aggregatedStock.name)
    .floatField("quantity", aggregatedStock.quantity)
    .floatField("valuation_amount", aggregatedStock.valuationAmount)
    .floatField("previous_day_difference", aggregatedStock.previousDayDifference)
    .floatField("valuation_gain_loss", aggregatedStock.valuationGainLoss)
    .floatField("valuation_gain_loss_rate", aggregatedStock.valuationGainLossRate)
    .tag("financial_institution", aggregatedStock.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}

// Point mutualFunds
for (const mutualFund of mutualFundsParsed) {
  const point = new Point("mutual_funds")
    .tag("name", mutualFund.name)
    .floatField("quantity", mutualFund.quantity)
    .floatField("average_acquisition_price", mutualFund.averageAcquisitionPrice)
    .floatField("current_price", mutualFund.currentPrice)
    .floatField("valuation_amount", mutualFund.valuationAmount)
    .floatField("previous_day_difference", mutualFund.previousDayDifference)
    .floatField("valuation_gain_loss", mutualFund.valuationGainLoss)
    .floatField("valuation_gain_loss_rate", mutualFund.valuationGainLossRate)
    .tag("financial_institution", mutualFund.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}
// Point aggregatedFunds
for (const aggregatedFund of aggregatedFunds) {
  const point = new Point("aggregated_funds")
    .tag("name", aggregatedFund.name)
    .floatField("quantity", aggregatedFund.quantity)
    .floatField("valuation_amount", aggregatedFund.valuationAmount)
    .floatField("previous_day_difference", aggregatedFund.previousDayDifference)
    .floatField("valuation_gain_loss", aggregatedFund.valuationGainLoss)
    .floatField("valuation_gain_loss_rate", aggregatedFund.valuationGainLossRate)
    .tag("financial_institution", aggregatedFund.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}

// Point salePoints
for (const salePoint of salePointsParsed) {
  const point = new Point("sale_points")
    .tag("name", salePoint.name)
    .tag("type", salePoint.type)
    .floatField("points_or_miles", salePoint.pointsOrMiles)
    .floatField("conversion_rate", salePoint.conversionRate)
    .floatField("current_value", salePoint.currentValue)
    .tag("expiration_date", salePoint.expirationDate)
    .tag("financial_institution", salePoint.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}
// Point aggregatedSalePoints
for (const aggregatedSalePoint of aggregatedSalePoints) {
  const point = new Point("aggregated_sale_points")
    .tag("name", aggregatedSalePoint.name)
    .tag("type", aggregatedSalePoint.type)
    .floatField("points_or_miles", aggregatedSalePoint.pointsOrMiles)
    .floatField("conversion_rate", aggregatedSalePoint.conversionRate)
    .floatField("current_value", aggregatedSalePoint.currentValue)
    .tag("expiration_date", aggregatedSalePoint.expirationDate)
    .tag("financial_institution", aggregatedSalePoint.financialInstitution)
    .timestamp(now);
  writeApi.writePoint(point);
}

await writeApi.flush();
await writeApi.close();

// await delay(10000000);

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
