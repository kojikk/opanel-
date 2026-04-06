import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkAuth } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export function useCheckAuth(success?: (user: AuthUser) => void) {
  const { push } = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    checkAuth().then((res) => {
      if (!res && window.location.pathname !== "/login") {
        push("/login");
        return;
      }
      if (res) {
        setUser(res);
        success?.(res);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return user;
}
