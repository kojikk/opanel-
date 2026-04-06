"use client";

import { useEffect, useState } from "react";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { UserContext, type UserContextData } from "@/contexts/user-context";

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);
  const [userData, setUserData] = useState<UserContextData | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useCheckAuth((user) => {
    setUserData(user);
  });

  if (!mounted || !userData) return <></>;

  return (
    <UserContext value={userData}>
      {children}
    </UserContext>
  );
}
