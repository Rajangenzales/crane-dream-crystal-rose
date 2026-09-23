/**
 * Provider-neutral deployed-app PWA middleware for FirmOS.
 *
 * This middleware owns standards-based PWA behavior only. It deliberately has
 * no vendor-specific routes, identity imports, extension scripts, or external
 * platform metadata.
 */
import installPageTemplate from "../../scripts/install-page.html?raw";

interface PwaEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function appName(): string {
  return String(process.env.VITE_APP_NAME ?? "FirmOS").trim() || "FirmOS";
}

function requestHost(event: PwaEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ??
    event.req.headers.get("host") ??
    event.url.host
  );
}

function acceptsHtml(value: string | null): boolean {
  return !value || value.includes("text/html") || value.includes("*/*");
}

function isInstallQuery(url: string): boolean {
  const params = new URL(url, "http://localhost").searchParams;
  return (
    (params.get("install") === "1" || params.get("install") === "true") &&
    (params.get("platform") ?? "").toLowerCase() === "ios"
  );
}

function isDocumentPath(pathname: string): boolean {
  return !pathname.startsWith("/api/") && !/\.[a-z0-9]+$/i.test(pathname);
}

function manifest(): string {
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
  });
}

function renderInstallPage(url: string): string {
  return installPageTemplate
    .replaceAll("{{APP_NAME}}", appName())
    .replaceAll("{{APP_URL}}", url.split("?", 1)[0] ?? "/");
}

function htmlMeta(): string {
  const name = appName().replaceAll('"', '&quot;');
  return [
    `<meta property="og:title" content="${name}">`,
    `<meta property="og:site_name" content="${name}">`,
    '<meta property="og:type" content="website">',
  ].join("\n");
}

function injectHead(html: string): string {
  const tags = [
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    `<meta name="apple-mobile-web-app-title" content="${appName().replaceAll('"', '&quot;')}">`,
    '<meta name="theme-color" content="#ffffff">',
    htmlMeta(),
  ].join("\n");
  return html.replace(/<\/head>/i, `${tags}\n</head>`);
}

function injectHeadStreaming(response: Response): Response {
  if (!response.body) return response;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";
  const transformed = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffered += decoder.decode(chunk, { stream: true });
        const marker = /<\/head>/i;
        const match = marker.exec(buffered);
        if (!match) return;
        const before = buffered.slice(0, match.index);
        const after = buffered.slice(match.index);
        controller.enqueue(encoder.encode(injectHead(before + after)));
        buffered = "";
      },
      flush(controller) {
        buffered += decoder.decode();
        if (buffered) controller.enqueue(encoder.encode(injectHead(buffered)));
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function firmosPwaMiddleware(
  event: PwaEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  if ((event.req.method ?? "GET").toUpperCase() !== "GET") return next();

  const path = event.url.pathname;
  const urlWithQuery = path + event.url.search;

  if (path === "/manifest.webmanifest" || path === "/manifest.json") {
    return new Response(manifest(), {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (isInstallQuery(urlWithQuery) && isDocumentPath(path) && acceptsHtml(event.req.headers.get("accept"))) {
    return new Response(renderInstallPage(urlWithQuery), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (!isDocumentPath(path)) return next();

  const result = await next();
  if (
    result instanceof Response &&
    result.body &&
    String(result.headers.get("content-type") ?? "").includes("text/html") &&
    !result.headers.get("content-encoding")
  ) {
    return injectHeadStreaming(result);
  }
  return result;
}
