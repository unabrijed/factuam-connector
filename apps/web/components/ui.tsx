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
    accent: "border-[color:rgba(0,169,110,0.22)] bg-[var(--accent-faint)] text-[var(--accent)]",
    success: "border-[color:rgba(0,169,110,0.22)] bg-[var(--accent-faint)] text-[var(--success)]",
    warning: "border-[color:rgba(217,139,0,0.22)] bg-[color:rgba(217,139,0,0.08)] text-[var(--warning)]",
    danger: "border-[color:rgba(229,78,78,0.22)] bg-[color:rgba(229,78,78,0.08)] text-[var(--danger)]"
  } as const;

  return <span className={clsx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,169,110,0.2)] transition hover:scale-[1.01] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        className
      )}
      {...props}
    />
  );
}

export function ThinkingIndicator({
  size = "sm",
  className
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const dotSize = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)} aria-label="Thinking">
      <span className={clsx("inline-block rounded-full bg-[var(--accent)] animate-thinking-pulse", dotSize)} style={{ animationDelay: "0s" }} />
      <span className={clsx("inline-block rounded-full bg-[var(--accent)] animate-thinking-pulse", dotSize)} style={{ animationDelay: "0.2s" }} />
      <span className={clsx("inline-block rounded-full bg-[var(--accent)] animate-thinking-pulse", dotSize)} style={{ animationDelay: "0.4s" }} />
    </span>
  );
}

export function ThinkingBlock({
  title,
  body,
  active = false,
  defaultOpen = false
}: {
  title: string;
  body: string | null;
  active?: boolean;
  defaultOpen?: boolean;
}) {
  const open = defaultOpen || active;
  return (
    <details
      className={clsx(
        "thinking-block group rounded-[20px] border border-[var(--border)] bg-[var(--accent-faint)] text-sm animate-thinking-fade",
        active ? "border-[color:rgba(0,169,110,0.28)]" : ""
      )}
      open={open}
    >
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 select-none">
        <span className="text-sm text-[var(--text-soft)]">{title}</span>
        {active ? <ThinkingIndicator /> : null}
      </summary>
      {body ? (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-sm leading-6 text-[var(--text-soft)]">{body}</p>
        </div>
      ) : null}
    </details>
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
