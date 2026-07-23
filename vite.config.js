import { defineConfig } from "vite";
import path from "node:path";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function cleanUrlMiddleware(req, _res, next) {
  const raw = req.url ?? "";
  const q = raw.includes("?") ? "?" + raw.split("?")[1] : "";
  const url = raw.split("?")[0] ?? "";

  if (url === "/terms" || url === "/terms/") {
    req.url = "/terms.html" + q;
    return next();
  }
  if (url === "/privacy" || url === "/privacy/") {
    req.url = "/privacy.html" + q;
    return next();
  }
  if (url === "/how-it-works" || url === "/how-it-works/") {
    req.url = "/how-it-works.html" + q;
    return next();
  }
  if (url === "/press" || url === "/press/") {
    req.url = "/press.html" + q;
    return next();
  }
  if (url === "/support" || url === "/support/") {
    req.url = "/support.html" + q;
    return next();
  }
  if (url === "/delete-account" || url === "/delete-account/") {
    req.url = "/delete-account.html" + q;
    return next();
  }
  next();
}

export default defineConfig(() => {
  return {
    root: ".",
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      allowedHosts: true,
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      strictPort: false,
      allowedHosts: true,
    },
    plugins: [
      {
        name: "ukti-clean-urls",
        configureServer(server) {
          server.middlewares.use(cleanUrlMiddleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(cleanUrlMiddleware);
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          "how-it-works": resolve(__dirname, "how-it-works.html"),
          press: resolve(__dirname, "press.html"),
          privacy: resolve(__dirname, "privacy.html"),
          terms: resolve(__dirname, "terms.html"),
          support: resolve(__dirname, "support.html"),
          "delete-account": resolve(__dirname, "delete-account.html"),
        },
      },
    },
  };
});
