const SELLER_URL = process.env.SELLER_URL || "http://localhost:4001";

export interface GalleryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  previewUrl: string;
  price: string;
  sold: boolean;
  createdAt: string;
}

export async function fetchGallery(): Promise<GalleryItem[]> {
  const res = await fetch(`${SELLER_URL}/api/gallery`);
  if (!res.ok) {
    throw new Error(`Gallery fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<GalleryItem[]>;
}

export function filterUnsold(items: GalleryItem[]): GalleryItem[] {
  return items.filter((item) => !item.sold);
}
