import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  clientsTable,
  db,
  projectFinanceSettingsTable,
  projectsTable,
  venuesTable,
} from "@workspace/db";
import { getEmployeeProjectAccess, isProjectWriter, UUID_PATTERN } from "../lib/projectAccess";
import {
  getOrganizationSettings,
  organizationDefaultsSnapshot,
} from "../lib/organizationSettings";
import {
  projectDataWithOrganizationDefaults,
  projectFinanceSeed,
} from "../lib/projectDefaults";

const router: IRouter = Router();
const MAX_JSON_BYTES = 128 * 1024;

type JsonObject = Record<string, unknown>;

function idParam(raw: string | string[] | undefined): string {
  return String(Array.isArray(raw) ? raw[0] ?? "" : raw ?? "");
}

function plainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function strictBody(
  raw: unknown,
  allowed: ReadonlySet<string>,
): { body?: JsonObject; error?: string } {
  if (!plainObject(raw)) return { error: "Request body must be a JSON object." };
  const unexpected = Object.keys(raw).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    return { error: `Unexpected field(s): ${unexpected.join(", ")}.` };
  }
  return { body: raw };
}

function textField(
  body: JsonObject,
  key: string,
  max: number,
  required = false,
): { value?: string; error?: string } {
  if (!(key in body)) return required ? { error: `${key} is required.` } : {};
  if (typeof body[key] !== "string") return { error: `${key} must be a string.` };
  const value = body[key].trim().slice(0, max);
  if (required && !value) return { error: `${key} must not be empty.` };
  return { value };
}

function jsonField(body: JsonObject, key: string): { value?: unknown; error?: string } {
  if (!(key in body)) return {};
  const value = body[key];
  if (!plainObject(value) && !Array.isArray(value)) {
    return { error: `${key} must be a JSON object or array.` };
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_JSON_BYTES) {
    return { error: `${key} is too large.` };
  }
  return { value };
}

function searchQuery(req: { query: Record<string, unknown> }): { q?: string; error?: string } {
  const unexpected = Object.keys(req.query).filter((key) => key !== "q");
  if (unexpected.length) return { error: `Unexpected query field(s): ${unexpected.join(", ")}.` };
  if (req.query.q === undefined) return { q: "" };
  if (typeof req.query.q !== "string") return { error: "q must be a string." };
  if (req.query.q.length > 200) return { error: "q must be at most 200 characters." };
  return { q: req.query.q.trim() };
}

const VENUE_KEYS = new Set([
  "name",
  "address",
  "website",
  "technicalContactName",
  "technicalContactPhone",
  "technicalContactEmail",
  "riggingSpecs",
  "powerInfrastructure",
  "logisticsAccess",
  "siteFacilities",
]);

function venueValues(raw: unknown, partial: boolean): { values?: JsonObject; error?: string } {
  const parsed = strictBody(raw, VENUE_KEYS);
  if (!parsed.body) return { error: parsed.error };
  const body = parsed.body;
  if (partial && Object.keys(body).length === 0) return { error: "At least one field is required." };
  const values: JsonObject = {};
  for (const [key, max, required] of [
    ["name", 280, !partial],
    ["address", 2000, false],
    ["website", 500, false],
    ["technicalContactName", 280, false],
    ["technicalContactPhone", 100, false],
    ["technicalContactEmail", 320, false],
  ] as const) {
    const field = textField(body, key, max, required);
    if (field.error) return { error: field.error };
    if (field.value !== undefined) values[key] = field.value;
  }
  if (typeof values.website === "string" && values.website) {
    try {
      const url = new URL(values.website);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      return { error: "website must be an http(s) URL." };
    }
  }
  if (
    typeof values.technicalContactEmail === "string" &&
    values.technicalContactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.technicalContactEmail)
  ) {
    return { error: "technicalContactEmail must be a valid email address." };
  }
  for (const key of ["riggingSpecs", "powerInfrastructure", "logisticsAccess", "siteFacilities"] as const) {
    const field = jsonField(body, key);
    if (field.error) return { error: field.error };
    if (field.value !== undefined) values[key] = field.value;
  }
  return { values };
}

router.get("/venues", async (req, res): Promise<void> => {
  const query = searchQuery(req as unknown as { query: Record<string, unknown> });
  if (query.error) {
    res.status(400).json({ ok: false, error: query.error });
    return;
  }
  const q = query.q ?? "";
  try {
    const rows = await db
      .select()
      .from(venuesTable)
      .where(q ? or(ilike(venuesTable.name, `%${q}%`), ilike(venuesTable.address, `%${q}%`)) : undefined)
      .orderBy(venuesTable.name)
      .limit(200);
    res.json({ ok: true, venues: rows });
  } catch (err) {
    req.log.error(err, "Failed to list venues");
    res.status(500).json({ ok: false, error: "Failed to list venues." });
  }
});

router.post("/venues", async (req, res): Promise<void> => {
  const parsed = venueValues(req.body, false);
  if (!parsed.values) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  try {
    const [venue] = await db.insert(venuesTable).values(parsed.values as typeof venuesTable.$inferInsert).returning();
    res.status(201).json({ ok: true, venue });
  } catch (err) {
    req.log.error(err, "Failed to create venue");
    res.status(500).json({ ok: false, error: "Failed to create venue." });
  }
});

router.get("/venues/:id", async (req, res): Promise<void> => {
  const id = idParam(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Venue not found." });
    return;
  }
  const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, id)).limit(1);
  if (!venue) {
    res.status(404).json({ ok: false, error: "Venue not found." });
    return;
  }
  res.json({ ok: true, venue });
});

router.patch("/venues/:id", async (req, res): Promise<void> => {
  const id = idParam(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Venue not found." });
    return;
  }
  const parsed = venueValues(req.body, true);
  if (!parsed.values) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  const [venue] = await db.update(venuesTable).set({ ...parsed.values, updatedAt: sql`now()` }).where(eq(venuesTable.id, id)).returning();
  if (!venue) {
    res.status(404).json({ ok: false, error: "Venue not found." });
    return;
  }
  if (typeof parsed.values.name === "string") {
    await db.update(projectsTable).set({ venue: parsed.values.name, updatedAt: sql`now()` }).where(eq(projectsTable.venueId, id));
  }
  res.json({ ok: true, venue });
});

router.delete("/venues/:id", async (req, res): Promise<void> => {
  const id = idParam(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Venue not found." });
    return;
  }
  const [venue] = await db.delete(venuesTable).where(eq(venuesTable.id, id)).returning({ id: venuesTable.id });
  if (!venue) {
    res.status(404).json({ ok: false, error: "Venue not found." });
    return;
  }
  res.json({ ok: true });
});

const CLIENT_KEYS = new Set([
  "companyName",
  "billingAddress",
  "organizationNumber",
  "primaryContacts",
  "defaultPaymentTermsDays",
]);

function clientValues(raw: unknown, partial: boolean): { values?: JsonObject; error?: string } {
  const parsed = strictBody(raw, CLIENT_KEYS);
  if (!parsed.body) return { error: parsed.error };
  const body = parsed.body;
  if (partial && Object.keys(body).length === 0) return { error: "At least one field is required." };
  const values: JsonObject = {};
  for (const [key, max, required] of [
    ["companyName", 280, !partial],
    ["billingAddress", 2000, false],
    ["organizationNumber", 100, false],
  ] as const) {
    const field = textField(body, key, max, required);
    if (field.error) return { error: field.error };
    if (field.value !== undefined) values[key] = field.value;
  }
  const contacts = jsonField(body, "primaryContacts");
  if (contacts.error) return { error: contacts.error };
  if (contacts.value !== undefined) {
    if (!Array.isArray(contacts.value)) return { error: "primaryContacts must be an array." };
    const contactKeys = new Set(["name", "role", "phone", "email"]);
    for (const contact of contacts.value) {
      if (!plainObject(contact)) return { error: "Each primary contact must be an object." };
      const unknown = Object.keys(contact).filter((key) => !contactKeys.has(key));
      if (unknown.length) return { error: `Unexpected primary contact field(s): ${unknown.join(", ")}.` };
      for (const key of contactKeys) {
        if (key in contact && typeof contact[key] !== "string") {
          return { error: `primaryContacts.${key} must be a string.` };
        }
      }
      if (typeof contact.email === "string" && contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        return { error: "primaryContacts.email must be a valid email address." };
      }
    }
    values.primaryContacts = contacts.value;
  }
  if ("defaultPaymentTermsDays" in body) {
    const days = body.defaultPaymentTermsDays;
    if (!Number.isInteger(days) || Number(days) < 0 || Number(days) > 365) {
      return { error: "defaultPaymentTermsDays must be an integer from 0 to 365." };
    }
    values.defaultPaymentTermsDays = days;
  }
  return { values };
}

router.get("/clients", async (req, res): Promise<void> => {
  const query = searchQuery(req as unknown as { query: Record<string, unknown> });
  if (query.error) {
    res.status(400).json({ ok: false, error: query.error });
    return;
  }
  const q = query.q ?? "";
  try {
    const rows = await db.select().from(clientsTable)
      .where(q ? or(ilike(clientsTable.companyName, `%${q}%`), ilike(clientsTable.organizationNumber, `%${q}%`)) : undefined)
      .orderBy(clientsTable.companyName).limit(200);
    res.json({ ok: true, clients: rows });
  } catch (err) {
    req.log.error(err, "Failed to list clients");
    res.status(500).json({ ok: false, error: "Failed to list clients." });
  }
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = clientValues(req.body, false);
  if (!parsed.values) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  try {
    const [client] = await db.insert(clientsTable).values(parsed.values as typeof clientsTable.$inferInsert).returning();
    res.status(201).json({ ok: true, client });
  } catch (err) {
    req.log.error(err, "Failed to create client");
    res.status(500).json({ ok: false, error: "Failed to create client." });
  }
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const id = idParam(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Client not found." });
    return;
  }
  try {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!client) {
      res.status(404).json({ ok: false, error: "Client not found." });
      return;
    }
    const projects = await db.select({
      id: projectsTable.id,
      name: projectsTable.name,
      venue: projectsTable.venue,
      easyjob_number: projectsTable.easyjobNumber,
      status: sql<string>`coalesce(nullif(${projectsTable.data}->>'status', ''), 'draft')`,
      start_date: sql<string | null>`${projectsTable.data}->>'reportDate'`,
      end_date: sql<string | null>`${projectsTable.data}->>'reportEndDate'`,
      updatedAt: projectsTable.updatedAt,
    }).from(projectsTable).where(and(
      eq(projectsTable.clientId, id),
      or(
        sql`lower(coalesce(${projectsTable.data}->>'status', '')) in ('completed', 'complete', 'archived')`,
        sql`case when (${projectsTable.data}->>'reportEndDate') ~ '^\\d{4}-\\d{2}-\\d{2}$' then (${projectsTable.data}->>'reportEndDate') < to_char(current_date, 'YYYY-MM-DD') else false end`,
      ),
    )).orderBy(desc(projectsTable.updatedAt));
    res.json({ ok: true, client, projects });
  } catch (err) {
    req.log.error(err, "Failed to load client");
    res.status(500).json({ ok: false, error: "Failed to load client." });
  }
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const id = idParam(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Client not found." });
    return;
  }
  const parsed = clientValues(req.body, true);
  if (!parsed.values) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  const [client] = await db.update(clientsTable).set({ ...parsed.values, updatedAt: sql`now()` }).where(eq(clientsTable.id, id)).returning();
  if (!client) {
    res.status(404).json({ ok: false, error: "Client not found." });
    return;
  }
  if (typeof parsed.values.companyName === "string") {
    await db.update(projectsTable).set({ client: parsed.values.companyName, updatedAt: sql`now()` }).where(eq(projectsTable.clientId, id));
  }
  res.json({ ok: true, client });
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const id = idParam(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Client not found." });
    return;
  }
  const [client] = await db.delete(clientsTable).where(eq(clientsTable.id, id)).returning({ id: clientsTable.id });
  if (!client) {
    res.status(404).json({ ok: false, error: "Client not found." });
    return;
  }
  res.json({ ok: true });
});

const CLONE_DATA_KEYS = new Set([
  "reportDate", "reportEndDate", "schedule", "rooms", "riggingPlan", "loadPlan",
  "equipment", "departments", "notes", "currency", "timezone",
]);

router.post("/clients/:clientId/projects/:projectId/clone", async (req, res): Promise<void> => {
  const clientId = idParam(req.params.clientId);
  const projectId = idParam(req.params.projectId);
  if (!UUID_PATTERN.test(clientId) || !UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  const parsed = strictBody(req.body ?? {}, new Set(["name", "easyjob_number"]));
  if (!parsed.body) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  const name = textField(parsed.body, "name", 200);
  const easyjob = textField(parsed.body, "easyjob_number", 100);
  if (name.error || easyjob.error) {
    res.status(400).json({ ok: false, error: name.error ?? easyjob.error });
    return;
  }
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const access = await getEmployeeProjectAccess(projectId, userId);
    if (!access) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (!isProjectWriter(access)) {
      res.status(403).json({ ok: false, error: "Project is read-only." });
      return;
    }
    const [source] = await db.select().from(projectsTable).where(and(
      eq(projectsTable.id, projectId), eq(projectsTable.clientId, clientId),
    )).limit(1);
    if (!source) {
      res.status(404).json({ ok: false, error: "Project not found for this client." });
      return;
    }
    const sourceData = plainObject(source.data) ? source.data : {};
    const data: JsonObject = { status: "draft" };
    for (const key of CLONE_DATA_KEYS) if (key in sourceData) data[key] = sourceData[key];
    const organization = await getOrganizationSettings();
    const projectData = projectDataWithOrganizationDefaults(
      data,
      organizationDefaultsSnapshot(organization),
    );
    const project = await db.transaction(async (tx) => {
      const [created] = await tx.insert(projectsTable).values({
        userId,
        name: name.value ?? `${source.name} (copy)`,
        venue: source.venue,
        client: source.client,
        venueId: source.venueId,
        clientId: source.clientId,
        clonedFromProjectId: source.id,
        easyjobNumber: easyjob.value || null,
        data: projectData,
      }).returning();
      if (!created) throw new Error("Project clone insert returned no row.");
      await tx.insert(projectFinanceSettingsTable).values({
        projectId: created.id,
        ...projectFinanceSeed(projectData),
        updatedByUserId: userId,
      });
      return created;
    });
    res.status(201).json({
      ok: true,
      project: project ? {
        ...project,
        easyjob_number: project.easyjobNumber,
        venue_id: project.venueId,
        client_id: project.clientId,
        cloned_from_project_id: project.clonedFromProjectId,
      } : project,
    });
  } catch (err) {
    req.log.error(err, "Failed to clone project");
    res.status(500).json({ ok: false, error: "Failed to clone project." });
  }
});

export default router;