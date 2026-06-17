import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

if (existsSync(".env.production")) {
  loadEnv({ path: ".env.production" });
} else {
  loadEnv();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
