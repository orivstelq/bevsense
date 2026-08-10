export const navigationItems = [
  { label: "Overview", translationKey: "overview", href: "/", available: true },
  {
    label: "Inventory",
    translationKey: "inventory",
    href: "/inventory",
    available: true,
  },
  { label: "Alerts", translationKey: "alerts", href: "/alerts", available: true },
  { label: "Devices", translationKey: "devices", href: "/devices", available: true },
  {
    label: "Analytics",
    translationKey: "analytics",
    href: "/analytics",
    available: true,
  },
  { label: "Settings", translationKey: "settings", href: "/settings", available: true },
] as const;

export type NavigationHref = (typeof navigationItems)[number]["href"];
