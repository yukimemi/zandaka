// =============================================================================
// File        : util.ts
// Author      : yukimemi
// Last Change : 2024/08/04 13:10:06.
// =============================================================================

import { z } from "npm:zod@3.23.8";

export function extractNumber(val: unknown): number {
  return Number(z.string().parse(val).replace(/[^\d.-]/g, ""));
}
