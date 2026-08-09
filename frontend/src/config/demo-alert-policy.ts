import type { AlertPolicy } from "@/types/alerts";

export const demoAlertPolicy = {
  name: "Demo alert policy",
  inventory: {
    criticalAtOrBelowPercentage: 10,
    warningAtOrBelowPercentage: 25,
  },
  controllerStatus: {
    online: null,
    offline: "critical",
    unknown: "warning",
  },
  trayStatus: {
    ready: null,
    offline: "critical",
    fault: "critical",
    unknown: "warning",
  },
} as const satisfies AlertPolicy;
