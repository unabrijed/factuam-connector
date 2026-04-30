import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "Factum — AI agents should prove what they tested",
  description:
    "Factum turns prompts into evidence plans, runs experiments and backtests, and returns verified answers with proof receipts."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <body>
        <Providers>
          <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[-12rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(87,181,255,0.24),_rgba(87,181,255,0)_70%)]" />
              <div className="absolute right-[-10rem] top-[8rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(126,91,255,0.18),_rgba(126,91,255,0)_70%)]" />
              <div className="absolute bottom-[-14rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(56,255,210,0.12),_rgba(56,255,210,0)_72%)]" />
            </div>
            <div className="relative">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
