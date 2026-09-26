import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { parseInput } from "@/lib/validation";
import {
  bootstrapOwnerUserId,
  validateFirmBootstrapInput,
  type FirmBootstrapInput,
} from "./bootstrap";
import { executeFirmBootstrap } from "./bootstrap-core";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const firmBootstrapInputSchema = z.object({
  firmName: z.string(),
  legalName: z.string().optional(),
  slug: z.string(),
  timezone: z.string().optional(),
  currencyCode: z.string().optional(),
  ownerDisplayName: z.string().optional(),
});

export const bootstrapFirm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseInput(firmBootstrapInputSchema))
  .handler(async ({ context, data }) => {
    const ownerUserId = bootstrapOwnerUserId(context.userId);
    const input: FirmBootstrapInput = {
      firmName: data.firmName.trim(),
      legalName: data.legalName?.trim() || undefined,
      slug: slugify(data.slug),
      timezone: data.timezone?.trim() || "Asia/Kolkata",
      currencyCode: data.currencyCode?.trim().toUpperCase() || "INR",
      ownerDisplayName: data.ownerDisplayName?.trim() || undefined,
    };

    validateFirmBootstrapInput(input);

    const sql = await getSql();
    return executeFirmBootstrap(sql, ownerUserId, input);
  });
