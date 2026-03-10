"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, XCircle, Server } from "lucide-react";
import { sendGetRequest } from "@/lib/api-client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProvisioningStatus {
  step: "queued" | "pulling" | "creating" | "starting" | "ready" | "error";
  progress: number;
  message: string;
  error?: string;
}

const STEPS = [
  { key: "pulling", label: "Pulling Docker image" },
  { key: "creating", label: "Creating container" },
  { key: "starting", label: "Starting server" },
  { key: "ready", label: "Server is ready" },
] as const;

const stepOrder = ["queued", "pulling", "creating", "starting", "ready"] as const;

function getStepIndex(step: string) {
  return stepOrder.indexOf(step as typeof stepOrder[number]);
}

export default function SetupPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<ProvisioningStatus>({
    step: "queued",
    progress: 0,
    message: "Connecting...",
  });

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const data = await sendGetRequest<ProvisioningStatus>(
          `/api/servers/${serverId}/provision`
        );
        if (!active) return;
        setStatus(data);

        if (data.step === "ready") {
          setTimeout(() => {
            if (active) router.replace(`/panel/${serverId}/dashboard`);
          }, 1500);
          return;
        }

        if (data.step === "error") return;
      } catch {
        // keep polling
      }

      if (active) setTimeout(poll, 1500);
    };

    poll();
    return () => { active = false; };
  }, [serverId, router]);

  const currentStepIdx = getStepIndex(status.step);
  const isError = status.step === "error";

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Server className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Setting up your server</h1>
            <p className="text-sm text-muted-foreground">{status.message}</p>
          </div>
        </div>

        <Progress value={status.progress} className="h-3" />

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const stepIdx = getStepIndex(s.key);
            const isDone = currentStepIdx > stepIdx;
            const isCurrent = status.step === s.key;
            const isCurrentError = isError && i === Math.max(0, currentStepIdx);

            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center gap-3 text-sm py-1.5 transition-opacity",
                  !isDone && !isCurrent && !isCurrentError && "opacity-40"
                )}
              >
                {isCurrentError ? (
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                ) : isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                )}
                <span className={cn(
                  "font-medium",
                  isDone && "text-green-600",
                  isCurrentError && "text-destructive"
                )}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {isError && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
              {status.error || "An unknown error occurred"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/panel")}>
                Back to servers
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
