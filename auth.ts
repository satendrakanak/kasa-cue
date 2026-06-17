import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export type AppRole = "admin" | "user";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").toLowerCase();
      const password = String(credentials?.password ?? "");
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash || !password) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toLowerCase() as AppRole,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    "kasa-cue-local-dev-secret-change-before-production",
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = String(user.email ?? profile?.email ?? "")
        .trim()
        .toLowerCase();

      if (!email) {
        return false;
      }

      await prisma.user.upsert({
        where: { email },
        update: {
          emailVerified: new Date(),
          image: user.image,
          name: user.name,
        },
        create: {
          email,
          emailVerified: new Date(),
          image: user.image,
          name: user.name,
          role: "user",
        },
      });

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: {
            email: token.email.toLowerCase(),
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role.toLowerCase() as AppRole;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "user";
      }

      return session;
    },
  },
});
