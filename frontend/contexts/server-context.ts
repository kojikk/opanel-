"use client";

import { createContext } from "react";

export interface ServerContextData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  mcVersion: string;
  gamePort: number;
  rconPort: number;
  pluginPort: number;
  memory: string;
  javaVersion: string;
  autoStart: boolean;
  pluginInstalled: boolean;
  status: string;
}

export const ServerContext = createContext<ServerContextData | null>(null);
