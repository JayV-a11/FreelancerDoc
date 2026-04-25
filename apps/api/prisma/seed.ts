/**
 * Prisma seed script — development data only.
 * Run: npm run db:seed --workspace=apps/api
 *
 * Creates:
 *   - 2 users (alice@freelancedoc.dev / bob@freelancedoc.dev)
 *   - 2 templates per user (PROPOSAL + CONTRACT)
 *   - 2 documents per user (DRAFT + SENT)
 *   - 1 document version per SENT document
 *
 * Passwords for both users: Seed@12345!  (dev only — NEVER use in production)
 */

import { PrismaClient, DocumentStatus, TemplateType } from '@prisma/client'
import * as argon2 from 'argon2'

// Load .env from monorepo root when running via tsx directly
// (Prisma CLI loads it automatically, tsx does not)
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../../../.env') })

const prisma = new PrismaClient({ log: ['error'] })

const DEV_PASSWORD = 'Seed@12345!'
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...')

  const passwordHash = await argon2.hash(DEV_PASSWORD, ARGON2_OPTIONS)

  // ── Users ──────────────────────────────────────────────────────────────

  const alice = await prisma.user.upsert({
    where: { email: 'alice@freelancedoc.dev' },
    update: { passwordHash },
    create: {
      name: 'Alice Freelancer',
      email: 'alice@freelancedoc.dev',
      passwordHash,
      professionalName: 'Alice Dev Studio',
      document: '12345678901',
      phone: '+55 11 91234-5678',
      address: 'Rua das Flores, 123 — São Paulo, SP',
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@freelancedoc.dev' },
    update: { passwordHash },
    create: {
      name: 'Bob Designer',
      email: 'bob@freelancedoc.dev',
      passwordHash,
      professionalName: 'Bob Creative',
      document: '98765432100',
      phone: '+55 21 99876-5432',
      address: 'Av. Copacabana, 456 — Rio de Janeiro, RJ',
    },
  })

  console.log(`  ✓ Users: ${alice.email}, ${bob.email}`)

  // ── Alice's templates ──────────────────────────────────────────────────

  const aliceProposalTemplate = await prisma.template.upsert({
    where: { id: '11111111-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '11111111-0000-0000-0000-000000000001',
      userId: alice.id,
      name: 'Web Development Proposal',
      type: TemplateType.PROPOSAL,
      content: {
        blocks: [
          {
            type: 'heading',
            value: 'Project Proposal — {{project_name}}',
          },
          {
            type: 'paragraph',
            value:
              'Dear {{client_name}},\n\nI am pleased to submit this proposal for your web development project.',
          },
          {
            type: 'price',
            label: 'Total Value',
            value: '{{total_value}} {{currency}}',
          },
          {
            type: 'paragraph',
            value:
              'This proposal is valid until {{valid_until}}.',
          },
        ],
      },
    },
  })

  const aliceContractTemplate = await prisma.template.upsert({
    where: { id: '11111111-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '11111111-0000-0000-0000-000000000002',
      userId: alice.id,
      name: 'Freelance Service Contract',
      type: TemplateType.CONTRACT,
      content: {
        blocks: [
          {
            type: 'heading',
            value: 'Service Agreement',
          },
          {
            type: 'paragraph',
            value:
              'This agreement is made between {{professional_name}} ("Service Provider") and {{client_name}} ("Client").',
          },
          {
            type: 'clause',
            title: 'Scope of Work',
            value: 'The Service Provider agrees to deliver the following: {{scope_of_work}}',
          },
          {
            type: 'clause',
            title: 'Payment',
            value:
              'The Client agrees to pay {{total_value}} {{currency}} upon completion.',
          },
        ],
      },
    },
  })

  console.log(`  ✓ Alice templates: ${aliceProposalTemplate.name}, ${aliceContractTemplate.name}`)

  // ── Bob's templates ────────────────────────────────────────────────────

  const bobProposalTemplate = await prisma.template.upsert({
    where: { id: '22222222-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '22222222-0000-0000-0000-000000000001',
      userId: bob.id,
      name: 'Brand Design Proposal',
      type: TemplateType.PROPOSAL,
      content: {
        blocks: [
          {
            type: 'heading',
            value: 'Design Proposal for {{client_name}}',
          },
          {
            type: 'paragraph',
            value: 'Thank you for considering my design services.',
          },
          {
            type: 'price',
            label: 'Investment',
            value: '{{total_value}} {{currency}}',
          },
        ],
      },
    },
  })

  console.log(`  ✓ Bob templates: ${bobProposalTemplate.name}`)

  // ── Alice's documents ──────────────────────────────────────────────────

  const aliceDraftDoc = await prisma.document.upsert({
    where: { id: 'aaaaaaaa-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      userId: alice.id,
      templateId: aliceProposalTemplate.id,
      title: 'Website Redesign Proposal — Acme Corp',
      clientName: 'Acme Corporation',
      clientEmail: 'cto@acme.example.com',
      clientDocument: '12345678000190',
      content: {
        blocks: [
          {
            type: 'heading',
            value: 'Project Proposal — Website Redesign',
          },
          {
            type: 'paragraph',
            value: 'Dear Acme Corporation,\n\nI am pleased to submit this proposal.',
          },
        ],
      },
      status: DocumentStatus.DRAFT,
      totalValue: 8500.0,
      currency: 'BRL',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  const aliceSentDoc = await prisma.document.upsert({
    where: { id: 'aaaaaaaa-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'aaaaaaaa-0000-0000-0000-000000000002',
      userId: alice.id,
      templateId: aliceContractTemplate.id,
      title: 'Service Contract — TechStart Ltd',
      clientName: 'TechStart Ltd',
      clientEmail: 'legal@techstart.example.com',
      content: {
        blocks: [
          {
            type: 'heading',
            value: 'Service Agreement',
          },
          {
            type: 'clause',
            title: 'Scope of Work',
            value: 'Full-stack web application development (12 weeks)',
          },
        ],
      },
      status: DocumentStatus.SENT,
      totalValue: 24000.0,
      currency: 'BRL',
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  })

  // Create a version snapshot for the SENT document
  await prisma.documentVersion.upsert({
    where: {
      documentId_version: {
        documentId: aliceSentDoc.id,
        version: 1,
      },
    },
    update: {},
    create: {
      documentId: aliceSentDoc.id,
      content: aliceSentDoc.content as object,
      version: 1,
    },
  })

  console.log(`  ✓ Alice documents: ${aliceDraftDoc.title}, ${aliceSentDoc.title}`)

  // ── Bob's documents ────────────────────────────────────────────────────

  const bobDraftDoc = await prisma.document.upsert({
    where: { id: 'bbbbbbbb-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'bbbbbbbb-0000-0000-0000-000000000001',
      userId: bob.id,
      templateId: bobProposalTemplate.id,
      title: 'Brand Identity Proposal — Startup X',
      clientName: 'Startup X',
      clientEmail: 'founder@startupx.example.com',
      content: {
        blocks: [
          {
            type: 'heading',
            value: 'Design Proposal for Startup X',
          },
        ],
      },
      status: DocumentStatus.DRAFT,
      totalValue: 4200.0,
      currency: 'BRL',
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })

  console.log(`  ✓ Bob documents: ${bobDraftDoc.title}`)

  console.log('\n✅ Seed complete!')
  console.log('\nDev credentials (development only):')
  console.log('  alice@freelancedoc.dev / Seed@12345!')
  console.log('  bob@freelancedoc.dev   / Seed@12345!')
}

main()
  .catch((err: unknown) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
