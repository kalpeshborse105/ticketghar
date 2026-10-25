import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, auditLogs } from '@/src/db/schema.ts';
import { requireAdmin } from '@/src/lib/admin-auth.ts';
import { sql } from 'drizzle-orm';

interface CandidateVenue {
  name: string;
  nameMr: string;
  address: string;
  city: string;
  districtId?: number;
  cityId?: number;
  totalCapacity?: number;
  facilities?: string[];
  ownershipType?: string;
  verificationStatus?: 'verified' | 'unverified';
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action = 'preview', venues: candidateList = [] } = body;

    if (!Array.isArray(candidateList) || candidateList.length === 0) {
      return NextResponse.json(
        { error: 'Provide a non-empty array of candidate venues to process.' },
        { status: 400 }
      );
    }

    // Fetch existing venues for duplicate detection
    const existingVenues = await db.select().from(venues);

    const validationResults = candidateList.map((cand: CandidateVenue) => {
      const trimmedName = (cand.name || '').trim();
      const trimmedCity = (cand.city || '').trim();
      const trimmedAddress = (cand.address || '').trim();

      if (!trimmedName || !cand.nameMr || !trimmedAddress || !trimmedCity) {
        return {
          candidate: cand,
          status: 'invalid',
          reason: 'Missing required fields (name, Marathi name, address, or city)',
        };
      }

      // Duplicate match: case-insensitive check on name + city
      const match = existingVenues.find(
        (e) =>
          e.name.toLowerCase() === trimmedName.toLowerCase() &&
          e.city.toLowerCase() === trimmedCity.toLowerCase()
      );

      if (match) {
        return {
          candidate: cand,
          status: 'duplicate',
          existingVenueId: match.id,
          reason: `Venue "${match.name}" already exists in ${match.city} (ID: ${match.id})`,
        };
      }

      return {
        candidate: cand,
        status: 'valid',
        reason: 'Ready for import',
      };
    });

    if (action === 'preview') {
      const validCount = validationResults.filter((r) => r.status === 'valid').length;
      const duplicateCount = validationResults.filter((r) => r.status === 'duplicate').length;
      const invalidCount = validationResults.filter((r) => r.status === 'invalid').length;

      return NextResponse.json({
        action: 'preview',
        summary: {
          total: candidateList.length,
          valid: validCount,
          duplicates: duplicateCount,
          invalid: invalidCount,
        },
        results: validationResults,
      });
    }

    if (action === 'confirm') {
      const validCandidates = validationResults
        .filter((r) => r.status === 'valid')
        .map((r) => r.candidate);

      if (validCandidates.length === 0) {
        return NextResponse.json(
          {
            error: 'No valid non-duplicate candidates to import.',
            validationResults,
          },
          { status: 400 }
        );
      }

      const insertedRecords: any[] = [];
      for (const cand of validCandidates) {
        const [newVenue] = await db
          .insert(venues)
          .values({
            name: cand.name.trim(),
            nameMr: cand.nameMr.trim(),
            address: cand.address.trim(),
            city: cand.city.trim(),
            districtId: cand.districtId ? Number(cand.districtId) : null,
            cityId: cand.cityId ? Number(cand.cityId) : null,
            totalCapacity: cand.totalCapacity ? Number(cand.totalCapacity) : 500,
            facilities: cand.facilities ? JSON.stringify(cand.facilities) : null,
            ownershipType: cand.ownershipType || 'municipal',
            verificationStatus: cand.verificationStatus || 'unverified',
            isTemplate: 1,
            // Capacity is as provided by admin — seat layout must be configured separately
            hasSeatLayout: 0,
          })
          .returning();

        insertedRecords.push(newVenue);
      }

      // Audit Log
      await db.insert(auditLogs).values({
        actorId: 'admin_importer',
        actorRole: 'super_admin',
        action: 'IMPORT_VENUES',
        entityType: 'venue',
        entityId: `batch-${Date.now()}`,
        details: JSON.stringify({ count: insertedRecords.length }),
      });

      return NextResponse.json({
        success: true,
        action: 'confirm',
        importedCount: insertedRecords.length,
        venues: insertedRecords,
      });
    }

    return NextResponse.json({ error: 'Invalid action specified. Use "preview" or "confirm".' }, { status: 400 });
  } catch (error: any) {
    console.error('Error importing venues:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
