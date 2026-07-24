import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./src/app.ts";

const PORT = 3000;

// VITE OR STATIC ASSETS ROUTING FOR DEV & STANDALONE CONTAINER
if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Export app for Vercel Serverless Functions fallback
export default app;

// Start Server listening (for Cloud Run / container / dev environments)
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
