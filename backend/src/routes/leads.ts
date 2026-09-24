import { Router } from "express";
import type { QueryFilter } from "mongoose";
import { LEAD_STATUSES, LeadModel, type Lead, type LeadStatus } from "../models/lead";
import { createLeadSchema, listLeadsQuerySchema, updateStatusSchema } from "../schemas/lead";
import { HttpError } from "../middleware/errors";

export const leadsRouter = Router();

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/leads?search=&status=&page=&limit=
// Express 5 forwards rejected promises to the error handler, so no try/catch needed.
leadsRouter.get("/", async (req, res) => {
  const { search, status, page, limit } = listLeadsQuerySchema.parse(req.query);

  const filter: QueryFilter<Lead> = {};
  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const [data, total] = await Promise.all([
    LeadModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    LeadModel.countDocuments(filter),
  ]);

  res.json({ data, total, page, limit });
});

// GET /api/leads/stats -> { total, byStatus: { new: n, contacted: n, ... } }
leadsRouter.get("/stats", async (_req, res) => {
  const groups = await LeadModel.aggregate<{ _id: LeadStatus; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const { _id, count } of groups) byStatus[_id] = count;
  const total = groups.reduce((sum, g) => sum + g.count, 0);

  res.json({ total, byStatus });
});

// POST /api/leads
leadsRouter.post("/", async (req, res) => {
  const input = createLeadSchema.parse(req.body);
  const lead = await LeadModel.create(input);
  res.status(201).json(lead);
});

// PATCH /api/leads/:id/status
leadsRouter.patch("/:id/status", async (req, res) => {
  const { status } = updateStatusSchema.parse(req.body);
  const lead = await LeadModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { returnDocument: "after", runValidators: true },
  );
  if (!lead) throw new HttpError(404, "Lead not found");
  res.json(lead);
});
