import { ApplicationShell } from "@/components/layout/application-shell";
import { demoContext } from "@/config/demo-context";
import { Overview } from "@/features/overview/overview";

export default function Home() {
  return (
    <ApplicationShell context={demoContext}>
      <Overview />
    </ApplicationShell>
  );
}
