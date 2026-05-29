import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const app = express();
const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.");
}

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "15mb" }));

const baseSchema = {
  created_date: { type: Date, default: Date.now },
  updated_date: { type: Date, default: Date.now }
};

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    password_hash: { type: String, required: true },
    created_date: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    invoice_type: String,
    invoice_number: String,
    client_id: String,
    client_name: String,
    date: String,
    due_date: String,
    status: String,
    subtotal: Number,
    vat_rate: Number,
    vat_amount: Number,
    total_amount: Number,
    items: [mongoose.Schema.Types.Mixed],
    notes: String,
    attachment: mongoose.Schema.Types.Mixed
  },
  { versionKey: false }
);
invoiceSchema.index({ user_id: 1, date: 1 });

const clientSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: String,
    email: String,
    phone: String,
    address: String,
    addressLine1: String,
    addressLine2: String,
    townCity: String,
    county: String,
    postcode: String,
    notes: String
  },
  { versionKey: false }
);
const supplierSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: String,
    email: String,
    phone: String,
    address: String,
    addressLine1: String,
    addressLine2: String,
    townCity: String,
    county: String,
    postcode: String,
    notes: String
  },
  { versionKey: false }
);
const purchaseOrderSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    linked_type: String,
    linked_id: String,
    linked_name: String,
    purchase_order_no: String,
    quantity: Number,
    currency: String,
    unit_price: Number,
    total_value: Number,
    order_date: String,
    start_date: String,
    expiry_date: String,
    delivery_date: String
  },
  { versionKey: false }
);
const additionalExpenseSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    date: String,
    description: String,
    transaction_type: String,
    amount: Number,
    vat_applicable: Boolean,
    category: String,
    notes: String,
    source: String
  },
  { versionKey: false }
);
const recurringScheduleSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: String,
    client_id: String,
    client_name: String,
    interval: String,
    next_run_date: String,
    last_run_date: String,
    status: String,
    invoice_template: mongoose.Schema.Types.Mixed
  },
  { versionKey: false }
);
const timesheetStateSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, unique: true },
    timesheets: mongoose.Schema.Types.Mixed,
    publicHolidays: mongoose.Schema.Types.Mixed
  },
  { versionKey: false }
);
const profileSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, unique: true },
    firstName: String,
    lastName: String,
    phone: String,
    email: String,
    personalAddressLine1: String,
    personalAddressLine2: String,
    personalTownCity: String,
    personalCounty: String,
    personalPostcode: String,
    companyName: String,
    companyAddressLine1: String,
    townCity: String,
    county: String,
    postcode: String,
    companyPhone: String,
    companyEmail: String,
    companyWebsite: String,
    bankName: String,
    sortCode: String,
    accountNumber: String,
    ifscCode: String,
    iban: String,
    vatRegistrationNumber: String,
    companyRegistrationNumber: String
  },
  { versionKey: false }
);
const generatedRecordSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    invoice_number: String,
    client_id: String,
    client_name: String,
    date: String,
    purchase_order: String,
    reference: String,
    description: String,
    quantity: Number,
    unit_price: Number,
    vat_rate: Number,
    line_items: [mongoose.Schema.Types.Mixed],
    vat_amount: Number,
    subtotal: Number,
    total_amount: Number,
    from_name: String,
    from_address: String,
    from_phone: String,
    from_email: String,
    generated_pdf: mongoose.Schema.Types.Mixed
  },
  { versionKey: false }
);

const models: Record<string, any> = {
  users: mongoose.model("User", userSchema),
  invoices: mongoose.model("Invoice", invoiceSchema),
  clients: mongoose.model("Client", clientSchema),
  suppliers: mongoose.model("Supplier", supplierSchema),
  "additional-expenses": mongoose.model("AdditionalExpense", additionalExpenseSchema),
  "recurring-schedules": mongoose.model("RecurringSchedule", recurringScheduleSchema),
  "timesheet-state": mongoose.model("TimesheetState", timesheetStateSchema),
  profile: mongoose.model("Profile", profileSchema),
  "generated-records": mongoose.model("GeneratedRecord", generatedRecordSchema),
  "purchase-orders": mongoose.model("PurchaseOrder", purchaseOrderSchema)
};

const mapId = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  return obj;
};

const parseSort = (sort) => {
  if (!sort || typeof sort !== "string") return { created_date: -1 };
  if (sort.startsWith("-")) return { [sort.slice(1)]: -1 };
  return { [sort]: 1 };
};

/** Calendar-year slice plus previous December (for UK-style Q1 in Financial Breakdowns). */
const invoiceYearRangeFilter = (year: number) => ({
  $or: [
    { date: { $gte: `${year}-01-01`, $lt: `${year + 1}-01-01` } },
    { date: { $gte: `${year - 1}-12-01`, $lt: `${year}-01-01` } },
  ],
});

const getUserId = (req) => req.headers["x-user-id"];

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !name || password.length < 6) {
    return res.status(400).json({ error: "Name, email, and password (min 6 chars) are required" });
  }

  const existing = await models.users.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const password_hash = await bcrypt.hash(password, 10);
  const user = await models.users.create({
    email,
    name,
    password_hash
  });

  return res.status(201).json({
    user: { id: user._id.toString(), email: user.email, name: user.name }
  });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = await models.users.findOne({ email });

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  return res.json({
    user: { id: user._id.toString(), email: user.email, name: user.name }
  });
});
app.get("/api/auth/me", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Missing user id" });
  const user = await models.users.findById(userId);
  if (!user) return res.status(401).json({ error: "User not found" });
  return res.json({ id: user._id.toString(), email: user.email, name: user.name });
});

Object.entries(models).forEach(([route, Model]) => {
  if (route === "users") return;

  app.get(`/api/${route}`, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Missing user id" });
    const filter = { user_id: userId };
    if (route === "invoices") {
      const rawYear = req.query.year;
      const yearStr = rawYear === undefined || rawYear === null ? "" : String(rawYear).trim();
      if (yearStr && yearStr !== "all") {
        const y = Number(yearStr);
        if (!Number.isInteger(y) || y < 1900 || y > 2100) {
          return res.status(400).json({ error: "Invalid year" });
        }
        Object.assign(filter, invoiceYearRangeFilter(y));
      }
    }
    const docs = await Model.find(filter).sort(parseSort(req.query.sort));
    res.json(docs.map(mapId));
  });

  app.get(`/api/${route}/:id`, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Missing user id" });
    const doc = await Model.findOne({ _id: req.params.id, user_id: userId });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(mapId(doc));
  });

  app.post(`/api/${route}`, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Missing user id" });
    if (route === "timesheet-state" || route === "profile") {
      const doc = await Model.findOneAndUpdate(
        { user_id: userId },
        { ...req.body, user_id: userId, updated_date: new Date() },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.status(201).json(mapId(doc));
    }
    const doc = await Model.create({ ...req.body, user_id: userId });
    res.status(201).json(mapId(doc));
  });

  app.put(`/api/${route}/:id`, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Missing user id" });
    const updated = await Model.findOneAndUpdate(
      { _id: req.params.id, user_id: userId },
      { ...req.body, updated_date: new Date(), user_id: userId },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(mapId(updated));
  });

  app.delete(`/api/${route}/:id`, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Missing user id" });
    const deleted = await Model.findOneAndDelete({ _id: req.params.id, user_id: userId });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  });
});

const BACKUP_VERSION = 1;
const BACKUP_COLLECTIONS = [
  "clients",
  "suppliers",
  "purchase-orders",
  "invoices",
  "additional-expenses",
  "recurring-schedules",
  "generated-records",
  "profile",
  "timesheet-state"
];

const stripForExport = (doc) => {
  const obj = mapId(doc);
  const { user_id, ...rest } = obj;
  return rest;
};

const remapReference = (value, idMaps) => {
  if (!value || typeof value !== "string") return value;
  return idMaps.clients[value] || idMaps.suppliers[value] || value;
};

const prepareRecordForRestore = (record, route, userId, idMaps) => {
  const { id, user_id, _backup_id, ...fields } = record;
  const payload = { ...fields, user_id: userId, updated_date: new Date() };

  if (route === "invoices" || route === "recurring-schedules" || route === "generated-records") {
    if (payload.client_id) payload.client_id = remapReference(payload.client_id, idMaps);
  }

  if (route === "purchase-orders" && payload.linked_id) {
    const linkedType = String(payload.linked_type || "").toLowerCase();
    if (linkedType === "client" || linkedType === "clients") {
      payload.linked_id = idMaps.clients[payload.linked_id] || payload.linked_id;
    } else if (linkedType === "supplier" || linkedType === "suppliers") {
      payload.linked_id = idMaps.suppliers[payload.linked_id] || payload.linked_id;
    } else {
      payload.linked_id = remapReference(payload.linked_id, idMaps);
    }
  }

  return { oldId: id || _backup_id, payload };
};

app.get("/api/backup", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Missing user id" });

  try {
    const data = {};
    const counts = {};

    for (const route of BACKUP_COLLECTIONS) {
      const Model = models[route];
      const docs = await Model.find({ user_id: userId }).sort({ created_date: 1 });
      data[route] = docs.map(stripForExport);
      counts[route] = docs.length;
    }

    return res.json({
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      app: "invoice-manager",
      source_user_id: userId,
      data,
      meta: { counts }
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return res.status(500).json({ error: "Failed to create backup" });
  }
});

app.post("/api/restore", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Missing user id" });

  const backup = req.body?.backup ?? req.body;
  const mode = req.body?.mode === "merge" ? "merge" : "replace";

  if (!backup?.data || backup.app !== "invoice-manager") {
    return res.status(400).json({ error: "Invalid backup file format" });
  }

  if (backup.version && backup.version > BACKUP_VERSION) {
    return res.status(400).json({ error: "Backup version is newer than this app supports" });
  }

  try {
    const idMaps = { clients: {}, suppliers: {} };
    const restored = {};

    if (mode === "replace") {
      for (const route of BACKUP_COLLECTIONS) {
        await models[route].deleteMany({ user_id: userId });
      }
    }

    for (const route of BACKUP_COLLECTIONS) {
      const Model = models[route];
      const records = Array.isArray(backup.data[route]) ? backup.data[route] : [];
      let count = 0;

      for (const record of records) {
        const { oldId, payload } = prepareRecordForRestore(record, route, userId, idMaps);

        if (route === "profile" || route === "timesheet-state") {
          await Model.findOneAndUpdate(
            { user_id: userId },
            { ...payload, user_id: userId, updated_date: new Date() },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
          count += 1;
          continue;
        }

        const doc = await Model.create(payload);
        count += 1;

        if (oldId && (route === "clients" || route === "suppliers")) {
          idMaps[route][oldId] = doc._id.toString();
        }
      }

      restored[route] = count;
    }

    return res.json({ ok: true, mode, restored });
  } catch (error) {
    console.error("Restore failed:", error);
    return res.status(500).json({ error: "Failed to restore backup" });
  }
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

const start = async () => {
  try {
    await mongoose.connect(mongoUri, { dbName: "invoice-manager" });
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
};

start();
