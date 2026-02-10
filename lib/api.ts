import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";
import { fetch } from "expo/fetch";

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("auth_token");
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const baseUrl = getApiUrl();
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(new URL(path, baseUrl).toString(), { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const baseUrl = getApiUrl();
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(new URL(path, baseUrl).toString(), {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const baseUrl = getApiUrl();
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(new URL(path, baseUrl).toString(), {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const baseUrl = getApiUrl();
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(new URL(path, baseUrl).toString(), {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function apiUpload<T = any>(path: string, fileUri: string, fileName: string, mimeType: string): Promise<T> {
  const baseUrl = getApiUrl();
  const token = await getToken();

  const { File } = await import("expo-file-system");
  const { fetch: expoFetch } = await import("expo/fetch");

  const file = new File(fileUri);
  const formData = new FormData();
  formData.append("file", file as any);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await expoFetch(new URL(path, baseUrl).toString(), {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}
