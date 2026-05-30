import { env } from "./env.js";
import { createServer } from "./server.js";

const app = createServer();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`vendme-backend-api listening on :${env.PORT}`);
});
