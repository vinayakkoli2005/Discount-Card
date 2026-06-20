import { Store } from "./types/store";
import { account } from "./appwrite";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://discount-card-api.onrender.com";
const STORES_ENDPOINT = `${API_BASE_URL}/stores/`;
const PRODUCTS_ENDPOINT = `${API_BASE_URL}/products/`;

const DEFAULT_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input as any, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const jwt = await account.createJWT();
  return { Authorization: `Bearer ${jwt.jwt}` };
}

export async function wakeBackend(): Promise<void> {
  try {
    await fetchWithTimeout(`${API_BASE_URL}/`, { method: "GET" }, 65_000);
  } catch {
  }
}

export type Product = {
  $id: string;
  store_id: string;
  owner_id: string;
  name: string;
  category: string;
  price?: number;
  description?: string;
  image_id?: string;
};

type FetchStoresParams = {
  limit?: number;
  offset?: number;
  query?: string;
  category?: string;
};

type CreateStoreParams = {
  name: string;
  category: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  phone?: string;
  images?: string[];
};

type UpdateStoreParams = {
  name?: string;
  category?: string;
  address?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  images?: string[];
};

export async function fetchStores({
  limit = 10,
  offset = 0,
  query,
  category,
}: FetchStoresParams): Promise<Store[]> {
  const url = new URL(STORES_ENDPOINT);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) url.searchParams.set("query", query);
  if (category && category !== "All") url.searchParams.set("category", category);

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    throw new Error("Failed to fetch stores");
  }
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchMyStores(): Promise<Store[]> {
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(`${STORES_ENDPOINT}my`, { headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error("MY_STORES_ROUTE_NOT_FOUND");
    const text = await res.text();
    console.error("API error:", text);
    throw new Error("Failed to fetch my stores");
  }
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchStoreById(id: string): Promise<Store | null> {
  const res = await fetchWithTimeout(`${STORES_ENDPOINT}${id}`);
  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    throw new Error("Failed to fetch store");
  }
  const json = await res.json();
  return json?.data ?? null;
}

export async function deleteStore(storeId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(`${STORES_ENDPOINT}${storeId}`, {
    method: "DELETE",
    headers,
  });
  return res.ok;
}

export async function updateStore(storeId: string, data: UpdateStoreParams): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithTimeout(`${STORES_ENDPOINT}${storeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
  }
  return res.ok;
}

export async function createStore(data: CreateStoreParams): Promise<string | null> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithTimeout(STORES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    return null;
  }
  const json = await res.json();
  return json?.data?.$id ?? json?.$id ?? null;
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function fetchProductsByStore(storeId: string): Promise<Product[]> {
  const url = new URL(PRODUCTS_ENDPOINT);
  url.searchParams.set("storeId", storeId);
  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

type CreateProductParams = {
  store_id: string;
  name: string;
  category: string;
  price?: number;
  description?: string;
  image_id?: string;
};

export async function createProduct(data: CreateProductParams): Promise<string | null> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithTimeout(PRODUCTS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    return null;
  }
  const json = await res.json();
  return json?.data?.$id ?? null;
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithTimeout(`${PRODUCTS_ENDPOINT}${productId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  return res.ok;
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export type Favorite = {
  $id: string;
  userId: string;
  storeId: string;
};

const FAVORITES_ENDPOINT = `${API_BASE_URL}/favorites/`;

export async function fetchFavorites(): Promise<Favorite[]> {
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(FAVORITES_ENDPOINT, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function addFavorite(storeId: string): Promise<Favorite | null> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithTimeout(FAVORITES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ storeId }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export async function removeFavorite(favoriteId: string): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithTimeout(`${FAVORITES_ENDPOINT}${favoriteId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  return res.ok;
}
