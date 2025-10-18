import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@miles.com' },
    update: {},
    create: {
      email: 'admin@miles.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { email: 'manager.stavanger@miles.com' },
    update: {},
    create: {
      email: 'manager.stavanger@miles.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Olsen',
      role: 'MANAGER',
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager.oslo@miles.com' },
    update: {},
    create: {
      email: 'manager.oslo@miles.com',
      password: hashedPassword,
      firstName: 'Lars',
      lastName: 'Hansen',
      role: 'MANAGER',
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@miles.com' },
    update: {},
    create: {
      email: 'john.doe@miles.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@miles.com' },
    update: {},
    create: {
      email: 'jane.smith@miles.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'USER',
    },
  });

  console.log('✓ Users created');

  // Create Miles office locations
  const stavanger = await prisma.location.upsert({
    where: { id: 'stavanger' },
    update: {},
    create: {
      id: 'stavanger',
      name: 'Stavanger',
      address: 'Nytorget 8',
      city: 'Stavanger',
      country: 'Norway',
      timezone: 'Europe/Oslo',
      description: 'Miles Stavanger office',
    },
  });

  const haugesund = await prisma.location.upsert({
    where: { id: 'haugesund' },
    update: {},
    create: {
      id: 'haugesund',
      name: 'Haugesund',
      address: 'Kaigata 2',
      city: 'Haugesund',
      country: 'Norway',
      timezone: 'Europe/Oslo',
      description: 'Miles Haugesund office',
    },
  });

  const oslo = await prisma.location.upsert({
    where: { id: 'oslo' },
    update: {},
    create: {
      id: 'oslo',
      name: 'Oslo',
      address: 'Universitetsgata 2',
      city: 'Oslo',
      country: 'Norway',
      timezone: 'Europe/Oslo',
      description: 'Miles Oslo office',
    },
  });

  const bergen = await prisma.location.upsert({
    where: { id: 'bergen' },
    update: {},
    create: {
      id: 'bergen',
      name: 'Bergen',
      address: 'Strandgaten 3',
      city: 'Bergen',
      country: 'Norway',
      timezone: 'Europe/Oslo',
      description: 'Miles Bergen office',
    },
  });

  const alesund = await prisma.location.upsert({
    where: { id: 'alesund' },
    update: {},
    create: {
      id: 'alesund',
      name: 'Ålesund',
      address: 'Keiser Wilhelms gate 26',
      city: 'Ålesund',
      country: 'Norway',
      timezone: 'Europe/Oslo',
      description: 'Miles Ålesund office',
    },
  });

  const innlandet = await prisma.location.upsert({
    where: { id: 'innlandet' },
    update: {},
    create: {
      id: 'innlandet',
      name: 'Innlandet',
      address: 'Storgate 15',
      city: 'Lillehammer',
      country: 'Norway',
      timezone: 'Europe/Oslo',
      description: 'Miles Innlandet office',
    },
  });

  const lithuania = await prisma.location.upsert({
    where: { id: 'lithuania' },
    update: {},
    create: {
      id: 'lithuania',
      name: 'Lithuania',
      address: 'Gedimino pr. 1',
      city: 'Vilnius',
      country: 'Lithuania',
      timezone: 'Europe/Vilnius',
      description: 'Miles Lithuania office',
    },
  });

  console.log('✓ Locations created');

  // Assign managers to locations
  await prisma.managerLocation.upsert({
    where: {
      userId_locationId: {
        userId: manager1.id,
        locationId: stavanger.id,
      },
    },
    update: {},
    create: {
      userId: manager1.id,
      locationId: stavanger.id,
    },
  });

  await prisma.managerLocation.upsert({
    where: {
      userId_locationId: {
        userId: manager2.id,
        locationId: oslo.id,
      },
    },
    update: {},
    create: {
      userId: manager2.id,
      locationId: oslo.id,
    },
  });

  console.log('✓ Manager assignments created');

  // Create rooms for Stavanger office
  const stavangerRooms = [
    {
      name: 'Teamrommet',
      capacity: 8,
      amenities: ['whiteboard', 'video_conference', 'tv'],
      description: 'Team collaboration room',
    },
    {
      name: 'Tenkeboksen',
      capacity: 2,
      amenities: ['whiteboard'],
      description: 'Quiet space for focused thinking',
    },
    {
      name: 'Spill & Chill',
      capacity: 6,
      amenities: ['tv', 'gaming_console', 'bean_bags'],
      description: 'Recreation and relaxation room',
    },
    {
      name: 'Skagen',
      capacity: 10,
      amenities: ['projector', 'whiteboard', 'video_conference', 'tv'],
      description: 'Main conference room',
    },
    {
      name: 'På hjørna',
      capacity: 4,
      amenities: ['whiteboard', 'monitor'],
      description: 'Corner meeting room',
    },
  ];

  for (const room of stavangerRooms) {
    await prisma.room.upsert({
      where: { id: `stavanger-${room.name.toLowerCase().replace(/\s+/g, '-').replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/&/g, 'and')}` },
      update: {},
      create: {
        id: `stavanger-${room.name.toLowerCase().replace(/\s+/g, '-').replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/&/g, 'and')}`,
        ...room,
        locationId: stavanger.id,
      },
    });
  }

  console.log('✓ Rooms created');

  // Create some sample bookings
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  await prisma.booking.create({
    data: {
      roomId: 'stavanger-skagen',
      userId: user1.id,
      startTime: tomorrow,
      endTime: tomorrowEnd,
      title: 'Product Planning Meeting',
      description: 'Q4 product roadmap discussion',
      status: 'CONFIRMED',
    },
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(15, 30, 0, 0);

  await prisma.booking.create({
    data: {
      roomId: 'stavanger-teamrommet',
      userId: user2.id,
      startTime: nextWeek,
      endTime: nextWeekEnd,
      title: 'Team Standup',
      description: 'Weekly team sync',
      status: 'CONFIRMED',
    },
  });

  console.log('✓ Sample bookings created');
  console.log('\n✓ Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('  Admin: admin@miles.com / password123');
  console.log('  Manager (Stavanger): manager.stavanger@miles.com / password123');
  console.log('  Manager (Oslo): manager.oslo@miles.com / password123');
  console.log('  User 1: john.doe@miles.com / password123');
  console.log('  User 2: jane.smith@miles.com / password123');
  console.log('\nOffice locations:');
  console.log('  - Stavanger (5 rooms)');
  console.log('  - Haugesund');
  console.log('  - Oslo');
  console.log('  - Bergen');
  console.log('  - Ålesund');
  console.log('  - Innlandet');
  console.log('  - Lithuania');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
