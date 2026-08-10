export type DemoLanguage = "en" | "es";

const translations = {
  en: {
    navigation: {
      overview: "Overview",
      inventory: "Inventory",
      alerts: "Alerts",
      devices: "Devices",
      analytics: "Analytics",
      settings: "Settings",
    },
    location: "Location",
    persona: "Persona",
    rack: "Rack",
    position: "Position",
    positions: "positions",
    product: "Product",
    remaining: "Remaining",
    latestReading: "Latest reading",
    controller: "Controller",
    healthy: "Healthy",
    monitor: "Monitor",
    low: "Low",
    replace: "Replace",
    assignedBibs: "Assigned BiBs",
    configuredPositions: "Configured positions",
    unassignedPositions: "Unassigned positions",
    inventoryDescription:
      "Current BiB assignments and derived product levels by rack.",
    rackInventory: "Rack inventory",
    alertsDescription: "BiB positions requiring replacement now.",
    allGood: "All good",
    noReplacements: "No replacements needed right now.",
    aboveThreshold:
      "All monitored BiBs at this location are above the replacement threshold.",
    overviewDescription: "Current beverage inventory readiness for this location.",
    settingsDescription: "Presentation preferences for the current demo session.",
    language: "Language",
    english: "English",
    spanish: "Español",
    assignedDiningCenter: "Assigned dining center",
    assignmentHelp:
      "Presentation assignment only. This does not change access permissions.",
    locationFromHeader: "Change the active dining center from the header.",
    presentationMode: "Presentation mode | Sign-in not required",
  },
  es: {
    navigation: {
      overview: "Resumen",
      inventory: "Inventario",
      alerts: "Alertas",
      devices: "Dispositivos",
      analytics: "Análisis",
      settings: "Configuración",
    },
    location: "Ubicación",
    persona: "Perfil",
    rack: "Estante",
    position: "Posición",
    positions: "posiciones",
    product: "Producto",
    remaining: "Restante",
    latestReading: "Lectura más reciente",
    controller: "Controlador",
    healthy: "Saludable",
    monitor: "Supervisar",
    low: "Bajo",
    replace: "Reemplazar",
    assignedBibs: "BiB asignados",
    configuredPositions: "Posiciones configuradas",
    unassignedPositions: "Posiciones sin asignar",
    inventoryDescription:
      "Asignaciones actuales de BiB y niveles calculados por estante.",
    rackInventory: "Inventario por estante",
    alertsDescription: "Posiciones de BiB que requieren reemplazo ahora.",
    allGood: "Todo bien",
    noReplacements: "No se necesitan reemplazos ahora.",
    aboveThreshold:
      "Todos los BiB monitoreados en esta ubicación superan el umbral de reemplazo.",
    overviewDescription:
      "Estado actual del inventario de bebidas para esta ubicación.",
    settingsDescription:
      "Preferencias de presentación para la sesión de demostración actual.",
    language: "Idioma",
    english: "English",
    spanish: "Español",
    assignedDiningCenter: "Comedor asignado",
    assignmentHelp:
      "Asignación de presentación solamente. Esto no cambia los permisos de acceso.",
    locationFromHeader: "Cambie el comedor activo desde el encabezado.",
    presentationMode: "Modo de presentación | No se requiere iniciar sesión",
  },
} as const;

export function isDemoLanguage(value: string): value is DemoLanguage {
  return value === "en" || value === "es";
}

export function getDemoTranslations(language: DemoLanguage) {
  return translations[language];
}
