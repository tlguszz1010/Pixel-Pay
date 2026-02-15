import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./api/routes";
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

app.listen(PORT, () => {
  console.log(`Buyer Agent running on http://localhost:${PORT}`);
  console.log("  Mode: manual trigger only (POST /api/trigger)");
  console.log("  API: /api/status, /api/purchases, /api/wallet, /api/trigger");
  addLog("system", "Buyer Agent started");
});
