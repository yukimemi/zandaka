// =============================================================================
// File        : type.ts
// Author      : yukimemi
// Last Change : 2024/08/04 13:51:42.
// =============================================================================

import { z } from "npm:zod@3.23.8";
import { extractNumber } from "./util.ts";

export const TotalAssetSchema = z.object({
  name: z.string(),
  price: z.preprocess(extractNumber, z.number()),
  ratio: z.preprocess(extractNumber, z.number()),
});
export type TotalAsset = z.infer<typeof TotalAssetSchema>;

export const DepositSchema = z.object({
  name: z.string(),
  price: z.preprocess(extractNumber, z.number()),
  financialInstitution: z.string(),
});
export type Deposit = z.infer<typeof DepositSchema>;

export const PhysicalStockSchema = z.object({
  code: z.preprocess(extractNumber, z.number()),
  name: z.string(),
  quantity: z.preprocess(extractNumber, z.number()),
  averageAcquisitionPrice: z.preprocess(extractNumber, z.number()),
  currentPrice: z.preprocess(extractNumber, z.number()),
  valuationAmount: z.preprocess(extractNumber, z.number()),
  previousDayDifference: z.preprocess(extractNumber, z.number()),
  valuationGainLoss: z.preprocess(extractNumber, z.number()),
  valuationGainLossRate: z.preprocess(extractNumber, z.number()),
  financialInstitution: z.string(),
  acquisitionDate: z.string(),
});
export type PhysicalStock = z.infer<typeof PhysicalStockSchema>;

export const MutualFundSchema = z.object({
  name: z.string(),
  quantity: z.preprocess(extractNumber, z.number()),
  averageAcquisitionPrice: z.preprocess(extractNumber, z.number()),
  currentPrice: z.preprocess(extractNumber, z.number()),
  valuationAmount: z.preprocess(extractNumber, z.number()),
  previousDayDifference: z.preprocess(extractNumber, z.number()),
  valuationGainLoss: z.preprocess(extractNumber, z.number()),
  valuationGainLossRate: z.preprocess(extractNumber, z.number()),
  financialInstitution: z.string(),
});
export type MutualFund = z.infer<typeof MutualFundSchema>;

export const SalePointSchema = z.object({
  name: z.string(),
  type: z.string(),
  pointsOrMiles: z.preprocess(extractNumber, z.number()),
  conversionRate: z.preprocess(extractNumber, z.number()),
  currentValue: z.preprocess(extractNumber, z.number()),
  expirationDate: z.string(),
  financialInstitution: z.string(),
});
export type SalePoint = z.infer<typeof SalePointSchema>;
