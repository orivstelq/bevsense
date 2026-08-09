"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TELEMETRY_REFRESH_INTERVAL_MS = 5_000;

export function TelemetryAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function stop() {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    }

    function start() {
      stop();
      if (document.visibilityState === "visible") {
        intervalId = setInterval(
          () => router.refresh(),
          TELEMETRY_REFRESH_INTERVAL_MS,
        );
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stop();
        return;
      }

      router.refresh();
      start();
    }

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return (
    <p className="whitespace-nowrap text-xs font-medium text-slate-500">
      Auto-refresh <span aria-hidden="true">·</span> 5s
    </p>
  );
}
