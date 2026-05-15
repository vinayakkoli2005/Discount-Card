import { Platform } from "react-native";
import { Store } from "./types/store";
import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";





export const config = {
  Platform: 'io.volo.app',
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  storeImagesBucketId: process.env.EXPO_PUBLIC_APPWRITE_STORE_IMAGES_BUCKET_ID,
  productsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PRODUCTS_COLLECTION_ID,
};

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.Platform!);


export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);


WebBrowser.maybeCompleteAuthSession();

export async function login() {
  try {
    if (__DEV__) console.log("🔵 LOGIN START");

    // Clear any stale session before starting OAuth — Appwrite forbids creating
    // a session while one is already active (happens when app resumes).
    try {
      await account.deleteSession("current");
    } catch {
      // No active session — fine to proceed
    }

    // Create redirect URI (works in Expo, Dev Client, APK)
    const redirectUri = makeRedirectUri({
      scheme: "appwrite-callback-695272a5002c9fe4b025",
    });

    if (__DEV__) console.log("Redirect URI:", redirectUri);

    // Create OAuth login URL
    const loginUrl = await account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: redirectUri,
      failure: redirectUri,
    });

    if (__DEV__) console.log("OAuth URL:", loginUrl);

    if (!loginUrl) throw new Error("Failed to create OAuth URL");

    // Open browser and listen for redirect back to app
    const result = await WebBrowser.openAuthSessionAsync(
      loginUrl.toString(),
      redirectUri
    );

    if (__DEV__) console.log("OAuth Result:", result);

    if (result.type !== "success" || !result.url) {
      throw new Error("OAuth cancelled or failed");
    }

    // Extract credentials from redirect
    const url = new URL(result.url);
    const userId = url.searchParams.get("userId");
    const secret = url.searchParams.get("secret");

    if (!userId || !secret) {
      throw new Error("Missing OAuth credentials");
    }

    // Create Appwrite session
    await account.createSession(userId, secret);

    if (__DEV__) console.log("✅ LOGIN SUCCESS");
    return true;

  } catch (error) {
    console.error("🔥 LOGIN FAILED", error);
    return false;
  }
}
export async function loginDemo(): Promise<boolean> {
  try {
    try { await account.deleteSession("current"); } catch {}
    await account.createEmailPasswordSession("demo@volo.app", "VoloDemo@123");
    return true;
  } catch (error) {
    console.error("🔥 DEMO LOGIN FAILED", error);
    return false;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  try {
    const user = await account.get();
    return !!user?.$id;
  } catch {
    return false;
  }
}

export async function logout() {
  try {
    const result = await account.deleteSession("current");
    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (!result?.$id) return null;
    const avatarUrl =
      `${config.endpoint}/avatars/initials` +
      `?name=${encodeURIComponent(result.name)}` +
      `&project=${config.projectId}`;

    return {
      ...result,
      avatar: avatarUrl, // ✅ REAL URL STRING
    };
  } catch {
    return null;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc("$createdAt"), Query.limit(5)]
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];

    if (filter && filter !== "All")
      buildQuery.push(Query.equal("Type", filter));

    if (query)
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
          Query.search("Type", query),
        ])
      );

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// write function to get property by id
export async function getPropertyById({ id }: { id: string }) {
  try {
    const doc = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id,
      [
        Query.select([
          "*",
          "agent.*",
          "reviews.*",
          "gallery.*",
        ]),
      ]
    );

    return {
      ...doc,

      // ✅ GUARANTEED SAFE FIELDS
      reviews: doc.reviews ?? [],
      gallery: doc.gallery ?? [],
      facilities: doc.facilities ?? [],

      // optional but recommended
      agent: doc.agent ?? null,
    };
  } catch (error) {
    console.error("getPropertyById error:", error);
    return null;
  }
}

export async function getStores({
  category,
  query,
  limit = 10,
  offset = 0,
}: {
  category?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const buildQuery = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),          // ✅ page size
      Query.offset(offset),        // ✅ pagination cursor
    ];

    // Filter by category
    if (category && category !== "All") {
      buildQuery.push(Query.equal("category", category));
    }

    // Search by name or address
    if (query) {
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
        ])
      );
    }

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );

    return result.documents;
  } catch (error) {
    console.error("getStores error:", error);
    return [];
  }
}

export async function getStoreById({ id }: { id: string }) {
  try {
    const doc = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id,
      [
        Query.select([
          "*",
          "agent.*",
          "reviews.*",
          "gallery.*",
        ]),
      ]
    );

    return {
      ...doc,

      // guaranteed safe fields
      reviews: doc.reviews ?? [],
      gallery: doc.gallery ?? [],
      facilities: doc.facilities ?? [],

      // agent = store owner
      agent: doc.agent ?? null,
    };
  } catch (error) {
    console.error("getStoreById error:", error);
    return null;
  }
}



export async function createStore(data: {
  name: string;
  category: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  ownerId: string;
}) {
  try {
    await databases.createDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      ID.unique(),
      {
        name: data.name,
        category: data.category,
        address: data.address,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        ownerId: data.ownerId,

        // defaults required by schema
        rating: 0,
        image:
          "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
      }
    );

    return true;
  } catch (error) {
    console.error("createStore error:", error);
    return false;
  }
}


export async function getMyStores(ownerId: string) {
  try {
    if (!ownerId) return [];
    const response = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!, // 👈 your stores collection
      [Query.equal("ownerId", ownerId)]
    );

    return response.documents;
  } catch (error) {
    console.error("getMyStores error:", error);
    return [];
  }
}
export function isValidStore(store: unknown): store is Store {
  if (!store || typeof store !== "object") return false;
  const s = store as Record<string, unknown>;
  return (
    typeof s.$id === "string" &&
    typeof s.name === "string" &&
    typeof s.latitude === "number" &&
    typeof s.longitude === "number"
  );
}


