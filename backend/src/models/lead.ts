import { Schema, model, type InferSchemaType } from "mongoose";

export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: "new", required: true },
  },
  {
    // createdAt is one of the required lead fields; updatedAt comes for free
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

// Newest-first listing is the default sort
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });

export type Lead = InferSchemaType<typeof leadSchema>;
export const LeadModel = model("Lead", leadSchema);
