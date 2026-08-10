"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DemoStartedNotice() {
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function dismiss() {
    setVisible(false);
    const query = new URLSearchParams(searchParams.toString());
    query.delete("started");
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg sm:left-auto sm:right-6 sm:mx-0"
      role="status"
    >
      <span className="font-medium">Presentation demo started</span>
      <button
        className="rounded-sm px-2 py-1 text-xs font-semibold text-slate-600 outline-none hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-amber-500"
        onClick={dismiss}
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}
