import type { NavigationHref } from "./navigation";

export type DemoPersonaId =
  | "utility-worker"
  | "supervisor-manager"
  | "organization-admin"
  | "technician";

export type DemoPersona = Readonly<{
  id: DemoPersonaId;
  label: string;
  visiblePageHrefs: readonly NavigationHref[];
  overview: {
    summary: string;
    focusItems: readonly string[];
    note?: string;
  };
}>;

export const demoPersonas = [
  {
    id: "utility-worker",
    label: "Utility Worker",
    visiblePageHrefs: ["/", "/inventory", "/alerts"],
    overview: {
      summary:
        "Focus on current BiB replacement readiness, low inventory findings, and immediate operating conditions.",
      focusItems: [
        "Current inventory assignments",
        "Low inventory findings",
        "Immediate operating conditions",
      ],
    },
  },
  {
    id: "supervisor-manager",
    label: "Supervisor / Manager",
    visiblePageHrefs: [
      "/",
      "/inventory",
      "/alerts",
      "/devices",
      "/analytics",
    ],
    overview: {
      summary:
        "Focus on location-wide inventory, alert findings, devices, and current snapshot analytics.",
      focusItems: [
        "Location inventory",
        "Current alert findings",
        "Device topology",
        "Current snapshot analytics",
      ],
    },
  },
  {
    id: "organization-admin",
    label: "Organization Admin",
    visiblePageHrefs: [
      "/",
      "/inventory",
      "/alerts",
      "/devices",
      "/analytics",
    ],
    overview: {
      summary:
        "Focus on the selected location's operating context across inventory, alerts, devices, and analytics.",
      focusItems: [
        "Selected location context",
        "Inventory and alert visibility",
        "Device and analytics visibility",
      ],
      note: "Organization-wide administration is not implemented in this demo phase.",
    },
  },
  {
    id: "technician",
    label: "Technician",
    visiblePageHrefs: ["/", "/inventory", "/alerts", "/devices"],
    overview: {
      summary:
        "Focus on controllers, sensor trays, telemetry availability, and hardware-related findings.",
      focusItems: [
        "Controller state",
        "Sensor tray topology",
        "Telemetry availability",
        "Hardware-related findings",
      ],
    },
  },
] as const satisfies readonly DemoPersona[];

export const defaultDemoPersona = demoPersonas[1];

export function findDemoPersona(personaId: string) {
  return demoPersonas.find((persona) => persona.id === personaId) ?? null;
}

export function getDemoPersonaDestination(
  persona: DemoPersona,
  pathname: string,
) {
  return persona.visiblePageHrefs.some((href) => href === pathname)
    ? pathname
    : "/";
}
