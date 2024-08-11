// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/08/11 20:27:37.
// =============================================================================

import "@std/dotenv/load";
import type { Deposit, MutualFund, PhysicalStock, SalePoint, TotalAsset } from "./type.ts";
import {
  DepositSchema,
  MutualFundSchema,
  PhysicalStockSchema,
  SalePointSchema,
  SmtbAssetSchema,
  SmtbSchema,
  SonySchema,
  TotalAssetSchema,
} from "./type.ts";
import { delay } from "@std/async/delay";
import { launch, Page } from "@astral/astral";
import { tabletojson } from "npm:tabletojson";
import { z } from "npm:zod@3.23.8";
import { InfluxDB, Point } from "npm:@influxdata/influxdb-client";

const headless = true;
const signInPageMF = "https://moneyforward.com/me";
const signInPageSony = "https://cs.sonylife.co.jp/lpv/yf1p/sca/PYFW1011.seam";
const signInPageSmtb = "https://life.smtb.jp/Lifeguide/faces/xhtml/biz/F69914010/G699140010.xhtml";

const browser = await launch({
  headless,
});

// SMTB
const pageSmtb = await browser.newPage(signInPageSmtb);
await signinSmtb(pageSmtb);

await delay(30000);

const anatanoSisanZandakaLink = await pageSmtb.$(
  `#anataNoGenzaZandaka a.subbtn.aanalytics145314069`,
);
console.log({ anatanoSisanZandakaLink });
await Promise.all([
  pageSmtb.waitForNavigation(),
  anatanoSisanZandakaLink!.click(),
]);

const anatanoSisanZandakaTables = tabletojson.convert(
  await pageSmtb.evaluate(() => {
    return document.body.innerHTML;
  }),
);
console.log({ anatanoSisanZandakaTables });

const smTbZandaka = SmtbSchema.parse(
  anatanoSisanZandakaTables[0].reduce((acc: Record<string, string>, v: Record<string, string>) => {
    if (v.項目_4.includes("現在の残高（資産評価額合計）")) {
      acc["currentBalance"] = v.利回り;
    } else if (v.項目_4.includes("拠出金の合計額")) {
      acc["totalContributions"] = v.利回り;
    } else if (v.項目_4.includes("（うち事業主掛金）")) {
      acc["employerContributions"] = v.利回り;
    } else if (v.項目_4.includes("（うち加入者掛金）")) {
      acc["employeeContributions"] = v.利回り;
    } else if (v.項目_4.includes("評価損益")) {
      acc["profitLoss"] = v.利回り;
    } else if (v.項目_4.includes("運用利回り速報値（初回拠出月来）")) {
      acc["investmentReturn"] = v.利回り;
    }
    return acc;
  }, {} as Record<string, string>),
);
console.log({ smTbZandaka });

const smTbAssets = anatanoSisanZandakaTables[1].map((v: Record<string, string>) =>
  SmtbAssetSchema.parse({
    assetClass: v.資産クラス,
    assetValue: v.資産評価額,
    assetAllocation: v.資産配分,
  })
);
console.log({ smTbAssets });

// Sony
const pageSony = await browser.newPage(signInPageSony);
await signinSony(pageSony);

const keiyakuShokaiButton = await pageSony.$(`a[href="../../yh1p/scb/PYHW0010.seam?ETRFLG=1"]`);
await Promise.all([
  pageSony.waitForNavigation(),
  keiyakuShokaiButton!.click(),
]);

// harune.
const haruneButton = await pageSony.$(
  `a[href="../../yh3p/scb/PYHW0310.seam?index=0&ETRFLG=1&SDP=1"]`,
);
await Promise.all([
  pageSony.waitForNavigation(),
  haruneButton!.click(),
]);

const haruneHaraimodoshiButton = await pageSony.$(`a[href="#"]`);
await Promise.all([
  pageSony.waitForNavigation(),
  haruneHaraimodoshiButton!.click(),
]);

const haruneTables = tabletojson.convert(
  await pageSony.evaluate(() => {
    return document.body.innerHTML;
  }),
);
// console.log({ haruneTables });

const haruneYoteigaku = Object.values(haruneTables[2].pop()).pop();
console.log({ haruneYoteigaku });

await pageSony.goBack();
await pageSony.goBack();

// ritsu
const ritsuButton = await pageSony.$(
  `a[href="../../yh3p/scb/PYHW0310.seam?index=2&ETRFLG=1&SDP=1"]`,
);
await Promise.all([
  pageSony.waitForNavigation(),
  ritsuButton!.click(),
]);

const ritsuHaraimodoshiButton = await pageSony.$(`a[href="#"]`);
await Promise.all([
  pageSony.waitForNavigation(),
  ritsuHaraimodoshiButton!.click(),
]);

const ritsuTables = tabletojson.convert(
  await pageSony.evaluate(() => {
    return document.body.innerHTML;
  }),
);
// console.log({ ritsuTables });

const ritsuYoteigaku = Object.values(ritsuTables[2].pop()).pop();
console.log({ ritsuYoteigaku });

await pageSony.goBack();
await pageSony.goBack();

// yuki
const yukiButton = await pageSony.$(
  `a[href="../../yh3p/scb/PYHW0310.seam?index=1&ETRFLG=1&SDP=1"]`,
);
await Promise.all([
  pageSony.waitForNavigation(),
  yukiButton!.click(),
]);

const yukiHaraimodoshiButton = await pageSony.$(`a[href="#"]`);
await Promise.all([
  pageSony.waitForNavigation(),
  yukiHaraimodoshiButton!.click(),
]);

const yukiTables = tabletojson.convert(
  await pageSony.evaluate(() => {
    return document.body.innerHTML;
  }),
);
// console.log({ yukiTables });

const yukiYoteigaku = Object.values(yukiTables[2].pop()).pop();
console.log({ yukiYoteigaku });

const sony = [
  SonySchema.parse({
    name: "harune",
    price: haruneYoteigaku,
  }),
  SonySchema.parse({
    name: "ritsu",
    price: ritsuYoteigaku,
  }),
  SonySchema.parse({
    name: "yuki",
    price: yukiYoteigaku,
  }),
];
console.log({ sony });

const pageMF = await browser.newPage(signInPageMF);

await signinMF(pageMF);

await updateAll(pageMF);

const portfolioButton = await pageMF.$(`a[href="/bs/portfolio"]`);
await Promise.all([
  pageMF.waitForNavigation(),
  portfolioButton!.click(),
]);

const pageHtml = await pageMF.evaluate(() => {
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

// Point Sony
for (const s of sony) {
  const point = new Point("sony")
    .tag("name", s.name)
    .floatField("price", s.price)
    .timestamp(now);
  writeApi.writePoint(point);
}

// Point smTbZandaka
const smTbZandakaPoint = new Point("smtb_zandaka")
  .tag("name", "確定拠出年金")
  .floatField("current_balance", smTbZandaka.currentBalance)
  .floatField("total_contributions", smTbZandaka.totalContributions)
  .floatField("employer_contributions", smTbZandaka.employerContributions)
  .floatField("employee_contributions", smTbZandaka.employeeContributions)
  .floatField("profit_loss", smTbZandaka.profitLoss)
  .floatField("investment_return", smTbZandaka.investmentReturn)
  .timestamp(now);
writeApi.writePoint(smTbZandakaPoint);

// Point smTbAssets
for (const smTbAsset of smTbAssets) {
  const point = new Point("smtb_assets")
    .tag("assetClass", smTbAsset.assetClass)
    .floatField("assetValue", smTbAsset.assetValue)
    .floatField("assetAllocation", smTbAsset.assetAllocation)
    .timestamp(now);
  writeApi.writePoint(point);
}

await writeApi.flush();
await writeApi.close();

await browser.close();

async function signinMF(page: Page): Promise<void> {
  const toppage = await page.screenshot();
  Deno.writeFileSync("toppage_mf.png", toppage);

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

async function signinSony(page: Page): Promise<void> {
  const toppage = await page.screenshot();
  Deno.writeFileSync("toppage_sony.png", toppage);

  const user = z.string().parse(Deno.env.get("SONYLIFE_USER"));
  const pass = z.string().parse(Deno.env.get("SONYLIFE_PASS"));

  const userInput = await page.$(`input[id="j_id21:j_id25:acctId"]`);
  await userInput!.type(user, { delay: 10 });

  const passInput = await page.$(`input[id="j_id21:j_id32:pwd1"]`);
  await passInput!.type(pass, { delay: 10 });

  const submitButton = await page.$(`input[id="j_id21:logon1_kss_osm_privileged"]`);
  await Promise.all([
    page.waitForNavigation(),
    submitButton!.click(),
  ]);
}

async function signinSmtb(page: Page): Promise<void> {
  const toppage = await page.screenshot();
  Deno.writeFileSync("toppage_smtb.png", toppage);

  const user = z.string().parse(Deno.env.get("SMTB_USER"));
  const pass = z.string().parse(Deno.env.get("SMTB_PASS"));

  const userInput = await page.$(`input[id="f_personal:kojinId"]`);
  await userInput!.type(user, { delay: 10 });

  const passInput = await page.$(`input[id="f_personal:kojinPw"]`);
  await passInput!.type(pass, { delay: 10 });

  const submitButton = await page.$(`input[value="ログオン"]`);
  await Promise.all([
    page.waitForNavigation(),
    submitButton!.click(),
  ]);

  try {
    const userInput = await page.$(`input[name="userId"]`);
    await userInput!.type(user, { delay: 10 });

    const passInput = await page.$(`input[name="password"]`);
    await passInput!.type(pass, { delay: 10 });
    const submitButton2 = await page.$(`input[type="SUBMIT"]`);
    await Promise.all([
      page.waitForNavigation(),
      submitButton2!.click(),
    ]);
  } catch {}

  const submitButton2 = await page.$(`input[type="SUBMIT"]`);
  await Promise.all([
    page.waitForNavigation(),
    submitButton2!.click(),
  ]);
}
