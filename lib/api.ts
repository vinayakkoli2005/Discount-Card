const API_BASE_URL = "https://discount-card-api.onrender.com";
const STORES_ENDPOINT = `${API_BASE_URL}/stores/`;
type FetchStoresParams = {
  limit?: number;
  offset?: number;
  query?: string;
  category?: string;
};

export async function fetchStores({
  limit = 10,
  offset = 0,
  query,
  category,
}: FetchStoresParams) {
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
  return json.data;
}

export async function fetchMyStores(ownerId: string) {
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
  return json.data;
}
