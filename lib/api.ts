const API_BASE_URL = "http://YOUR_SERVER_IP:8000";

export async function fetchStores({ limit = 10, offset = 0 }) {
  const res = await fetch(
    `${API_BASE_URL}/stores?limit=${limit}&offset=${offset}`
  );
  const json = await res.json();
  return json.data;
}
