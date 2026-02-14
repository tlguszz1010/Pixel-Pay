import express from "express";
import cors from "cors";
import cron from "node-cron";
import dotenv from "dotenv";
import apiRoutes from "./api/routes";
import { runPipeline } from "./buyer/pipeline";
import { addLog } from "./db/queries";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4002", 10);

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

app.get("/", (_req, res) => {
  res.json({
    name: "PixelPay Buyer Agent",
    description: "Autonomous buyer that discovers and purchases AI art via x402",
    endpoints: {
      "GET /api/status": "Purchase stats",
      "GET /api/purchases": "Purchase history",
      "GET /api/wallet": "Wallet status",
      "POST /api/trigger": "Manual purchase trigger",
      "GET /health": "Health check",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", agent: "buyer" });
});

// ── Cron: run purchase pipeline every 5 minutes ─────────
cron.schedule("*/5 * * * *", async () => {
  console.log("[cron] Starting purchase pipeline...");
  try {
    const result = await runPipeline();
    console.log("[cron] Pipeline result:", result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[cron] Pipeline error:", msg);
  }
});

app.listen(PORT, () => {
  console.log(`Buyer Agent running on http://localhost:${PORT}`);
  console.log("  Cron: every 5 minutes");
  console.log("  First purchase: after 2 min delay");
  console.log("  API: /api/status, /api/purchases, /api/wallet, /api/trigger");

  // Run pipeline once on startup (2 min delay to let gallery build up)
  setTimeout(async () => {
    console.log("[startup] Running initial pipeline...");
    addLog("system", "Buyer Agent started");
    try {
      const result = await runPipeline();
      console.log("[startup] Pipeline result:", result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.log("[startup] Pipeline skipped:", msg);
    }
  }, 120_000);
});
