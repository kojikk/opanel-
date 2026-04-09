"use client";

import { Lock } from "lucide-react";

export function NoAccess({ message }: { message?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <Lock className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">No access</h2>
      <p className="text-muted-foreground max-w-md">
        {message ?? "You don't have permission to view this section. Contact an administrator to request access."}
      </p>
    </div>
  );
}
