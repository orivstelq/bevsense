import "server-only";

import { simulatedTelemetryProvider } from "./simulated-provider";
import {
  TelemetryProviderError,
  type TelemetryProviderErrorCode,
} from "./api-contract";
import { HttpTelemetryProvider } from "./http-provider";
import type { TelemetryProvider } from "./provider";

const defaultApiBaseUrl = "http://127.0.0.1:8000";

function readApiBaseUrl() {
  const configuredValue = process.env.BIB_API_BASE_URL ?? defaultApiBaseUrl;
  let url: URL;

  try {
    url = new URL(configuredValue);
  } catch {
    throw new TelemetryProviderError(
      "configuration",
      "BIB_API_BASE_URL must be a valid URL.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TelemetryProviderError(
      "configuration",
      "BIB_API_BASE_URL must use HTTP or HTTPS.",
    );
  }

  return url.toString();
}

export function getTelemetryProvider(): TelemetryProvider {
  const configuredProvider = process.env.BIB_TELEMETRY_PROVIDER ?? "http";

  if (configuredProvider === "http") {
    return new HttpTelemetryProvider(readApiBaseUrl());
  }
  if (configuredProvider === "simulated") {
    return simulatedTelemetryProvider;
  }

  throw new TelemetryProviderError(
    "configuration",
    "BIB_TELEMETRY_PROVIDER must be either http or simulated.",
  );
}

export type TelemetryLoadFailureReason = Exclude<
  TelemetryProviderErrorCode,
  "configuration"
>;
