"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

export function SubPage({
  children,
  title,
  subTitle,
  description,
  category,
  icon,
  outerClassName,
  pageClassName,
  className,
  hideNavbar,
  ...props
}: Readonly<React.ComponentProps<"div"> & {
  children?: React.ReactNode
  title: string
  subTitle?: string
  description?: string
  category?: string
  icon?: React.ReactNode
  outerClassName?: string
  pageClassName?: string
  className?: string
  hideNavbar?: boolean
}>) {
  useEffect(() => {
    document.title = `OPanel - ${subTitle ?? title}`;
  }, [title, subTitle]);

  return (
    <div className={cn("group bg-sidebar flex-1 flex flex-col overflow-hidden", !hideNavbar && "max-h-screen", outerClassName)}>
      {!hideNavbar && <Navbar className="px-8 max-sm:px-2"/>}
      <div className={cn("flex-1 p-8 flex flex-col gap-4 overflow-y-auto", !description && "gap-8", pageClassName)}>
        <div className="space-y-4">
          {category && (
            <Breadcrumb className="mb-3">
              <BreadcrumbList>
                <BreadcrumbItem>{category}</BreadcrumbItem>
                {subTitle && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <div className="flex items-center gap-5">
            {icon}
            <h1 className="text-3xl font-bold">{subTitle ?? title}</h1>
          </div>
          {description && <span className="text-muted-foreground">{description}</span>}
        </div>
        <div className={className} {...props}>
          {children}
        </div>
      </div>
    </div>
  );
}
