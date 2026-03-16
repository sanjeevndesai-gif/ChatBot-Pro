#!/usr/bin/env node
/**
 * ChatBot-Pro MCP Server
 * ----------------------
 * Provides tools to test every microservice:
 *   auth-service, book-appointment, chat, i18n-service
 *
 * Responses from each service are returned as JSON so Copilot can
 * reason about them and suggest next steps.
 */

const readline = require("readline");

// ─────────────────────────────────────────────────────────────────────────────
// Config — override via env vars or edit defaults below
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  gatewayUrl: process.env.GATEWAY_URL || "http://localhost:8080",
  authUrl:    process.env.AUTH_URL    || "http://localhost:8082",
  i18nUrl:    process.env.I18N_URL    || "http://localhost:9092",
  bookUrl:    process.env.BOOK_URL    || "http://localhost:9091",
  chatUrl:    process.env.CHAT_URL    || "http://localhost:9090",
};

// JWT token cache (populated by auth_login)
let cachedToken = null;

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────────────────────────────────────
async function httpRequest(method, url, body, token) {
  const { default: fetch } = await import("node-fetch").catch(() => {
    // node-fetch not installed — fall back to native fetch (Node 18+)
    return { default: globalThis.fetch };
  });

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, ok: res.ok, body: data };
  } catch (err) {
    return { status: 0, ok: false, body: null, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS = [

  // ── HEALTH ─────────────────────────────────────────────────────────────────
  {
    name: "health_check_all",
    description: "Ping the actuator/health endpoint of every service and return a summary table showing which are UP or DOWN.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },

  // ── AUTH SERVICE ───────────────────────────────────────────────────────────
  {
    name: "auth_register",
    description: "Register a new user in the auth-service. Calls POST /auth-service.",
    inputSchema: {
      type: "object",
      properties: {
        fullname:     { type: "string", description: "User's full name" },
        email:        { type: "string", description: "Email address" },
        phone_number: { type: "string", description: "Phone number" },
        password:     { type: "string", description: "Plain-text password (will be hashed by the service)" },
      },
      required: ["fullname", "email", "phone_number", "password"],
    },
  },
  {
    name: "auth_login",
    description: "Login to auth-service and cache the returned JWT. Calls POST /auth-service/login. The token is automatically used in subsequent requests.",
    inputSchema: {
      type: "object",
      properties: {
        email:    { type: "string" },
        password: { type: "string" },
      },
      required: ["email", "password"],
    },
  },
  {
    name: "auth_get_token",
    description: "Return the currently cached JWT token (set by auth_login).",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "auth_find_all",
    description: "Fetch all users from auth-service. Requires JWT.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "auth_find_by_id",
    description: "Find a user by Mongo _id. Requires JWT.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "auth_oauth2_token",
    description: "Exchange client credentials for an OAuth2 token via POST /oauth2/token.",
    inputSchema: {
      type: "object",
      properties: {
        client_id:     { type: "string", default: "chatbot-client" },
        client_secret: { type: "string", default: "chatbot-secret" },
        grant_type:    { type: "string", default: "client_credentials" },
        scope:         { type: "string", default: "api.read api.write" },
      },
      required: [],
    },
  },

  // ── i18n SERVICE ───────────────────────────────────────────────────────────
  {
    name: "i18n_get_all",
    description: "GET /i18n/labels — fetch all labels from i18n-service. Requires JWT.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "i18n_translate",
    description: "GET /i18n/labels/translate — returns a flat key→value map for a namespace + locale.",
    inputSchema: {
      type: "object",
      properties: {
        namespace: { type: "string", description: "e.g. common, errors, dashboard" },
        locale:    { type: "string", description: "e.g. en, fr, hi", default: "en" },
      },
      required: ["namespace"],
    },
  },
  {
    name: "i18n_create_label",
    description: "POST /i18n/labels — create a single label. Requires JWT.",
    inputSchema: {
      type: "object",
      properties: {
        key:       { type: "string", description: "e.g. common.submit" },
        locale:    { type: "string", description: "e.g. en" },
        value:     { type: "string", description: "Translated text" },
        namespace: { type: "string", description: "e.g. common" },
      },
      required: ["key", "locale", "value"],
    },
  },
  {
    name: "i18n_bulk_upsert",
    description: "POST /i18n/labels/bulk — seed multiple labels at once. Pass an array of {key, locale, value, namespace} objects.",
    inputSchema: {
      type: "object",
      properties: {
        labels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key:       { type: "string" },
              locale:    { type: "string" },
              value:     { type: "string" },
              namespace: { type: "string" },
            },
            required: ["key", "locale", "value"],
          },
        },
      },
      required: ["labels"],
    },
  },
  {
    name: "i18n_get_by_locale",
    description: "GET /i18n/labels/by-locale?locale= — all labels for a locale.",
    inputSchema: {
      type: "object",
      properties: { locale: { type: "string", default: "en" } },
      required: ["locale"],
    },
  },
  {
    name: "i18n_get_by_namespace",
    description: "GET /i18n/labels/by-namespace?namespace= — all labels in a namespace.",
    inputSchema: {
      type: "object",
      properties: { namespace: { type: "string" } },
      required: ["namespace"],
    },
  },
  {
    name: "i18n_delete_label",
    description: "DELETE /i18n/labels/{id} — delete a label by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },

  // ── BOOK APPOINTMENT ──────────────────────────────────────────────────────
  {
    name: "book_get_all",
    description: "GET /book — fetch all appointments. Requires JWT.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "book_create",
    description: "POST /book — create a new appointment. Pass any JSON fields the service accepts.",
    inputSchema: {
      type: "object",
      properties: {
        payload: {
          type: "object",
          description: "Appointment data as key-value pairs, e.g. {patientName, date, doctorId}",
        },
      },
      required: ["payload"],
    },
  },
  {
    name: "book_get_by_id",
    description: "GET /book/{id} — fetch a single appointment by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "book_delete",
    description: "DELETE /book/{id} — delete an appointment.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },

  // ── GENERIC ───────────────────────────────────────────────────────────────
  {
    name: "raw_request",
    description: "Make any raw HTTP call to any of the services. Useful for testing edge cases.",
    inputSchema: {
      type: "object",
      properties: {
        method:  { type: "string", enum: ["GET","POST","PUT","DELETE","PATCH"], default: "GET" },
        url:     { type: "string", description: "Full URL, e.g. http://localhost:8080/i18n/labels" },
        body:    { type: "object", description: "Request body (optional)" },
        use_token: { type: "boolean", description: "Attach cached JWT token", default: true },
      },
      required: ["url"],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tool handlers
// ─────────────────────────────────────────────────────────────────────────────
async function callTool(name, args) {
  const g = CONFIG.gatewayUrl;
  const token = () => cachedToken;

  switch (name) {

    // health
    case "health_check_all": {
      const services = [
        { name: "gateway",          url: `${CONFIG.gatewayUrl}/actuator/health` },
        { name: "auth-service",     url: `${CONFIG.authUrl}/actuator/health` },
        { name: "i18n-service",     url: `${CONFIG.i18nUrl}/actuator/health` },
        { name: "book-appointment", url: `${CONFIG.bookUrl}/actuator/health` },
        { name: "chat",             url: `${CONFIG.chatUrl}/actuator/health` },
      ];
      const results = await Promise.all(services.map(async (s) => {
        const r = await httpRequest("GET", s.url, null, null);
        return { service: s.name, status: r.error ? "UNREACHABLE" : (r.body?.status || r.status) };
      }));
      return { results };
    }

    // auth
    case "auth_register": {
      const r = await httpRequest("POST", `${CONFIG.authUrl}/auth-service`, args, null);
      return r;
    }
    case "auth_login": {
      const r = await httpRequest("POST", `${CONFIG.authUrl}/auth-service/login`, args, null);
      if (r.ok && r.body?.token) {
        cachedToken = r.body.token;
        return { ...r, cached_token: "JWT token cached for future requests." };
      }
      if (r.ok && r.body?.access_token) {
        cachedToken = r.body.access_token;
        return { ...r, cached_token: "JWT token cached for future requests." };
      }
      return r;
    }
    case "auth_get_token": {
      return { token: cachedToken || "No token cached. Run auth_login first." };
    }
    case "auth_find_all": {
      return httpRequest("GET", `${CONFIG.authUrl}/auth-service/findall`, null, token());
    }
    case "auth_find_by_id": {
      return httpRequest("GET", `${CONFIG.authUrl}/auth-service/find/${args.id}`, null, token());
    }
    case "auth_oauth2_token": {
      const body = {
        client_id:     args.client_id     || "chatbot-client",
        client_secret: args.client_secret || "chatbot-secret",
        grant_type:    args.grant_type    || "client_credentials",
        scope:         args.scope         || "api.read api.write",
      };
      const r = await httpRequest("POST", `${CONFIG.authUrl}/oauth2/token`, body, null);
      if (r.ok && r.body?.access_token) {
        cachedToken = r.body.access_token;
        return { ...r, cached_token: "JWT token cached." };
      }
      return r;
    }

    // i18n (via gateway)
    case "i18n_get_all": {
      return httpRequest("GET", `${g}/i18n/labels`, null, token());
    }
    case "i18n_translate": {
      const locale = args.locale || "en";
      return httpRequest("GET", `${g}/i18n/labels/translate?namespace=${args.namespace}&locale=${locale}`, null, token());
    }
    case "i18n_create_label": {
      return httpRequest("POST", `${g}/i18n/labels`, args, token());
    }
    case "i18n_bulk_upsert": {
      return httpRequest("POST", `${g}/i18n/labels/bulk`, args.labels, token());
    }
    case "i18n_get_by_locale": {
      return httpRequest("GET", `${g}/i18n/labels/by-locale?locale=${args.locale}`, null, token());
    }
    case "i18n_get_by_namespace": {
      return httpRequest("GET", `${g}/i18n/labels/by-namespace?namespace=${args.namespace}`, null, token());
    }
    case "i18n_delete_label": {
      return httpRequest("DELETE", `${g}/i18n/labels/${args.id}`, null, token());
    }

    // book (via gateway)
    case "book_get_all": {
      return httpRequest("GET", `${g}/book`, null, token());
    }
    case "book_create": {
      return httpRequest("POST", `${g}/book`, args.payload, token());
    }
    case "book_get_by_id": {
      return httpRequest("GET", `${g}/book/${args.id}`, null, token());
    }
    case "book_delete": {
      return httpRequest("DELETE", `${g}/book/${args.id}`, null, token());
    }

    // raw
    case "raw_request": {
      const t = args.use_token !== false ? token() : null;
      return httpRequest(args.method || "GET", args.url, args.body || null, t);
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP JSON-RPC transport (stdio)
// ─────────────────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

rl.on("line", async (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return; }

  const { id, method, params } = req;

  if (method === "initialize") {
    return send({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "chatbot-pro-tester", version: "1.0.0" },
      },
    });
  }

  if (method === "tools/list") {
    return send({
      jsonrpc: "2.0", id,
      result: { tools: TOOLS },
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    try {
      const result = await callTool(name, args || {});
      return send({
        jsonrpc: "2.0", id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      });
    } catch (err) {
      return send({
        jsonrpc: "2.0", id,
        result: {
          content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
          isError: true,
        },
      });
    }
  }

  // notifications / other methods — no response needed
});
