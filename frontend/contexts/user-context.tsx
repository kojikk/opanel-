"use client";

import { createContext, useContext } from "react";

export interface UserContextData {
  id: string;
  username: string;
  role: string;
}

export const UserContext = createContext<UserContextData | null>(null);

export function useUser(): UserContextData | null {
  return useContext(UserContext);
}
