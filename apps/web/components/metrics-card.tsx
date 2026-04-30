import { Card } from "./ui";

export function MetricsCard({ title, value, description }: { title: string; value: string; description?: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="text-3xl font-semibold text-[var(--text)]">{value}</p>
      {description ? <p className="text-xs text-[var(--text-soft)]">{description}</p> : null}
    </Card>
  );
}
