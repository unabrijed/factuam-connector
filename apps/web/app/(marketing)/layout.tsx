import type { ReactNode } from "react";
import { MarketingNav } from "../../components/marketing/marketing-nav";

export const metadata = {
  title: "factuam — AI agents should prove what they tested",
  description:
    "factuam turns prompts into evidence plans, runs experiments and backtests, and returns verified answers with proof receipts."
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <MarketingNav />
      <main className="pb-12 pt-8">{children}</main>
    </div>
  );
}
