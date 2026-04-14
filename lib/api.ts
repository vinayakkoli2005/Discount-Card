import { Store } from "./types/store";

const API_BASE_URL = "https://discount-card-api.onrender.com";
const STORES_ENDPOINT = `${API_BASE_URL}/stores/`;
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
  ownerId: string;
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

  if (query) {
    url.searchParams.set("query", query);
  }
  if (category && category !== "All") {
    url.searchParams.set("category", category);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text(); // 🔥 makes debugging easier
    console.error("API error:", text);
    throw new Error("Failed to fetch stores");
  }

  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchMyStores(ownerId: string): Promise<Store[]> {
  const url = new URL(`${STORES_ENDPOINT}my`);
  url.searchParams.set("ownerId", ownerId);

  const res = await fetch(url.toString());

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("MY_STORES_ROUTE_NOT_FOUND");
    }
    const text = await res.text();
    console.error("API error:", text);
    throw new Error("Failed to fetch my stores");
  }

  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function fetchStoreById(id: string): Promise<Store | null> {
  const res = await fetch(`${STORES_ENDPOINT}${id}`);

  if (!res.ok) {
    const text = await res.text();
    console.error("API error:", text);
    throw new Error("Failed to fetch store");
  }

  const json = await res.json();
  return json?.data ?? null;
}

export async function deleteStore(storeId: string, ownerId: string): Promise<boolean> {
  const url = new URL(`${STORES_ENDPOINT}${storeId}`);
  url.searchParams.set("ownerId", ownerId);
  const res = await fetch(url.toString(), { method: "DELETE" });
  return res.ok;
}

export async function createStore(data: CreateStoreParams): Promise<string | null> {
  const res = await fetch(STORES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
