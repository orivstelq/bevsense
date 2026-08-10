import "server-only";

const hardwareConnectionsEnvironmentVariable =
  "BIB_HARDWARE_CONNECTIONS_ENABLED";

export function getHardwareConnectionsEnabled() {
  const configuredValue =
    process.env[hardwareConnectionsEnvironmentVariable] ?? "false";

  if (configuredValue === "true") {
    return true;
  }
  if (configuredValue === "false") {
    return false;
  }

  throw new Error(
    `${hardwareConnectionsEnvironmentVariable} must be either true or false.`,
  );
}
