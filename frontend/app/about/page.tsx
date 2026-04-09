"use client";

import {
  AtSign,
  BookText,
  Bot,
  ChevronLeft,
  FileText,
  GitFork,
  Github,
  Milestone,
  ThumbsUp
} from "lucide-react";
import Link from "next/link";
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
  TableRow
} from "@/components/ui/table";
import { copyrightInfo, version } from "@/lib/global";
import { cn } from "@/lib/utils";
import { minecraftAE } from "@/lib/fonts";
import { Brand } from "@/components/logo";
import { $ } from "@/lib/i18n";

const REPO_URL = "https://github.com/kojikk/fleetpanel";
const UPSTREAM_URL = "https://github.com/opanel-mc/opanel";

const info = [
  {
    name: $("about.info.version"),
    value: version,
    icon: Milestone
  },
  {
    name: $("about.info.author"),
    value: <a href="https://github.com/kojikk" target="_blank" rel="noopener noreferrer">kojikk</a>,
    icon: AtSign
  },
  {
    name: $("about.info.source"),
    value: <a href={REPO_URL} target="_blank" rel="noopener noreferrer">kojikk/fleetpanel</a>,
    icon: Github
  },
  {
    name: $("about.info.upstream"),
    value: <a href={UPSTREAM_URL} target="_blank" rel="noopener noreferrer">opanel-mc/opanel</a>,
    icon: GitFork
  },
  {
    name: $("about.info.license"),
    value: <a href="https://www.mozilla.org/en-US/MPL/2.0/" target="_blank" rel="noopener noreferrer">MPL-2.0</a>,
    icon: FileText
  },
  {
    name: $("about.info.built-with"),
    value: $("about.info.built-with.value"),
    icon: Bot
  }
];

export default function About() {
  return (
    <Card className="w-3xl max-md:rounded-none">
      <CardHeader>
        <CardTitle>{$("about.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Brand className="w-fit mx-auto my-10 [&_svg]:w-72"/>
        <p>
          <span className={cn("text-theme font-semibold", minecraftAE.className)}>FleetPanel</span> {$("about.description")}
        </p>
        <p className="text-sm text-muted-foreground">
          {$("about.fork-notice")}
        </p>
        <Table>
          <TableBody>
            {info.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="flex items-center gap-2">
                  <item.icon size={17}/>
                  <span>{item.name}</span>
                </TableCell>
                <TableCell className="text-right [&_a]:underline [&_a]:underline-offset-2">
                  {item.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-center text-lg font-bold">{$("about.thanks")}</p>
        <p className="text-center text-sm text-muted-foreground">{copyrightInfo}</p>
      </CardContent>
      <CardFooter className="flex">
        <Button
          className="mr-auto cursor-pointer"
          variant="link"
          asChild>
          <Link href="/">
            <ChevronLeft />
            {$("about.footer.back")}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={$("about.footer.github")}
          asChild>
          <Link href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Github />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={$("about.footer.upstream")}
          asChild>
          <Link href={UPSTREAM_URL} target="_blank" rel="noopener noreferrer">
            <GitFork />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={$("about.footer.readme")}
          asChild>
          <Link href={`${REPO_URL}#readme`} target="_blank" rel="noopener noreferrer">
            <BookText />
          </Link>
        </Button>
        <Button
          variant="outline"
          className="ml-2"
          asChild>
          <Link href="/about/thanks">
            <ThumbsUp />
            {$("about.thanks-list")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
