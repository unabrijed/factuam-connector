import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("glass-card rounded-[28px] p-5 sm:p-6", className)}>{children}</div>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-6 text-[var(--text-soft)]">{subtitle}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  className
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    default: "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-soft)]",
    accent: "border-[color:rgba(120,210,255,0.28)] bg-[var(--accent-faint)] text-[var(--text)]",
    success: "border-[color:rgba(87,227,167,0.28)] bg-[color:rgba(87,227,167,0.12)] text-[var(--success)]",
    warning: "border-[color:rgba(255,210,111,0.28)] bg-[color:rgba(255,210,111,0.12)] text-[var(--warning)]",
    danger: "border-[color:rgba(255,141,161,0.28)] bg-[color:rgba(255,141,161,0.12)] text-[var(--danger)]"
  } as const;

  return <span className={clsx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_34px_rgba(87,181,255,0.24)] transition hover:scale-[1.01] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        className
      )}
      {...props}
    />
  );
}

export function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
