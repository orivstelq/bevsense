import type { ReactNode } from "react";

import type { DemoPersona } from "@/config/demo-personas";
import type { OrganizationContext } from "@/types/organization-context";

import { MobileNavigation } from "./mobile-navigation";
import { SidebarNavigation } from "./sidebar-navigation";
import { TopHeader } from "./top-header";

type ApplicationShellProps = {
  children: ReactNode;
  context: OrganizationContext;
  persona: DemoPersona;
};

export function ApplicationShell({
  children,
  context,
  persona,
}: ApplicationShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <SidebarNavigation
        locationId={context.location.id}
        persona={persona}
      />

      <div className="min-w-0">
        <TopHeader context={context} persona={persona} />
        <MobileNavigation
          locationId={context.location.id}
          persona={persona}
        />

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
