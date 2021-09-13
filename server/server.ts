import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { api } from "./api";
const port = +process.env.PORT || 8080;
const app = new App()
  .use(
    cors({
      allowedHeaders: ["Content-Type", "Authentication"],
      exposedHeaders: [],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      optionsSuccessStatus: 204,
      maxAge: 86400,
    })
  )
  .use("/api", api)
  .listen(port, () => console.log(`Listening on http://localhost:${port}`));
