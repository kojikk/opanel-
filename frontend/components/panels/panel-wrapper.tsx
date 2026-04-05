"use client";

import type { LucideIcon } from "lucide-react";
import { GripVertical, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PanelWrapperProps {
  title: string;
  icon: LucideIcon;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}

export function PanelWrapper({
  title,
  icon: Icon,
  removable = true,
  onRemove,
  className,
  innerClassName,
  children,
}: PanelWrapperProps) {
  return (
    <Card
      className={cn(
        "!p-0 flex flex-col rounded-xl overflow-hidden h-full",
        className
      )}
    >
      <div className="panel-drag-handle flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing border-b border-glass-border/50 shrink-0 select-none">
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1 truncate">{title}</span>
        {removable && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className={cn("flex-1 min-h-0 overflow-auto", innerClassName)}>
        {children}
      </div>
    </Card>
  );
}
