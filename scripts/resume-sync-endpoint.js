import { createServer } from "node:http";
import { getResumeSyncPaths, handleStandaloneResumeSyncRequest } from "./resume-sync-core.js";

const host = process.env.RESUME_SYNC_HOST ?? "127.0.0.1";
const port = Number(process.env.RESUME_SYNC_PORT ?? 8787);
const { outputDir, outputFile, resumeSyncRoute } = getResumeSyncPaths();

const server = createServer((request, response) => {
  handleStandaloneResumeSyncRequest(request, response);
});

server.listen(port, host, () => {
  console.log(`Resume sync endpoint listening at http://${host}:${port}${resumeSyncRoute}`);
  console.log(`Latest sync package will be saved to ${outputFile}`);
  console.log(`Per-platform sync files will be saved under ${outputDir}`);
});
