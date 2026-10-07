import { config } from 'dotenv';
config({ override: true });

async function main() {
  const { db, pool } = await import('../src/db/index.ts');
  const { organizers, users } = await import('../src/db/schema.ts');
  const { hashPassword } = await import('../src/lib/auth-service.ts');
  const { eq } = await import('drizzle-orm');

  console.log('Testing organizer insert...');
  const testEmail = `test_org_${Date.now()}@example.com`;
  const cleanEmail = testEmail.toLowerCase();
  
  try {
    const [newOrganizer] = await db
      .insert(organizers)
      .values({
        name: 'Test Organizer',
        companyName: 'Test Org Ltd',
        email: cleanEmail,
        phone: '9876543210',
        city: 'Pune',
        verificationStatus: 'verified',
        commissionType: 'percentage',
        commissionRate: 600,
      })
      .returning();
    console.log('Organizer created:', newOrganizer);

    const generatedUid = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hashedPassword = hashPassword('TestPass123!');

    console.log('Attempting users insert...');
    const [user] = await db.insert(users).values({
      uid: generatedUid,
      email: cleanEmail,
      fullName: 'Test Organizer',
      phoneNumber: '9876543210',
      role: 'organizer',
      passwordHash: hashedPassword,
    }).returning();

    console.log('User created:', user);

    // Clean up
    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(organizers).where(eq(organizers.id, newOrganizer.id));
    console.log('Cleaned up test data.');
  } catch (err: any) {
    console.error('ERROR during test:', err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
