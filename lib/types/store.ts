import { Models } from "react-native-appwrite";

export interface Agent {
  $id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Review extends Models.Document {
  name: string;
  avatar: string;
  review: string;
}

export interface Store extends Models.Document {
  $id: string;
  name: string;
  category: string;
  address: string;
  description?: string;
  /** Legacy single image URL */
  image?: string;
  /** New: Appwrite Storage file IDs (1–5 images) */
  images?: string[];
  phone?: string;
  opening_hours?: string;
  rating?: number;
  latitude: number;
  longitude: number;
  /** Legacy camelCase field — use owner_id going forward */
  ownerId?: string;
  /** Canonical owner field (Phase 0.3 schema migration) */
  owner_id?: string;
  is_active?: boolean;
  product_count?: number;
  /** Legacy real-estate field kept for backward compat */
  Price?: number;
  reviews?: Review[];
  gallery?: Models.Document[];
  facilities?: string[];
  agent?: Agent | null;
}
