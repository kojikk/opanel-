import axios, { type AxiosError } from "axios";
import { toast } from "sonner";

export function getApiUrl() {
  if (typeof window === "undefined") return "";
  return "";
}

export function toastError(e: AxiosError, message: string, descriptions: [number, string][]) {
  if (e.status === 401 && window.location.pathname !== "/login") {
    window.location.href = "/login";
    return;
  }

  for (const [status, description] of descriptions) {
    if (e.status === status) {
      toast.error(message, { description });
      return;
    }
  }
  toast.error(message, { description: e.message });
}

function apiBase() {
  return getApiUrl();
}

export async function sendGetRequest<R>(route: string): Promise<R> {
  return (await axios.get(`${apiBase()}${route}`, { withCredentials: true })).data;
}

export async function sendPostRequest<R>(route: string, body?: unknown): Promise<R> {
  return (await axios.post(`${apiBase()}${route}`, body, { withCredentials: true })).data;
}

export async function sendPatchRequest<R>(route: string, body?: unknown): Promise<R> {
  return (await axios.patch(`${apiBase()}${route}`, body, { withCredentials: true })).data;
}

export async function sendDeleteRequest<R>(route: string, body?: unknown): Promise<R> {
  return (await axios.delete(`${apiBase()}${route}`, { data: body, withCredentials: true })).data;
}

export async function uploadFile(route: string, file: File, onProgress?: (progress: number) => void): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);

  return (await axios.post(`${apiBase()}${route}`, formData, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(e.progress ?? 0),
  })).data;
}

export async function checkAuth(): Promise<{ id: string; username: string; role: string } | null> {
  try {
    return await sendPostRequest("/api/auth", { action: "check" });
  } catch {
    return null;
  }
}

export async function login(username: string, password: string) {
  return sendPostRequest<{ id: string; username: string; role: string }>("/api/auth", { action: "login", username, password });
}

export async function register(username: string, password: string, confirmPassword: string) {
  return sendPostRequest<{ id: string; username: string; role: string }>("/api/auth", {
    action: "register", username, password, confirmPassword,
  });
}

export async function logout(): Promise<boolean> {
  try {
    await sendPostRequest("/api/auth", { action: "logout" });
    return true;
  } catch {
    return false;
  }
}

export function serverApi(serverId: string) {
  const base = `/api/servers/${serverId}`;
  return {
    info: () => sendGetRequest(`${base}`),
    control: {
      getFile: (file: string) => sendGetRequest(`${base}/control?file=${file}`),
      setFile: (file: string, content: string) => sendPostRequest(`${base}/control`, { file, content }),
    },
    players: {
      list: () => sendGetRequest<{ online: number; max: number; players: string[] }>(`${base}/players`),
      action: (action: string, player: string, extra?: Record<string, string>) =>
        sendPostRequest(`${base}/players`, { action, player, ...extra }),
    },
    plugins: {
      list: () => sendGetRequest<{ name: string; fileName: string; size: number; enabled: boolean }[]>(`${base}/plugins`),
      upload: (file: File, onProgress?: (p: number) => void) => uploadFile(`${base}/plugins`, file, onProgress),
      toggle: (fileName: string, enabled: boolean) =>
        sendPostRequest(`${base}/plugins?action=toggle`, { fileName, enabled }),
      remove: (fileName: string) => sendDeleteRequest(`${base}/plugins`, { fileName }),
    },
    saves: {
      list: () => sendGetRequest<{ name: string; size: number }[]>(`${base}/saves`),
      remove: (saveName: string) => sendDeleteRequest(`${base}/saves`, { saveName }),
    },
    logs: {
      list: () => sendGetRequest<{ name: string; size: number }[]>(`${base}/logs`),
      get: (fileName: string) => sendGetRequest<{ content: string }>(`${base}/logs?file=${fileName}`),
      remove: (fileName?: string) => sendDeleteRequest(`${base}/logs${fileName ? `?file=${fileName}` : ""}`),
    },
    gamerules: {
      get: () => sendGetRequest(`${base}/gamerules`),
      set: (rules: Record<string, unknown>) => sendPostRequest(`${base}/gamerules`, rules),
    },
    monitor: () => sendGetRequest<{
      cpu: number; memory: number; memoryLimit: number; memoryPercent: number;
      tps: number; mspt: number; isPaused: boolean;
    }>(`${base}/monitor`),
    metrics: (range: "1h" | "24h" | "7d" | "30d") =>
      sendGetRequest<{
        range: string;
        points: { t: number; cpu: number; memory: number; tps: number; players: number }[];
      }>(`${base}/metrics?range=${range}`),
    terminal: {
      send: (command: string) => sendPostRequest<{ result: string }>(`${base}/terminal`, { command }),
    },
    tasks: {
      list: () => sendGetRequest(`${base}/tasks`),
      create: (data: { name: string; cron: string; commands: string[] }) => sendPostRequest(`${base}/tasks`, data),
      update: (data: { id: string; name?: string; cron?: string; commands?: string[]; enabled?: boolean }) =>
        sendPatchRequest(`${base}/tasks`, data),
      remove: (id: string) => sendDeleteRequest(`${base}/tasks`, { id }),
    },
    whitelist: {
      get: () => sendGetRequest(`${base}/whitelist`),
      action: (action: string, player?: string) => sendPostRequest(`${base}/whitelist`, { action, player }),
    },
    icon: {
      get: () => `${base}/icon`,
      upload: (file: File) => uploadFile(`${base}/icon`, file),
    },
    motd: {
      get: () => sendGetRequest<{ motd: string }>(`${base}/motd`),
      set: (motd: string) => sendPostRequest(`${base}/motd`, { motd }),
    },
    wsInfo: () => sendGetRequest<{
      pluginWsUrl: string;
      endpoints: { players: string; terminal: string; inventory: string };
    }>(`${base}/ws`),
  };
}
