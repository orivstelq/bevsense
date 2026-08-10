import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { Settings } from "@/features/settings/settings";
import { resolveDemoContextFromSearchParams } from "@/lib/demo-context";

export const metadata: Metadata = {
  title: "Settings | BevSense",
};

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { context, language, persona } =
    await resolveDemoContextFromSearchParams(searchParams, "/settings");

  return (
    <ApplicationShell context={context} language={language} persona={persona}>
      <Settings
        currentLocationId={context.location.id}
        language={language}
        persona={persona}
      />
    </ApplicationShell>
  );
}
