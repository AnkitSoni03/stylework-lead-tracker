import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app";
import { LeadModel } from "../src/models/lead";

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await LeadModel.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await LeadModel.deleteMany({});
});

const validLead = { name: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210" };

async function createLead(overrides: Partial<typeof validLead> = {}) {
  const res = await request(app).post("/api/leads").send({ ...validLead, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/leads", () => {
  it("creates a lead with default status 'new' and createdAt", async () => {
    const lead = await createLead();
    expect(lead).toMatchObject({ ...validLead, status: "new" });
    expect(lead.id).toBeTypeOf("string");
    expect(new Date(lead.createdAt).toString()).not.toBe("Invalid Date");
    expect(lead._id).toBeUndefined();
  });

  it("normalizes email to lowercase and trims fields", async () => {
    const lead = await createLead({ name: "  Rahul  ", email: "  RAHUL@Example.COM " });
    expect(lead.name).toBe("Rahul");
    expect(lead.email).toBe("rahul@example.com");
  });

  it("rejects invalid input with field-level errors", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "A", email: "not-an-email", phone: "abc" });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(["email", "name", "phone"]);
  });

  it("rejects an unknown status", async () => {
    const res = await request(app).post("/api/leads").send({ ...validLead, status: "hot" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for a duplicate email", async () => {
    await createLead();
    const res = await request(app)
      .post("/api/leads")
      .send({ ...validLead, email: "PRIYA@example.com" });
    expect(res.status).toBe(409);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/leads")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/leads", () => {
  beforeEach(async () => {
    await createLead({ name: "Amit Verma", email: "amit@acme.com", phone: "9000000001" });
    await createLead({ name: "Neha Gupta", email: "neha@globex.com", phone: "9000000002" });
    await createLead({ name: "Rohan Mehta", email: "rohan@acme.com", phone: "9111111113" });
  });

  it("lists leads newest first with total count", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.data.map((l: { name: string }) => l.name)).toEqual([
      "Rohan Mehta",
      "Neha Gupta",
      "Amit Verma",
    ]);
  });

  it("searches case-insensitively across name, email and phone", async () => {
    const byName = await request(app).get("/api/leads").query({ search: "neha" });
    expect(byName.body.data.map((l: { name: string }) => l.name)).toEqual(["Neha Gupta"]);

    const byEmail = await request(app).get("/api/leads").query({ search: "ACME" });
    expect(byEmail.body.total).toBe(2);

    const byPhone = await request(app).get("/api/leads").query({ search: "91111" });
    expect(byPhone.body.data.map((l: { name: string }) => l.name)).toEqual(["Rohan Mehta"]);
  });

  it("treats regex characters in search as literal text", async () => {
    const res = await request(app).get("/api/leads").query({ search: ".*" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("filters by status", async () => {
    const { body } = await request(app).get("/api/leads").query({ search: "amit" });
    await request(app).patch(`/api/leads/${body.data[0].id}/status`).send({ status: "qualified" });

    const res = await request(app).get("/api/leads").query({ status: "qualified" });
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].name).toBe("Amit Verma");
  });

  it("paginates results", async () => {
    const res = await request(app).get("/api/leads").query({ page: 2, limit: 2 });
    expect(res.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it("rejects invalid query params", async () => {
    const res = await request(app).get("/api/leads").query({ limit: 1000 });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/leads/:id/status", () => {
  it("updates the status", async () => {
    const lead = await createLead();
    const res = await request(app)
      .patch(`/api/leads/${lead.id}/status`)
      .send({ status: "contacted" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("contacted");
  });

  it("rejects an invalid status", async () => {
    const lead = await createLead();
    const res = await request(app).patch(`/api/leads/${lead.id}/status`).send({ status: "maybe" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing lead", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const res = await request(app).patch(`/api/leads/${id}/status`).send({ status: "lost" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).patch("/api/leads/not-an-id/status").send({ status: "lost" });
    expect(res.status).toBe(400);
  });
});

describe("unknown routes", () => {
  it("returns 404 JSON", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Route not found");
  });
});
