/**
 * One-off: verify axios + FormData (same interceptor pattern as api.ts) against local API.
 * Run from repo: node client2/scripts/verify-axios-formdata-upload.mjs
 */
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    const h = config.headers;
    if (typeof h.delete === "function") {
      h.delete("Content-Type");
      h.delete("content-type");
    } else {
      delete h["Content-Type"];
      delete h["content-type"];
    }
  }
  return config;
});

async function main() {
  const { data: loginData } = await api.post("/auth/login", {
    email: "admin@petground.com",
    password: "Admin123456",
  });
  const token = loginData.token;
  api.defaults.headers.common.Authorization = `Bearer ${token}`;

  const pngPath = path.join(__dirname, "..", ".tmp-verify-1x1.png");
  if (!fs.existsSync(pngPath)) {
    fs.writeFileSync(
      pngPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );
  }

  const unique = `AxiosFD-${Date.now()}`;
  const fd = new FormData();
  fd.append("title", unique);
  fd.append("description", "verify axios FormData interceptor");
  fd.append("validUntil", "2028-06-01");
  const buf = fs.readFileSync(pngPath);
  const blob = new Blob([buf], { type: "image/png" });
  fd.append("image", blob, "verify.png");

  const createRes = await api.post("/admin/promotions", fd);
  console.log("CREATE_STATUS", createRes.status);
  console.log("CREATE_BODY", JSON.stringify(createRes.data));

  const pub = await api.get("/promotions");
  const found = pub.data.find((p) => p.title === unique);
  console.log("PUBLIC_STATUS", pub.status);
  console.log("PUBLIC_FOUND", !!found);
  if (found) console.log("PUBLIC_IMAGE_URL", found.imageUrl);
}

main().catch((e) => {
  console.error("ERR", e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
