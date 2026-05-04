import { z } from "zod";
import {
  connectionAuthTypes,
  connectionProviders,
  connectionStatuses,
  connectionTypes,
  syncFrequencies
} from "@/lib/connections/constants";

const optionalText = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(4000).nullable().optional()
);

const optionalShortText = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(300).nullable().optional()
);

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string().min(1).max(160)).default([]));

const uuidArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return [];
}, z.array(z.string().uuid()).default([]));

export const connectionCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().trim().min(2).max(180),
  provider: z.enum(connectionProviders).default("API"),
  connection_type: z.enum(connectionTypes).default("api_key"),
  auth_type: z.enum(connectionAuthTypes).default("api_key"),
  status: z.enum(connectionStatuses).default("draft"),
  base_url: optionalShortText,
  account_identifier: optionalShortText,
  documentation_url: optionalShortText,
  description: optionalText,
  owner: optionalShortText,
  sync_frequency: z.enum(syncFrequencies).default("manual"),
  scopes: stringArray,
  linked_asset_ids: uuidArray,
  notes: optionalText,
  credential_label: optionalShortText,
  credential_value: z.string().max(12000).optional().nullable()
});

export const connectionUpdateSchema = connectionCreateSchema.omit({ workspace_id: true }).partial();

export const connectionTestSchema = z.object({
  workspace_id: z.string().uuid().optional()
});
