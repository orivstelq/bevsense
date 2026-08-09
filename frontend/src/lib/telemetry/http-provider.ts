import "server-only";

import type { LocationScope } from "@/types/domain";

import {
  parseTelemetryApiResponse,
  TelemetryProviderError,
} from "./api-contract";
import type { TelemetryProvider } from "./provider";

const requestTimeoutMilliseconds = 5_000;

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && error.name === "TimeoutError";
}

export class HttpTelemetryProvider implements TelemetryProvider {
  readonly dataSource = "simulated";

  constructor(
    private readonly apiBaseUrl: string,
    private readonly timeoutMilliseconds = requestTimeoutMilliseconds,
  ) {}

  async getSnapshot(scope: LocationScope) {
    const baseUrl = this.apiBaseUrl.endsWith("/")
      ? this.apiBaseUrl
      : `${this.apiBaseUrl}/`;
    const organizationId = encodeURIComponent(scope.organizationId);
    const locationId = encodeURIComponent(scope.locationId);
    const endpoint = new URL(
      `api/v1/organizations/${organizationId}/locations/${locationId}/snapshot`,
      baseUrl,
    );
    let response: Response;

    try {
      response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
    } catch (error) {
      throw new TelemetryProviderError(
        isTimeoutError(error) ? "timeout" : "backend-unavailable",
        isTimeoutError(error)
          ? "The telemetry request timed out."
          : "The telemetry API could not be reached.",
      );
    }

    if (response.status === 404) {
      throw new TelemetryProviderError(
        "snapshot-not-found",
        "The telemetry API has no snapshot for the requested location.",
      );
    }
    if (!response.ok) {
      throw new TelemetryProviderError(
        "http-error",
        `The telemetry API returned HTTP ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new TelemetryProviderError(
        "invalid-response",
        "The telemetry API returned invalid JSON.",
      );
    }

    return parseTelemetryApiResponse(payload, scope);
  }
}
