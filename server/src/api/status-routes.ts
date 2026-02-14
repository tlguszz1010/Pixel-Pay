import { Router, Request, Response } from "express";
import {
  getTotalRevenue,
  getTotalSpent,
  getImageCount,
  getSoldCount,
  getLogs,
} from "../db/queries";

const router = Router();

// ── GET /api/status — seller agent stats ────────────────
router.get("/", (_req: Request, res: Response) => {
  const totalRevenue = getTotalRevenue();
  const totalSpent = getTotalSpent();
  const profit = totalRevenue - totalSpent;

  res.json({
    agent: "seller",
    totalImages: getImageCount(),
    totalSold: getSoldCount(),
    totalRevenue,
    totalSpent,
    profit,
  });
});

// ── GET /api/logs — recent activity logs ────────────────
router.get("/logs", (_req: Request, res: Response) => {
  res.json(getLogs());
});

export default router;
