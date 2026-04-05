import type { Metadata } from "next";
import "@/style/globals.css";
import "@/style/formatting-codes.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { googleSansCode, notoColorEmoji, notoSansSC } from "@/lib/fonts";
import { BrowserInit } from "./browser-init";

import LogoIcon from "@/assets/images/logo.png";

export const metadata: Metadata = {
  authors: [{ name: "Norcleeh", url: "https://nocp.space" }],
  icons: LogoIcon.src
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-cn" suppressHydrationWarning>
      <body
        className={cn(notoSansSC.className, notoColorEmoji.variable, googleSansCode.variable, "antialiased overflow-hidden bg-background")}>
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50/40 via-background to-amber-50/30 dark:from-blue-950/20 dark:via-background dark:to-purple-950/15" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange>
          <Toaster
            position="bottom-right"
            expand
            richColors/>
          {children}
        </ThemeProvider>
        <BrowserInit />
      </body>
    </html>
  );
}
