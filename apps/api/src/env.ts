export const env = {
  port: Number(process.env.API_PORT ?? 4000),
  host: process.env.API_HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  redisUrl: process.env.REDIS_URL,
  databaseUrl: process.env.DATABASE_URL,
  logLevel: process.env.LOG_LEVEL ?? "info",
  baseUrl: process.env.BASE_URL ?? "http://localhost:4000",
  agentPortalUrl: process.env.AGENT_PORTAL_URL ?? "http://localhost:3000",
  canonicalCurrency: process.env.CANONICAL_CURRENCY ?? "INR",
};
