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

const clientSchema = new mongoose.Schema(
  { ...baseSchema, user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, name: String, email: String, phone: String, address: String, notes: String },
  { versionKey: false }
);
const supplierSchema = new mongoose.Schema(
  { ...baseSchema, user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, name: String, email: String, phone: String, address: String, notes: String },
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

const models: Record<string, any> = {
  users: mongoose.model("User", userSchema),
  invoices: mongoose.model("Invoice", invoiceSchema),
  clients: mongoose.model("Client", clientSchema),
  suppliers: mongoose.model("Supplier", supplierSchema),
  "additional-expenses": mongoose.model("AdditionalExpense", additionalExpenseSchema),
  "recurring-schedules": mongoose.model("RecurringSchedule", recurringScheduleSchema)
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
    const docs = await Model.find({ user_id: userId }).sort(parseSort(req.query.sort));
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
