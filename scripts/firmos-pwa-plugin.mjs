/**
 * FirmOS PWA integration.
 *
 * Standards-based, provider-neutral PWA behavior. Vendor-specific extension
 * scripts, creator metadata, and vendor URLs are deliberately not injected.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INSTALL_PAGE_PATH = join(dirname(fileURLToPath(import.meta.url)), "install-page.html");

function appName() {
  return String(process.env.VITE_APP_NAME ?? "FirmOS").trim() || "FirmOS";
}

function acceptsHtml(accept) {
  const value = String(accept ?? "");
  return value === "" || value.includes("text/html") || value.includes("*/*");
}

function isInstallQuery(url) {
  const query = String(url ?? "").split("?", 2)[1] ?? "";
  const params = new URLSearchParams(query);
  return (params.get("install") === "1" || params.get("install") === "true") &&
    (params.get("platform") ?? "").toLowerCase() === "ios";
}

function isDocumentPath(pathname) {
  const path = String(pathname ?? "");
  return !path.startsWith("/api/") &&
    !path.startsWith("/@") &&
    !path.startsWith("/node_modules") &&
    !/\.[a-z0-9]+$/i.test(path);
}

function renderManifest() {
  const name = appName();
  return JSON.stringify({
    name,
    short_name: name,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [],
  }, null, 2);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInstallPage(url) {
  const template = readFileSync(INSTALL_PAGE_PATH, "utf8");
  return template
    .replaceAll("{{APP_NAME}}", escapeAttribute(appName()))
    .replaceAll("{{APP_URL}}", escapeAttribute(String(url ?? "/").split("?", 1)[0]));
}

function headTags() {
  const name = escapeAttribute(appName());
  return [
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    `<meta name="apple-mobile-web-app-title" content="${name}">`,
    '<meta name="theme-color" content="#ffffff">',
  ];
}

function injectHead(html) {
  const source = String(html);
  const existing = new Set();
  source.replace(/<link\b[^>]*>|<meta\b[^>]*>/gi, (tag) => {
    if (/rel=["']manifest["']/i.test(tag)) existing.add("manifest");
    if (/name=["']apple-mobile-web-app-capable["']/i.test(tag)) existing.add("capable");
    if (/name=["']apple-mobile-web-app-title["']/i.test(tag)) existing.add("title");
    if (/name=["']theme-color["']/i.test(tag)) existing.add("theme");
    return tag;
  });
  const tags = headTags().filter((tag) =>
    (tag.includes('rel="manifest"') && !existing.has("manifest")) ||
    (tag.includes('apple-mobile-web-app-capable') && !existing.has("capable")) ||
    (tag.includes('apple-mobile-web-app-title') && !existing.has("title")) ||
    (tag.includes('theme-color') && !existing.has("theme")),
  );
  if (!tags.length) return source;
  return source.replace(/<\/head>/i, `${tags.join("\n")}</head>`);
}

function sendHtml(res, html) {
  const body = Buffer.from(html, "utf8");
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-cache");
  res.setHeader("content-length", String(body.byteLength));
  res.end(body);
}

function servePwa(middlewares) {
  middlewares.use((req, res, next) => {
    const rawUrl = req.url ?? "";
    const pathOnly = rawUrl.split("?", 1)[0] ?? "";
    if ((req.method ?? "GET").toUpperCase() !== "GET") return next();

    if (pathOnly === "/manifest.webmanifest" || pathOnly === "/manifest.json") {
      const body = Buffer.from(renderManifest(), "utf8");
      res.statusCode = 200;
      res.setHeader("content-type", "application/manifest+json; charset=utf-8");
      res.setHeader("cache-control", "no-cache");
      res.setHeader("content-length", String(body.byteLength));
      res.end(body);
      return;
    }

    if (isInstallQuery(rawUrl) && isDocumentPath(pathOnly) && acceptsHtml(req.headers.accept)) {
      try {
        sendHtml(res, renderInstallPage(rawUrl));
      } catch (error) {
        console.error("[firmos-pwa] install page unavailable:", error);
        res.statusCode = 500;
        res.end("install page unavailable");
      }
      return;
    }

    next();
  });
}

function wrapHtmlResponses(middlewares) {
  middlewares.use((req, res, next) => {
    const rawUrl = req.url ?? "";
    const pathOnly = rawUrl.split("?", 1)[0] ?? "";
    const looksLikeDocument = (req.method ?? "GET").toUpperCase() === "GET" &&
      String(req.headers.accept ?? "").includes("text/html") &&
      !isInstallQuery(rawUrl) && isDocumentPath(pathOnly);
    if (!looksLikeDocument) return next();

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    let mode = null;
    let buffered = "";

    const decideMode = () => {
      if (mode) return mode;
      const isHtml = String(res.getHeader("content-type") ?? "").includes("text/html");
      const encoded = Boolean(res.getHeader("content-encoding"));
      mode = isHtml && !encoded ? "inject" : "passthrough";
      if (mode === "inject" && !res.headersSent) res.removeHeader("content-length");
      return mode;
    };

    const toText = (chunk, encoding) => {
      if (Buffer.isBuffer(chunk)) return chunk.toString("utf8");
      if (typeof chunk === "string") return Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8").toString("utf8");
      return Buffer.from(chunk).toString("utf8");
    };

    const flush = (final) => {
      if (!buffered) return;
      if (!final && !/<\/head>/i.test(buffered)) return;
      const output = /<\/head>/i.test(buffered) ? injectHead(buffered) : buffered;
      originalWrite(Buffer.from(output, "utf8"));
      buffered = "";
    };

    res.write = (chunk, encoding, cb) => {
      if (decideMode() === "passthrough") return originalWrite(chunk, encoding, cb);
      if (chunk) {
        buffered += toText(chunk, encoding);
        flush(false);
      }
      const callback = typeof encoding === "function" ? encoding : cb;
      if (typeof callback === "function") callback();
      return true;
    };

    res.end = (chunk, encoding, cb) => {
      const callback = typeof encoding === "function" ? encoding : cb;
      if (decideMode() === "passthrough") return originalEnd(chunk, encoding, cb);
      if (chunk) buffered += toText(chunk, encoding);
      flush(true);
      return originalEnd(undefined, undefined, callback);
    };

    next();
  });
}

export function firmosPwaPlugin() {
  return {
    name: "firmos:pwa",
    transformIndexHtml(html) {
      return injectHead(html);
    },
    configureServer(server) {
      servePwa(server.middlewares);
      wrapHtmlResponses(server.middlewares);
    },
    configurePreviewServer(server) {
      servePwa(server.middlewares);
      return () => wrapHtmlResponses(server.middlewares);
    },
  };
}
