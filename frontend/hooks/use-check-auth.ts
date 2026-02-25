import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { checkAuth } from "@/lib/api-client";

export function useCheckAuth(success?: () => void) {
  const { push } = useRouter();

  useEffect(() => {
    checkAuth().then((res) => {
      if(!res && window.location.pathname !== "/login") {
        push("/login");
        return;
      }
      if(res) {
        success && success();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
