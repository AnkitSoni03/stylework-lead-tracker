import { Router } from "express";
import type { QueryFilter } from "mongoose";
import { LeadModel, type Lead } from "../models/lead";
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
