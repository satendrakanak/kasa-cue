import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

import type { AppRole } from "@/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AppRole;
  }
}
