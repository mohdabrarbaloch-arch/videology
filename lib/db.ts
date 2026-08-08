import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url) {
    const filePath = url.replace(/^file:/, "");
    if (filePath) return filePath;
  }
  return path.join(process.cwd(), "dev.db");
}

function createPrismaClient(): PrismaClient {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
