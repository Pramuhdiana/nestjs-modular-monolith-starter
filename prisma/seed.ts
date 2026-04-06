/**
 * Seed database — idempotent dan aman dijalankan berulang.
 *
 * Mode:
 * - minimal: hanya produk baseline
 * - demo: user demo + produk + sample order
 *
 * Default:
 * - production  => minimal
 * - non-prod    => demo
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
type SeedMode = 'minimal' | 'demo';

function resolveSeedMode(): SeedMode {
  const raw = process.env.SEED_MODE?.toLowerCase();
  if (raw === 'minimal' || raw === 'demo') {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'minimal' : 'demo';
}

function assertSafeSeed(mode: SeedMode) {
  const isProd = process.env.NODE_ENV === 'production';
  const allowDemoInProd = process.env.ALLOW_DEMO_SEED === 'true';
  if (isProd && mode === 'demo' && !allowDemoInProd) {
    throw new Error(
      'Refusing demo seed in production. Use SEED_MODE=minimal or set ALLOW_DEMO_SEED=true explicitly.',
    );
  }
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'admin' },
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: { role: 'user' },
    create: {
      email: 'buyer@example.com',
      passwordHash,
      role: 'user',
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    // Isi kolom baru di seed demo agar env local langsung punya contoh data valid enum/boolean.
    update: { fullName: 'Demo Admin', jenisKelamin: 'LAKI_LAKI', isHead: true },
    create: { userId: admin.id, fullName: 'Demo Admin', jenisKelamin: 'LAKI_LAKI', isHead: true },
  });

  await prisma.profile.upsert({
    where: { userId: buyer.id },
    update: { fullName: 'Demo Buyer', jenisKelamin: 'PEREMPUAN', isHead: false },
    create: {
      userId: buyer.id,
      fullName: 'Demo Buyer',
      jenisKelamin: 'PEREMPUAN',
      isHead: false,
    },
  });

  return { admin, buyer };
}

async function seedProducts() {
  const products = [
    { sku: 'DEMO-001', name: 'Demo Product A', priceCents: 10000, active: true },
    { sku: 'DEMO-002', name: 'Demo Product B', priceCents: 25000, active: true },
    { sku: 'DEMO-003', name: 'Demo Product C', priceCents: 17500, active: true },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        priceCents: product.priceCents,
        active: product.active,
      },
      create: product,
    });
  }

  return prisma.product.findMany({ orderBy: { id: 'asc' } });
}

async function seedSampleOrder(userId: number, products: { id: number; priceCents: number }[]) {
  if (products.length < 2) return;

  const existing = await prisma.order.findFirst({ where: { userId } });
  if (existing) return;

  const lines = [
    { productId: products[0].id, quantity: 2, unitPriceCents: products[0].priceCents },
    { productId: products[1].id, quantity: 1, unitPriceCents: products[1].priceCents },
  ];
  const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        status: 'PENDING',
        totalCents,
      },
    });

    await tx.orderItem.createMany({
      data: lines.map((line) => ({ ...line, orderId: order.id })),
    });
  });
}

async function main() {
  const mode = resolveSeedMode();
  assertSafeSeed(mode);

  const products = await seedProducts();
  console.log(`Seed mode: ${mode}`);
  console.log(`Products seeded: ${products.length}`);

  if (mode === 'demo') {
    const { admin, buyer } = await seedUsers();
    await seedSampleOrder(buyer.id, products);

    console.log('Demo users:');
    console.log('- admin@example.com / password123');
    console.log('- buyer@example.com / password123');
    console.log(`Admin id: ${admin.id}, Buyer id: ${buyer.id}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
