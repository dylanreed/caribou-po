import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  // For local dev without Turso credentials, use SQLite
  if (!tursoUrl || !tursoToken) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Missing required database credentials: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in production'
      )
    }
    // Local development fallback to SQLite
    return new PrismaClient()
  }

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

// Use a getter to lazily initialize the client at runtime, not build time
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return Reflect.get(globalForPrisma.prisma, prop)
  },
})
