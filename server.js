const express = require("express");
const https   = require("https");
const path    = require("path");
const fs      = require("fs");
const app     = express();
const PORT    = process.env.PORT || 8080;
const TARGET  = "api.aicredits.in";

// Inject env vars into HTML at runtime — no secrets in code
app.get("/", (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const env = {
    API_KEY:      process.env.API_KEY      || "",
    API_BASE_URL: process.env.API_BASE_URL || "https://api.aicredits.in/v1",
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    GCP_PROJECT:  process.env.GCP_PROJECT  || "gen-lang-client-0794202345",
  };
  // inject before </head>
  html = html.replace(
    "<script>",
    `<script>window.__ENV = ${JSON.stringify(env)};</script>\n<script>`,
  );
  res.send(html);
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
