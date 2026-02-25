"use client";

import { useEffect, useState } from "react";
import { useCheckAuth } from "@/hooks/use-check-auth";

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useCheckAuth();

  if (!mounted) return <></>;

  return <>{children}</>;
}
