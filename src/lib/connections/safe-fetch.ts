import "server-only";

import dns from "node:dns/promises";
import net from "node:net";
import { ApiError } from "@/lib/api/errors";
import type { Connection } from "@/types/database";

type TestResult = {
  ok: boolean;
  status: number | null;
  statusText: string;
  contentType: string | null;
  responseTimeMs: number;
  notes: string;
};

export async function testHttpConnection(connection: Connection, secret: string | null): Promise<TestResult> {
  if (!connection.base_url) {
    return {
      ok: connection.auth_type === "none" || connection.has_credentials,
      status: null,
      statusText: "Not tested",
      contentType: null,
      responseTimeMs: 0,
      notes: "No base URL was provided, so Axium validated metadata only."
    };
  }

  const url = await validatePublicHttpsUrl(connection.base_url);
  const headers = buildAuthHeaders(connection, secret);
  const startedAt = Date.now();
  let response = await fetch(url, {
    method: "HEAD",
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(10000)
  }).catch(async () => {
    return fetch(url, {
      method: "GET",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10000)
    });
  });

  if (response.status === 405) {
    response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10000)
    });
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type"),
    responseTimeMs: Date.now() - startedAt,
    notes: response.ok
      ? "Live endpoint responded successfully."
      : "Live endpoint responded, but not with a success status. Check URL, credentials and provider permissions."
  };
}

async function validatePublicHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, "Connection base URL is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new ApiError(400, "Live connection tests require an https URL.");
  }

  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((address) => isPrivateAddress(address.address))) {
    throw new ApiError(400, "Connection URL must resolve to a public internet address.");
  }

  return url;
}

function buildAuthHeaders(connection: Connection, secret: string | null) {
  const headers = new Headers();
  headers.set("User-Agent", "Axium-Connection-Test/1.0");

  if (!secret) {
    return headers;
  }

  if (connection.auth_type === "api_key") {
    headers.set("X-API-Key", secret);
  }
  if (connection.auth_type === "bearer_token" || connection.auth_type === "oauth2") {
    headers.set("Authorization", `Bearer ${secret}`);
  }
  if (connection.auth_type === "basic") {
    headers.set("Authorization", `Basic ${Buffer.from(secret).toString("base64")}`);
  }

  return headers;
}

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
      parts[0] >= 224 ||
      parts[0] === 0
    );
  }

  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fec0:")
  );
}
