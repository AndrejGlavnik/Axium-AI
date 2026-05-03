import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

export function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  return client;
}

export function getAnalystModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}
