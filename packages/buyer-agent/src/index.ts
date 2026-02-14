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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", agent: "buyer" });
});

// ── Cron: run purchase pipeline every 10 minutes ────────
cron.schedule("*/10 * * * *", async () => {
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
  console.log("  Cron: every 10 minutes");
  console.log("  API: /api/status, /api/purchases, /api/wallet, /api/trigger");

  // Run pipeline once on startup (after short delay)
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
  }, 3000);
});
