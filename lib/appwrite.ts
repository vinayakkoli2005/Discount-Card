import { Platform } from "react-native";
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
  Platform: 'com.ds.discountcard',
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  storeImagesBucketId: process.env.EXPO_PUBLIC_APPWRITE_STORE_IMAGES_BUCKET_ID,  
};

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.Platform!);

  console.log(
  "APPWRITE ENV CHECK:",
  config.endpoint,
  config.projectId
);


export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// export async function login() {
//   try {
//     const redirectUri = Linking.createURL('/');
//
//     const response = await account.createOAuth2Token(
//       OAuthProvider.Google,
//       redirectUri
//     );
//     if (!response) throw new Error("Create OAuth2 token failed");
//
//     const browserResult = await openAuthSessionAsync(
//       response.toString(),
//       redirectUri
//     );
//     if (browserResult.type !== "success")
//       throw new Error("Create OAuth2 token failed");
//
//     const url = new URL(browserResult.url);
//     const secret = url.searchParams.get("secret")?.toString();
//     const userId = url.searchParams.get("userId")?.toString();
//     if (!secret || !userId) throw new Error("Create OAuth2 token failed");
//
//     const session = await account.createSession(userId, secret);
//     if (!session) throw new Error("Failed to create session");
//
//     return true;
//   } catch (error) {
//     console.error(error);
//     return false;
//   }
// }
// export async function login() {
//   console.log("🔵 LOGIN START");
//
//   try {
//     console.log("🟡 STEP 1: Calling createOAuth2Token");
//
//     const response = await account.createOAuth2Token(
//       OAuthProvider.Google,
//       Linking.createURL("/")
//     );
//
//     console.log("✅ STEP 1 SUCCESS");
//     console.log("OAuth URL:", response?.toString());
//
//     console.log("🟡 STEP 2: Opening auth session");
//
//     const browserResult = await openAuthSessionAsync(
//       response.toString(),
//       Linking.createURL("/")
//     );
//
//     console.log("📦 STEP 2 RESULT:", browserResult);
//
//     if (browserResult.type !== "success") {
//       console.error("❌ STEP 2 FAILED: browserResult.type =", browserResult.type);
//       throw new Error("OAuth failed");
//     }
//
//     console.log("🟡 STEP 3: Parsing redirect URL");
//     console.log("Redirect URL:", browserResult.url);
//
//     const url = new URL(browserResult.url);
//     const secret = url.searchParams.get("secret");
//     const userId = url.searchParams.get("userId");
//
//     console.log("Parsed userId:", userId);
//     console.log("Parsed secret:", secret ? "PRESENT" : "MISSING");
//
//     if (!secret || !userId) {
//       console.error("❌ STEP 3 FAILED: Missing OAuth params", { userId, secret });
//       throw new Error("Missing OAuth params");
//     }
//
//     console.log("🟡 STEP 4: Creating Appwrite session");
//
//     await account.createSession(userId, secret);
//
//     console.log("✅ LOGIN SUCCESS");
//     return true;
//
//   } catch (err: any) {
//     console.error("🔥 LOGIN ERROR OCCURRED");
//     console.error("Message:", err?.message);
//     console.error("Full error:", err);
//     return false;
//   }
// }


WebBrowser.maybeCompleteAuthSession();

export async function login() {
  try {
    console.log("🔵 LOGIN START");

    // Create redirect URI (works in Expo, Dev Client, APK)
    const redirectUri = makeRedirectUri({
      scheme: "appwrite-callback-695272a5002c9fe4b025",
      preferLocalhost: true,
    });

    console.log("Redirect URI:", redirectUri);

    // Create OAuth login URL
    const loginUrl = await account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: redirectUri,
      failure: redirectUri,
    });

    console.log("OAuth URL:", loginUrl);

    // Open browser and listen for redirect back to app
    const result = await WebBrowser.openAuthSessionAsync(
      loginUrl.toString(),
      redirectUri
    );

    console.log("OAuth Result:", result);

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

    console.log("✅ LOGIN SUCCESS");
    return true;

  } catch (error) {
    console.error("🔥 LOGIN FAILED", error);
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

    console.log("User Avatar URL:", avatarUrl);

    return {
      ...result,
      avatar: avatarUrl, // ✅ REAL URL STRING
    };
  } catch (error) {
    console.log(error);
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
// export async function uploadStoreImage(uri: string) {
//   const response = await fetch(uri);
//   const blob = await response.blob();

//   const file = new File([blob], `store-${Date.now()}.jpg`, {
//     type: "image/jpeg",
//   });

//   const uploaded = await storage.createFile(
//     config.storeImagesBucketId!,
//     ID.unique(),
//     file
//   );

//   return storage.getFileView(
//     config.storeImagesBucketId!,
//     uploaded.$id
//   );
// }


// Get stores owned by current user


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
export function isValidStore(store: any) {
  return (
    store &&
    typeof store.$id === "string" &&
    typeof store.name === "string" &&
    typeof store.latitude === "number" &&
    typeof store.longitude === "number"
  );
}


