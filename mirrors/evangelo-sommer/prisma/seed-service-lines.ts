import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const serviceLines = [
  {
    name: 'WOODGREEN LANDSCAPING',
    slug: 'woodgreen',
    description: 'Professional landscaping and lawn care services',
    color: 'bg-green-500',
    isActive: true
  },
  {
    name: 'White Knight Snow Removal',
    slug: 'whiteknight',
    description: 'Snow removal and winter maintenance services',
    color: 'bg-blue-400',
    isActive: true
  },
  {
    name: 'PUPAWALK PET SERVICES',
    slug: 'pupawalk',
    description: 'Professional pet walking and care services',
    color: 'bg-purple-500',
    isActive: true
  },
  {
    name: 'Creative Development',
    slug: 'creative',
    description: 'Web development and creative services',
    color: 'bg-pink-500',
    isActive: true
  }
]

async function main() {
  console.log('Seeding service lines...')

  for (const serviceLine of serviceLines) {
    const existing = await prisma.serviceLine.findUnique({
      where: { slug: serviceLine.slug }
    })

    if (!existing) {
      await prisma.serviceLine.create({
        data: serviceLine
      })
      console.log(`✓ Created service line: ${serviceLine.name}`)
    } else {
      console.log(`- Service line already exists: ${serviceLine.name}`)
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding service lines:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
