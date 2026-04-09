/**
 * Exit 0 = nenhum utilizador (convém correr prisma db seed).
 * Exit 2 = já existem utilizadores.
 * Exit 1 = erro ao consultar a base.
 */
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const n = await prisma.user.count();
    process.exit(n === 0 ? 0 : 2);
  } catch {
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
