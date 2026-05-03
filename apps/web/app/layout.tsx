import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "factuam — AI agents should prove what they tested",
  description:
    "factuam turns prompts into evidence plans, runs experiments and backtests, and returns verified answers with proof receipts."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[-10rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(0,169,110,0.14),_rgba(0,169,110,0)_70%)]" />
              <div className="absolute right-[-8rem] top-[6rem] h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,_rgba(0,138,88,0.1),_rgba(0,138,88,0)_66%)]" />
              <div className="absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,_rgba(0,169,110,0.08),_rgba(0,169,110,0)_70%)]" />
            </div>
            <div className="relative">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
