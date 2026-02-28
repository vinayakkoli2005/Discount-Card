import { Models } from "react-native-appwrite";

export interface Store extends Models.Document {
  $id: string;
  name: string;
  category: string;
  address: string;
  description?: string;
  image?: string;
  rating?: number;
  latitude: number;
  longitude: number;
  ownerId?: string;
  reviews?: Models.Document[];
  gallery?: Models.Document[];
  facilities?: string[];
  agent?: Models.Document | null;
}
