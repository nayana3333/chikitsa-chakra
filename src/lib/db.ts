import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Next.js clears the module registry on every hot reload in development, which
// would otherwise open a new connection pool per edit until Postgres refuses
// them. Caching on globalThis keeps a single client across reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and start the database with `npx prisma dev start -n chikitsa`.",
    );
  }

  // Prisma 7 requires an explicit driver adapter for SQL providers.
  //
  // The pool is capped deliberately. Pages fan several queries out with
  // Promise.all, and an uncapped pool will open a connection per query and
  // trip the server's own connection limit — which surfaces as an opaque
  // P1017 "server has closed the connection" partway through a page render.
  const adapter = new PrismaPg({
    connectionString,
    // Kept comfortably below the server's own connection limit. A dashboard
    // that fans several queries out with Promise.all will otherwise open one
    // connection per query and overshoot that limit, which the server answers
    // by closing the socket — surfacing as an opaque P1017 partway through a
    // page render. With a smaller ceiling `pg` queues the surplus instead.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    // Recycle connections rather than hold them indefinitely, so a database
    // restart during development doesn't leave a pool of dead sockets behind.
    maxLifetimeSeconds: 300,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
