"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckAuth } from "@/hooks/use-check-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const user = useCheckAuth((u) => {
    if (u.role !== "OWNER" && u.role !== "ADMIN") {
      router.push("/panel");
    } else {
      setReady(true);
    }
  });

  if (!ready) return null;

  return <>{children}</>;
}
