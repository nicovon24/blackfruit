import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { prisma } from "@/lib/prisma";
import { isAllowedLoginEmail } from "@/modules/auth/domain/login-allowlist";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.APP_URL;

if (!secret || !baseURL) {
  throw new Error("BETTER_AUTH_SECRET y APP_URL son obligatorias.");
}

export const auth = betterAuth({
  secret,
  baseURL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedLoginEmail(user.email)) {
            throw new APIError("FORBIDDEN", { message: "No se pudo crear la cuenta." });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
          if (!user || !isAllowedLoginEmail(user.email)) {
            throw new APIError("UNAUTHORIZED", { message: "Email o contraseña incorrectos." });
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-out") return;
      const session = await getSessionFromCtx(ctx, { disableCookieCache: true, disableRefresh: true });
      if (session && !isAllowedLoginEmail(session.user.email)) {
        throw new APIError("UNAUTHORIZED", { message: "Sesión no autorizada." });
      }
    }),
  },
  plugins: [admin()],
});
