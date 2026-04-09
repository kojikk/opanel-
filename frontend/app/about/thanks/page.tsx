"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { minecraftAE } from "@/lib/fonts";
import { $ } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Text } from "@/components/i18n-text";

const thanksList = [
  {
    name: "OPanel",
    author: "Norcleeh",
    repo: "opanel-mc/opanel"
  },
  {
    name: "Next.js",
    author: "Vercel",
    repo: "vercel/next.js"
  },
  {
    name: "Prisma",
    author: "Prisma",
    repo: "prisma/prisma"
  },
  {
    name: "Shadcn UI",
    author: "shadcn",
    repo: "shadcn/ui"
  },
  {
    name: "Lucide Icons",
    author: "Lucide Contributors",
    repo: "lucide-icons/lucide"
  },
  {
    name: "Javalin",
    author: "David Åse",
    repo: "javalin/javalin"
  },
  {
    name: "Item-NBT-API",
    author: "tr7zw",
    repo: "tr7zw/Item-NBT-API"
  },
  {
    name: "minecraft-textures",
    author: "destruc7i0n",
    repo: "destruc7i0n/minecraft-textures"
  },
  {
    name: "minecraft-skin-viewer",
    author: "James Harrison",
    repo: "MinecraftCapes/minecraft-skin-viewer"
  },
  {
    name: "snbt-js",
    author: "myworldzycpc",
    repo: "myworldzycpc/snbt-js"
  },
  {
    name: "ansi-to-html",
    author: "Rob Burns",
    repo: "rburns/ansi-to-html"
  },
  {
    name: "dockerode",
    author: "Apocas",
    repo: "apocas/dockerode"
  }
];

export default function Thanks() {
  return (
    <Card className="min-w-0 max-md:rounded-none">
      <CardHeader>
        <CardTitle>{$("about.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Text
          id="about.thanks-list.intro"
          args={[
            <span className={cn("text-theme font-semibold", minecraftAE.className)} key={0}>FleetPanel</span>
          ]}/>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{$("about.thanks-list.columns.name")}</TableHead>
              <TableHead>{$("about.thanks-list.columns.author")}</TableHead>
              <TableHead className="text-right">{$("about.thanks-list.columns.repo")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {thanksList.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold">
                  {item.name}
                </TableCell>
                <TableCell>
                  {item.author}
                </TableCell>
                <TableCell className="text-right [&_a]:underline [&_a]:underline-offset-2">
                  <a href={`https://github.com/${item.repo}`} target="_blank" rel="noopener noreferrer">
                    {item.repo}
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-right text-sm text-muted-foreground italic">
          {$("about.thanks-list.footer")}
        </p>
        <h2 className="text-lg font-semibold">{$("about.thanks-list.special")}</h2>
        <div className="space-y-3 text-sm leading-6">
          <p>
            <b>OPanel</b> {$("about.thanks-list.special.opanel")}
          </p>
          <p>
            <b>Claude</b> {$("about.thanks-list.special.claude")}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex">
        <Button
          className="mr-auto cursor-pointer"
          variant="link"
          asChild>
          <Link href="/about">
            <ChevronLeft />
            {$("about.footer.back")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
