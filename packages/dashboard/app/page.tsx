"use client";

import { useEffect, useState, useCallback } from "react";

const SELLER_URL = process.env.NEXT_PUBLIC_SELLER_URL || "http://localhost:4001";
const BUYER_URL = process.env.NEXT_PUBLIC_BUYER_URL || "http://localhost:4002";

// ── Types ──────────────────────────────────────────────

interface SellerStatus {
  agent: string;
  totalImages: number;
  totalSold: number;
  totalRevenue: number;
  totalSpent: number;
  profit: number;
}

interface BuyerStatus {
  agent: string;
  walletAddress: string | null;
  walletConfigured: boolean;
  totalPurchases: number;
  totalSpent: number;
}

interface WalletInfo {
  configured: boolean;
  address?: string;
  error?: string;
}

interface WalletBalances {
  configured: boolean;
  address?: string;
  mon?: string;
  usdc?: string;
  pxpay?: string;
}

interface NftInfo {
  tokenId: number;
  owner: string;
  txHash: string | null;
}

interface GalleryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  price: string;
  sold: boolean;
  createdAt: string;
  nft: NftInfo | null;
  tokenReward: TokenReward | null;
}

interface NftStats {
  totalMinted: number;
}

interface TokenStats {
  deployed: boolean;
  address?: string;
  totalSupply?: string;
  creatorBalance?: string;
  creatorPercent?: number;
  rewardPerPurchase?: string;
  totalDistributed?: string;
  distributionCount?: number;
}

interface TokenReward {
  amount: string;
  txHash: string | null;
  token: string;
  status: string;
}

// ── Helpers ────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Components ─────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        borderRadius: 12,
        padding: "20px 24px",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function WalletSetup({
  agentUrl,
  label,
  onDone,
}: {
  agentUrl: string;
  label: string;
  onDone: () => void;
}) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const isMnemonic = key.trim().includes(" ");
      const body = isMnemonic
        ? { mnemonic: key.trim() }
        : { privateKey: key.trim() };
      const res = await fetch(`${agentUrl}/api/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setKey("");
      onDone();
    } catch (e) {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
        {label} Wallet Setup
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="password"
          placeholder="Private key (0x...) or mnemonic phrase"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#111",
            color: "#eee",
            fontSize: 13,
          }}
        />
        <button
          onClick={submit}
          disabled={loading || !key}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            opacity: loading || !key ? 0.5 : 1,
          }}
        >
          {loading ? "..." : "Set"}
        </button>
      </div>
      {error && (
        <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function DashboardPage() {
  const [sellerStatus, setSellerStatus] = useState<SellerStatus | null>(null);
  const [buyerStatus, setBuyerStatus] = useState<BuyerStatus | null>(null);
  const [buyerWallet, setBuyerWallet] = useState<WalletInfo | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [sellerOnline, setSellerOnline] = useState(false);
  const [buyerOnline, setBuyerOnline] = useState(false);
  const [nftStats, setNftStats] = useState<NftStats | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [sellerWallet, setSellerWallet] = useState<WalletBalances | null>(null);
  const [buyerWalletInfo, setBuyerWalletInfo] = useState<WalletBalances | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState("");

  const refresh = useCallback(async () => {
    const [ss, bs, bw, gl, ns, ts, sw, bwi] = await Promise.all([
      fetchJson<SellerStatus>(`${SELLER_URL}/api/status`),
      fetchJson<BuyerStatus>(`${BUYER_URL}/api/status`),
      fetchJson<WalletInfo>(`${BUYER_URL}/api/wallet`),
      fetchJson<GalleryItem[]>(`${SELLER_URL}/api/gallery`),
      fetchJson<NftStats>(`${SELLER_URL}/api/nft-stats`),
      fetchJson<TokenStats>(`${SELLER_URL}/api/token-stats`),
      fetchJson<WalletBalances>(`${SELLER_URL}/api/wallet-info`),
      fetchJson<WalletBalances>(`${BUYER_URL}/api/wallet-info`),
    ]);
    setSellerStatus(ss);
    setSellerOnline(ss !== null);
    setBuyerStatus(bs);
    setBuyerOnline(bs !== null);
    setBuyerWallet(bw);
    setGallery(gl || []);
    setNftStats(ns);
    setTokenStats(ts);
    setSellerWallet(sw);
    setBuyerWalletInfo(bwi);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const triggerBuy = async () => {
    setTriggerLoading(true);
    setTriggerResult("");
    try {
      const res = await fetch(`${BUYER_URL}/api/trigger`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTriggerResult(
          data.purchased
            ? `Purchased: ${data.purchased}`
            : "No purchase made"
        );
      } else {
        setTriggerResult(data.error || "Failed");
      }
      refresh();
    } catch {
      setTriggerResult("Connection failed");
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        PixelPay Dashboard
      </h1>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 14 }}>
        Agent-to-Agent Autonomous Economy on x402
      </p>

      {/* ── Seller Agent ────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Seller Agent
          </h2>
          <span
            style={{
              fontSize: 11,
              padding: "2px 10px",
              borderRadius: 99,
              background: sellerOnline ? "#166534" : "#7f1d1d",
              color: sellerOnline ? "#4ade80" : "#fca5a5",
            }}
          >
            {sellerOnline ? "Online" : "Offline"}
          </span>
        </div>

        {sellerStatus ? (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatCard label="Images Generated" value={sellerStatus.totalImages} />
              <StatCard label="Images Sold" value={sellerStatus.totalSold} />
              <StatCard
                label="Revenue"
                value={`$${sellerStatus.totalRevenue.toFixed(4)}`}
                sub="USDC earned from sales"
              />
              <StatCard
                label="Profit"
                value={`$${sellerStatus.profit.toFixed(4)}`}
                sub={sellerStatus.profit >= 0 ? "Net positive" : "Net negative"}
              />
              <StatCard
                label="NFTs Minted"
                value={nftStats?.totalMinted ?? 0}
                sub="On-chain ownership"
              />
            </div>
            {sellerWallet?.configured && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                  Wallet:{" "}
                  <a
                    href={`https://testnet.monadexplorer.com/address/${sellerWallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#60a5fa", textDecoration: "none" }}
                  >
                    {sellerWallet.address?.slice(0, 6)}...{sellerWallet.address?.slice(-4)}
                  </a>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard
                    label="MON"
                    value={Number(sellerWallet.mon || 0).toFixed(4)}
                    sub="Gas token"
                  />
                  <StatCard
                    label="USDC"
                    value={Number(sellerWallet.usdc || 0).toFixed(4)}
                    sub="Payment token"
                  />
                  <StatCard
                    label="PXPAY"
                    value={Number(sellerWallet.pxpay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    sub="Reward token"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: 12,
              padding: 20,
              color: "#888",
            }}
          >
            Seller Agent not reachable at {SELLER_URL}
          </div>
        )}
      </section>

      {/* ── Buyer Agent ─────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Buyer Agent
          </h2>
          <span
            style={{
              fontSize: 11,
              padding: "2px 10px",
              borderRadius: 99,
              background: buyerOnline ? "#166534" : "#7f1d1d",
              color: buyerOnline ? "#4ade80" : "#fca5a5",
            }}
          >
            {buyerOnline ? "Online" : "Offline"}
          </span>
        </div>

        {buyerStatus ? (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatCard
                label="Total Purchases"
                value={buyerStatus.totalPurchases}
              />
              <StatCard
                label="Total Spent"
                value={`$${buyerStatus.totalSpent.toFixed(4)}`}
                sub="USDC spent on purchases"
              />
            </div>
            {buyerWalletInfo?.configured && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                  Wallet:{" "}
                  <a
                    href={`https://testnet.monadexplorer.com/address/${buyerWalletInfo.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#60a5fa", textDecoration: "none" }}
                  >
                    {buyerWalletInfo.address?.slice(0, 6)}...{buyerWalletInfo.address?.slice(-4)}
                  </a>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard
                    label="MON"
                    value={Number(buyerWalletInfo.mon || 0).toFixed(4)}
                    sub="Gas token"
                  />
                  <StatCard
                    label="USDC"
                    value={Number(buyerWalletInfo.usdc || 0).toFixed(4)}
                    sub="Payment token"
                  />
                  <StatCard
                    label="PXPAY"
                    value={Number(buyerWalletInfo.pxpay || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    sub="Reward earned"
                  />
                </div>
              </div>
            )}

            {!buyerWallet?.configured && (
              <WalletSetup
                agentUrl={BUYER_URL}
                label="Buyer"
                onDone={refresh}
              />
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                onClick={triggerBuy}
                disabled={triggerLoading || !buyerWallet?.configured}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#7c3aed",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity:
                    triggerLoading || !buyerWallet?.configured ? 0.5 : 1,
                }}
              >
                {triggerLoading ? "Buying..." : "Trigger Purchase"}
              </button>
              {triggerResult && (
                <span
                  style={{
                    fontSize: 13,
                    color: "#888",
                    alignSelf: "center",
                  }}
                >
                  {triggerResult}
                </span>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: 12,
              padding: 20,
              color: "#888",
            }}
          >
            Buyer Agent not reachable at {BUYER_URL}
          </div>
        )}
      </section>

      {/* ── $PXPAY Token ──────────────────────────────────── */}
      {tokenStats?.deployed && (
        <section style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
              $PXPAY Token
            </h2>
            <a
              href={`https://testnet.nad.fun/token/${tokenStats.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                padding: "2px 10px",
                borderRadius: 99,
                background: "#7c3aed",
                color: "#e9d5ff",
                textDecoration: "none",
              }}
            >
              nad.fun
            </a>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard
              label="Token Address"
              value={`${tokenStats.address!.slice(0, 6)}...${tokenStats.address!.slice(-4)}`}
              sub={tokenStats.address}
            />
            <StatCard
              label="Total Supply"
              value={Number(tokenStats.totalSupply || 0).toLocaleString()}
              sub="PXPAY"
            />
            <StatCard
              label="Creator Hold"
              value={`${(tokenStats.creatorPercent || 0).toFixed(2)}%`}
              sub={`${Number(tokenStats.creatorBalance || 0).toLocaleString()} PXPAY`}
            />
            <StatCard
              label="Reward / Purchase"
              value={`${tokenStats.rewardPerPurchase || "100"}`}
              sub="PXPAY per buy"
            />
            <StatCard
              label="Total Distributed"
              value={Number(tokenStats.totalDistributed || 0).toLocaleString()}
              sub={`${tokenStats.distributionCount || 0} distributions`}
            />
          </div>
        </section>
      )}

      {/* ── Gallery ─────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Gallery ({gallery.length} images)
        </h2>
        {gallery.length === 0 ? (
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: 12,
              padding: 20,
              color: "#888",
            }}
          >
            No images in gallery yet
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220, 1fr))",
              gap: 16,
            }}
          >
            {gallery.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#1a1a1a",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  style={{
                    width: "100%",
                    height: 200,
                    objectFit: "cover",
                  }}
                />
                <div style={{ padding: 12 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#ccc",
                      marginBottom: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.prompt}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#888" }}>
                      ${item.price} USDC
                    </span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {item.tokenReward &&
                        item.tokenReward.status === "success" && (
                          <a
                            href={
                              item.tokenReward.txHash
                                ? `https://testnet.monadexplorer.com/tx/${item.tokenReward.txHash}`
                                : "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: "#7c3aed",
                              color: "#e9d5ff",
                              textDecoration: "none",
                            }}
                            title={`Reward: ${item.tokenReward.amount} PXPAY`}
                          >
                            +{item.tokenReward.amount} PXPAY
                          </a>
                        )}
                      {item.nft && (
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${item.nft.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: "#4a1d96",
                            color: "#c4b5fd",
                            textDecoration: "none",
                          }}
                          title={`Owner: ${item.nft.owner}`}
                        >
                          NFT #{item.nft.tokenId}
                        </a>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: item.sold ? "#166534" : "#1e3a5f",
                          color: item.sold ? "#4ade80" : "#60a5fa",
                        }}
                      >
                        {item.sold ? "Sold" : "For Sale"}
                      </span>
                    </div>
                  </div>
                  {item.nft && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Owner: {item.nft.owner.slice(0, 6)}...{item.nft.owner.slice(-4)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
