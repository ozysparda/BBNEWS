import app from "./app";

// Vercel serverless functions expect a default export that is a Node.js request handler.
// The Express application is already a request handler, so we can export it directly.
export default app;
