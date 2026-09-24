import mongoose from "mongoose";
import { config } from "./config";
import { LeadModel, type LeadStatus } from "./models/lead";

// Fictional demo leads (example.com addresses). Re-running is safe: leads are
// upserted by email, so existing ones are left untouched.
const DEMO_LEADS: { name: string; email: string; phone: string; status: LeadStatus; daysAgo: number }[] = [
  { name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "+91 98100 11001", status: "new", daysAgo: 0 },
  { name: "Diya Patel", email: "diya.patel@example.com", phone: "+91 98200 22002", status: "new", daysAgo: 1 },
  { name: "Kabir Mehta", email: "kabir.mehta@example.com", phone: "+91 98300 33003", status: "contacted", daysAgo: 2 },
  { name: "Ananya Iyer", email: "ananya.iyer@example.com", phone: "+91 98400 44004", status: "qualified", daysAgo: 3 },
  { name: "Vihaan Reddy", email: "vihaan.reddy@example.com", phone: "+91 98500 55005", status: "contacted", daysAgo: 4 },
  { name: "Ishita Gupta", email: "ishita.gupta@example.com", phone: "+91 98600 66006", status: "converted", daysAgo: 6 },
  { name: "Arjun Nair", email: "arjun.nair@example.com", phone: "+91 98700 77007", status: "lost", daysAgo: 7 },
  { name: "Meera Joshi", email: "meera.joshi@example.com", phone: "+91 98800 88008", status: "qualified", daysAgo: 9 },
  { name: "Rohan Verma", email: "rohan.verma@example.com", phone: "+91 98900 99009", status: "new", daysAgo: 10 },
  { name: "Saanvi Kapoor", email: "saanvi.kapoor@example.com", phone: "+91 97100 10110", status: "converted", daysAgo: 12 },
  { name: "Aditya Singh", email: "aditya.singh@example.com", phone: "+91 97200 20220", status: "contacted", daysAgo: 14 },
  { name: "Nisha Menon", email: "nisha.menon@example.com", phone: "+91 97300 30330", status: "lost", daysAgo: 16 },
];

async function seed() {
  await mongoose.connect(config.mongoUri);

  const now = Date.now();
  const result = await LeadModel.bulkWrite(
    DEMO_LEADS.map(({ daysAgo, ...lead }) => {
      const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      return {
        updateOne: {
          filter: { email: lead.email },
          update: { $setOnInsert: { ...lead, createdAt, updatedAt: createdAt } },
          upsert: true,
        },
      };
    }),
    // Keep our explicit createdAt instead of letting timestamps overwrite it
    { timestamps: false },
  );

  console.log(`Seeded ${result.upsertedCount} new lead(s); ${DEMO_LEADS.length - result.upsertedCount} already existed.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
