import "server-only";

import crypto from "node:crypto";
import { ApiError } from "@/lib/api/errors";

export type EncryptedSecret = {
  encrypted_payload: string;
  secret_iv: string;
  secret_tag: string;
  secret_hint: string | null;
};

export function encryptConnectionSecret(secret: string, hintSource?: string | null): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_payload: encrypted.toString("base64"),
    secret_iv: iv.toString("base64"),
    secret_tag: tag.toString("base64"),
    secret_hint: buildSecretHint(secret, hintSource)
  };
}

function getEncryptionKey() {
  const raw = process.env.CONNECTION_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new ApiError(500, "CONNECTION_ENCRYPTION_KEY must be set before storing connection credentials.");
  }

  return crypto.createHash("sha256").update(raw).digest();
}

function buildSecretHint(secret: string, hintSource?: string | null) {
  if (hintSource) {
    return hintSource.slice(0, 120);
  }
  if (secret.length <= 8) {
    return "Stored credential";
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
