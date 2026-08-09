import type { LocationTelemetrySnapshot } from "@/types/domain";

import { ControllerCard, SensorTrayList } from "./controller-card";
import { DevicesSummary } from "./devices-summary";

type DevicesProps = {
  snapshot: LocationTelemetrySnapshot;
};

export function Devices({ snapshot }: DevicesProps) {
  const readyTrayCount = snapshot.sensorTrays.filter(
    (tray) => tray.status === "ready",
  ).length;
  const unresolvedTrays = snapshot.sensorTrays.filter(
    (tray) =>
      !snapshot.controllers.some(
        (controller) =>
          controller.organizationId === tray.organizationId &&
          controller.locationId === tray.locationId &&
          controller.id === tray.controllerId,
      ),
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="devices-title">
        <p className="text-sm font-medium text-slate-500">Operations</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="devices-title"
        >
          Devices
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Simulated controller and sensor tray topology for this location.
        </p>
      </section>

      <aside className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold tracking-[0.08em] text-amber-950">
          DETERMINISTIC SIMULATION DATA
        </h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Controller and tray states are fixed demo fixtures. No physical
          controller is connected, and these statuses do not represent live
          hardware health.
        </p>
      </aside>

      <DevicesSummary
        attentionTrayCount={snapshot.sensorTrays.length - readyTrayCount}
        controllerCount={snapshot.controllers.length}
        readyTrayCount={readyTrayCount}
        trayCount={snapshot.sensorTrays.length}
      />

      <section aria-labelledby="controller-topology-title">
        <div className="mb-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="controller-topology-title"
          >
            Controller topology
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Sensor trays are grouped by their configured controller reference.
          </p>
        </div>

        {snapshot.controllers.length > 0 ? (
          <div className="space-y-4">
            {snapshot.controllers.map((controller) => {
              const trays = snapshot.sensorTrays.filter(
                (tray) =>
                  tray.organizationId === controller.organizationId &&
                  tray.locationId === controller.locationId &&
                  tray.controllerId === controller.id,
              );

              return (
                <ControllerCard
                  controller={controller}
                  inventoryItems={snapshot.inventoryItems}
                  key={controller.id}
                  trays={trays}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No simulated controllers are configured for this location.
          </div>
        )}
      </section>

      {unresolvedTrays.length > 0 && (
        <section aria-labelledby="unresolved-trays-title">
          <div className="overflow-hidden rounded-md border border-amber-300 bg-white shadow-sm">
            <div className="bg-amber-50 px-4 py-4 sm:px-5">
              <h2
                className="text-base font-semibold text-amber-950"
                id="unresolved-trays-title"
              >
                Unresolved controller relationships
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                These trays reference a controller that is unavailable in this
                location snapshot.
              </p>
            </div>
            <SensorTrayList
              controllerName={null}
              inventoryItems={snapshot.inventoryItems}
              trays={unresolvedTrays}
            />
          </div>
        </section>
      )}
    </div>
  );
}
