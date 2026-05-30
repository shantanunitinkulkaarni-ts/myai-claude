const express = require("express");
const https   = require("https");
const http    = require("http");
const path    = require("path");
const fs      = require("fs");
const app     = express();
const PORT    = process.env.PORT || 8080;
const TARGET  = "api.aicredits.in";
const GCP_PROJECT = process.env.GCP_PROJECT || "gen-lang-client-0794202345";

// Helper: get GCP access token from metadata server (works on Cloud Run)
async function getGCPToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "metadata.google.internal",
      path: "/computeMetadata/v1/instance/service-accounts/default/token",
      headers: { "Metadata-Flavor": "Google" }
    };
    http.get(options, res => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try { resolve(JSON.parse(body).access_token); }
        catch(e) { reject(new Error("Could not parse token: " + body)); }
      });
    }).on("error", reject);
  });
}

// Inject env vars into HTML at runtime — no secrets in code
app.get("/", (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const env = {
    API_KEY:      process.env.API_KEY      || "",
    API_BASE_URL: process.env.API_BASE_URL || "https://api.aicredits.in/v1",
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    GCP_PROJECT:  process.env.GCP_PROJECT  || "gen-lang-client-0794202345",
  };
  html = html.replace(
    "<script>",
    `<script>window.__ENV = ${JSON.stringify(env)};</script>\n<script>`,
  );
  res.send(html);
});

// GCP Logs endpoint — fetches latest errors from LeadNest Cloud Run
app.get("/gcp-logs", async (req, res) => {
  try {
    const token = await getGCPToken();
    const filter = [
      `resource.type="cloud_run_revision"`,
      `resource.labels.service_name="leadnest"`,
      `severity>=WARNING`,
      `timestamp>="${new Date(Date.now() - 3600000).toISOString()}"` // last 1 hour
    ].join(" ");

    const body = JSON.stringify({
      resourceNames: [`projects/${GCP_PROJECT}`],
      filter,
      orderBy: "timestamp desc",
      pageSize: 30
    });

    const options = {
      hostname: "logging.googleapis.com",
      path: "/v2/entries:list",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const logsReq = https.request(options, logsRes => {
      let data = "";
      logsRes.on("data", c => data += c);
      logsRes.on("end", () => {
        try { res.json(JSON.parse(data)); }
        catch(e) { res.status(500).json({ error: "Invalid response from GCP Logging", raw: data.slice(0, 500) }); }
      });
    });
    logsReq.on("error", e => res.status(500).json({ error: e.message }));
    logsReq.write(body);
    logsReq.end();

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy /v1/* to aicredits.in server-side — no CORS
app.use("/v1", (req, res) => {
  const body = [];
  req.on("data", c => body.push(c));
  req.on("end", () => {
    const payload = Buffer.concat(body);
    const opts = {
      hostname: TARGET, port: 443,
      path: "/v1" + req.path,
      method: req.method,
      headers: { ...req.headers, host: TARGET }
    };
    const pr = https.request(opts, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res);
    });
    pr.on("error", e => res.status(502).send("Proxy error: " + e.message));
    pr.write(payload);
    pr.end();
  });
});

app.use(express.static(__dirname));
app.listen(PORT, "0.0.0.0", () => console.log(`✅ MyAI running → http://0.0.0.0:${PORT}`));
