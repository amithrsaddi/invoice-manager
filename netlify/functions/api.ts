import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required for Netlify deployment.");
}

let cachedConnection = null;

const connectDb = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  cachedConnection = await mongoose.connect(mongoUri, {
    dbName: "invoice-manager"
  });

  return cachedConnection;
};

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

const timesheetStateSchema = new mongoose.Schema(
  {
    ...baseSchema,
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, unique: true },
    timesheets: mongoose.Schema.Types.Mixed,
    publicHolidays: mongoose.Schema.Types.Mixed
  },
  { versionKey: false }
);

const getModel = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

const modelMap = {
  users: getModel("User", userSchema),
  invoices: getModel("Invoice", invoiceSchema),
  clients: getModel("Client", clientSchema),
  suppliers: getModel("Supplier", supplierSchema),
  "additional-expenses": getModel("AdditionalExpense", additionalExpenseSchema),
  "recurring-schedules": getModel("RecurringSchedule", recurringScheduleSchema),
  "timesheet-state": getModel("TimesheetState", timesheetStateSchema)
};

const parseSort = (sort) => {
  if (!sort || typeof sort !== "string") return { created_date: -1 };
  if (sort.startsWith("-")) return { [sort.slice(1)]: -1 };
  return { [sort]: 1 };
};

const mapId = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  return obj;
};

const getUserId = (event) => event.headers?.["x-user-id"] || event.headers?.["X-User-Id"];

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: body == null ? "" : JSON.stringify(body)
});

export const handler = async (event) => {
  try {
    await connectDb();

    const path = (event.path || "")
      .replace(/^\/\.netlify\/functions\/api\/?/, "")
      .replace(/^\/api\/?/, "")
      .replace(/^\/+/, "");
    const [route, id] = path.split("/");
    const method = event.httpMethod.toUpperCase();
    const payload = event.body ? JSON.parse(event.body) : null;

    if (path === "health") return json(200, { ok: true });

    if (route === "auth") {
      if (method === "POST" && id === "register") {
        const email = String(payload?.email || "").trim().toLowerCase();
        const name = String(payload?.name || "").trim();
        const password = String(payload?.password || "");
        if (!email || !name || password.length < 6) {
          return json(400, { error: "Name, email, and password (min 6 chars) are required" });
        }
        const existing = await modelMap.users.findOne({ email });
        if (existing) return json(409, { error: "Email already registered" });
        const password_hash = await bcrypt.hash(password, 10);
        const user = await modelMap.users.create({
          email,
          name,
          password_hash
        });
        return json(201, {
          user: { id: user._id.toString(), email: user.email, name: user.name }
        });
      }

      if (method === "POST" && id === "login") {
        const email = String(payload?.email || "").trim().toLowerCase();
        const password = String(payload?.password || "");
        const user = await modelMap.users.findOne({ email });
        if (!user) return json(401, { error: "Invalid credentials" });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return json(401, { error: "Invalid credentials" });
        return json(200, {
          user: { id: user._id.toString(), email: user.email, name: user.name }
        });
      }

      if (method === "GET" && id === "me") {
        const userId = getUserId(event);
        if (!userId) return json(401, { error: "Missing user id" });
        const user = await modelMap.users.findById(userId);
        if (!user) return json(401, { error: "User not found" });
        return json(200, { id: user._id.toString(), email: user.email, name: user.name });
      }

      return json(404, { error: "Not found" });
    }

    const Model = modelMap[route];
    if (!Model || route === "users") return json(404, { error: "Not found" });

    const userId = getUserId(event);
    if (!userId) return json(401, { error: "Missing user id" });

    if (method === "GET" && !id) {
      const docs = await Model.find({ user_id: userId }).sort(parseSort(event.queryStringParameters?.sort));
      return json(200, docs.map(mapId));
    }

    if (method === "GET" && id) {
      const doc = await Model.findOne({ _id: id, user_id: userId });
      return doc ? json(200, mapId(doc)) : json(404, { error: "Not found" });
    }

    if (method === "POST" && !id) {
      if (route === "timesheet-state") {
        const doc = await Model.findOneAndUpdate(
          { user_id: userId },
          { ...(payload || {}), user_id: userId, updated_date: new Date() },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return json(201, mapId(doc));
      }
      const doc = await Model.create({ ...(payload || {}), user_id: userId });
      return json(201, mapId(doc));
    }

    if (method === "PUT" && id) {
      const doc = await Model.findOneAndUpdate(
        { _id: id, user_id: userId },
        { ...(payload || {}), updated_date: new Date(), user_id: userId },
        { new: true }
      );
      return doc ? json(200, mapId(doc)) : json(404, { error: "Not found" });
    }

    if (method === "DELETE" && id) {
      const doc = await Model.findOneAndDelete({ _id: id, user_id: userId });
      return doc ? json(204, null) : json(404, { error: "Not found" });
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Netlify API error:", error);
    return json(500, { error: "Internal server error", message: error.message });
  }
};
