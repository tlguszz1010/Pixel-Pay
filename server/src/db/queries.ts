import { getDb } from "./schema";
import crypto from "crypto";

// ── Settings ────────────────────────────────────────────

export function getSetting(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}

// ── Images / Gallery ────────────────────────────────────

export interface GalleryImage {
  id: string;
  prompt: string;
  image_url: string;
  local_path: string | null;
  price: string;
  sold: number;
  sold_at: string | null;
  created_at: string;
}

export function addImage(data: {
  prompt: string;
  imageUrl: string;
  localPath?: string;
  price?: string;
}): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      "INSERT INTO images (id, prompt, image_url, local_path, price) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, data.prompt, data.imageUrl, data.localPath ?? null, data.price ?? "0.001");
  return id;
}

export function getGallery(): GalleryImage[] {
  return getDb()
    .prepare("SELECT * FROM images ORDER BY created_at DESC")
    .all() as GalleryImage[];
}

export function getImageById(id: string): GalleryImage | undefined {
  return getDb()
    .prepare("SELECT * FROM images WHERE id = ?")
    .get(id) as GalleryImage | undefined;
}

export function markImageSold(id: string): void {
  getDb()
    .prepare("UPDATE images SET sold = 1, sold_at = datetime('now') WHERE id = ?")
    .run(id);
}

// ── Revenue / Spending Tracking ─────────────────────────

export function getTotalRevenue(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM images WHERE sold = 1")
    .get() as { cnt: number };
  return row.cnt * 0.01;
}

export function getTotalSpent(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM images")
    .get() as { cnt: number };
  return row.cnt * 0.01;
}

export function getImageCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM images")
    .get() as { cnt: number };
  return row.cnt;
}

export function getSoldCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM images WHERE sold = 1")
    .get() as { cnt: number };
  return row.cnt;
}

// ── Logs ────────────────────────────────────────────────

export function addLog(
  type: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  getDb()
    .prepare("INSERT INTO logs (type, message, metadata) VALUES (?, ?, ?)")
    .run(type, message, metadata ? JSON.stringify(metadata) : null);
}

export function getLogs(limit = 100): Array<{
  id: number;
  type: string;
  message: string;
  metadata: string | null;
  created_at: string;
}> {
  return getDb()
    .prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?")
    .all(limit) as any[];
}

// ── NFTs ───────────────────────────────────────────────

export interface NftRecord {
  id: number;
  token_id: number;
  image_id: string;
  owner: string;
  tx_hash: string | null;
  metadata_uri: string | null;
  minted_at: string;
}

export function addNft(data: {
  tokenId: number;
  imageId: string;
  owner: string;
  txHash: string;
  metadataUri: string;
}): void {
  getDb()
    .prepare(
      "INSERT INTO nfts (token_id, image_id, owner, tx_hash, metadata_uri) VALUES (?, ?, ?, ?, ?)"
    )
    .run(data.tokenId, data.imageId, data.owner, data.txHash, data.metadataUri);
}

export function getNftByImageId(imageId: string): NftRecord | undefined {
  return getDb()
    .prepare("SELECT * FROM nfts WHERE image_id = ?")
    .get(imageId) as NftRecord | undefined;
}

export function getNftByTokenId(tokenId: number): NftRecord | undefined {
  return getDb()
    .prepare("SELECT * FROM nfts WHERE token_id = ?")
    .get(tokenId) as NftRecord | undefined;
}

export function getNfts(limit = 100): NftRecord[] {
  return getDb()
    .prepare("SELECT * FROM nfts ORDER BY minted_at DESC LIMIT ?")
    .all(limit) as NftRecord[];
}

export function getNftCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM nfts")
    .get() as { cnt: number };
  return row.cnt;
}

// ── Token Distributions ───────────────────────────────

export interface TokenDistribution {
  id: number;
  buyer_address: string;
  image_id: string;
  amount: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
}

export function addTokenDistribution(data: {
  buyerAddress: string;
  imageId: string;
  amount: string;
  txHash: string | null;
  status: string;
}): void {
  getDb()
    .prepare(
      "INSERT INTO token_distributions (buyer_address, image_id, amount, tx_hash, status) VALUES (?, ?, ?, ?, ?)"
    )
    .run(data.buyerAddress, data.imageId, data.amount, data.txHash, data.status);
}

export function getTokenDistributionByImageId(
  imageId: string
): TokenDistribution | undefined {
  return getDb()
    .prepare("SELECT * FROM token_distributions WHERE image_id = ?")
    .get(imageId) as TokenDistribution | undefined;
}

export function getTotalTokensDistributed(): string {
  const row = getDb()
    .prepare(
      "SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total FROM token_distributions WHERE status = 'success'"
    )
    .get() as { total: number };
  return row.total.toString();
}

export function getTokenDistributionCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as cnt FROM token_distributions WHERE status = 'success'")
    .get() as { cnt: number };
  return row.cnt;
}
