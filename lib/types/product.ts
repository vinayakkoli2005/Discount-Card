export interface Product {
  $id: string;
  store_id: string;
  name: string;
  price?: number;
  description?: string;
  image_id?: string;
  category: string;
  owner_id: string;
  $createdAt?: string;
}
