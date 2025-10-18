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
    where: { email: 'manager.sf@miles.com' },
    update: {},
    create: {
      email: 'manager.sf@miles.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'MANAGER',
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager.ny@miles.com' },
    update: {},
    create: {
      email: 'manager.ny@miles.com',
      password: hashedPassword,
      firstName: 'Michael',
      lastName: 'Chen',
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

  // Create locations
  const sfOffice = await prisma.location.upsert({
    where: { id: 'sf-office' },
    update: {},
    create: {
      id: 'sf-office',
      name: 'San Francisco HQ',
      address: '123 Market Street',
      city: 'San Francisco',
      country: 'USA',
      timezone: 'America/Los_Angeles',
      description: 'Main headquarters in San Francisco',
    },
  });

  const nyOffice = await prisma.location.upsert({
    where: { id: 'ny-office' },
    update: {},
    create: {
      id: 'ny-office',
      name: 'New York Office',
      address: '456 Broadway',
      city: 'New York',
      country: 'USA',
      timezone: 'America/New_York',
      description: 'East coast office in Manhattan',
    },
  });

  const londonOffice = await prisma.location.upsert({
    where: { id: 'london-office' },
    update: {},
    create: {
      id: 'london-office',
      name: 'London Office',
      address: '789 Oxford Street',
      city: 'London',
      country: 'UK',
      timezone: 'Europe/London',
      description: 'European headquarters',
    },
  });

  console.log('✓ Locations created');

  // Assign managers to locations
  await prisma.managerLocation.upsert({
    where: {
      userId_locationId: {
        userId: manager1.id,
        locationId: sfOffice.id,
      },
    },
    update: {},
    create: {
      userId: manager1.id,
      locationId: sfOffice.id,
    },
  });

  await prisma.managerLocation.upsert({
    where: {
      userId_locationId: {
        userId: manager2.id,
        locationId: nyOffice.id,
      },
    },
    update: {},
    create: {
      userId: manager2.id,
      locationId: nyOffice.id,
    },
  });

  console.log('✓ Manager assignments created');

  // Create rooms for SF office
  const sfRooms = [
    {
      name: 'Golden Gate Conference Room',
      capacity: 10,
      amenities: ['projector', 'whiteboard', 'video_conference', 'tv'],
      description: 'Large conference room with bay views',
    },
    {
      name: 'Alcatraz Meeting Room',
      capacity: 6,
      amenities: ['whiteboard', 'video_conference'],
      description: 'Medium-sized meeting room',
    },
    {
      name: 'Mission Focus Room',
      capacity: 4,
      amenities: ['whiteboard', 'monitor'],
      description: 'Small room for focused discussions',
    },
  ];

  for (const room of sfRooms) {
    await prisma.room.upsert({
      where: { id: `sf-${room.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `sf-${room.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...room,
        locationId: sfOffice.id,
      },
    });
  }

  // Create rooms for NY office
  const nyRooms = [
    {
      name: 'Empire State Room',
      capacity: 12,
      amenities: ['projector', 'whiteboard', 'video_conference', 'tv'],
      description: 'Large conference room',
    },
    {
      name: 'Central Park Meeting Room',
      capacity: 8,
      amenities: ['whiteboard', 'video_conference'],
      description: 'Medium-sized meeting room',
    },
    {
      name: 'Brooklyn Focus Room',
      capacity: 4,
      amenities: ['monitor', 'whiteboard'],
      description: 'Small focus room',
    },
  ];

  for (const room of nyRooms) {
    await prisma.room.upsert({
      where: { id: `ny-${room.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `ny-${room.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...room,
        locationId: nyOffice.id,
      },
    });
  }

  // Create rooms for London office
  const londonRooms = [
    {
      name: 'Thames Conference Room',
      capacity: 10,
      amenities: ['projector', 'whiteboard', 'video_conference'],
      description: 'Main conference room',
    },
    {
      name: 'Westminster Meeting Room',
      capacity: 6,
      amenities: ['whiteboard', 'video_conference'],
      description: 'Medium meeting room',
    },
  ];

  for (const room of londonRooms) {
    await prisma.room.upsert({
      where: { id: `london-${room.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `london-${room.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...room,
        locationId: londonOffice.id,
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
      roomId: 'sf-golden-gate-conference-room',
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
      roomId: 'ny-empire-state-room',
      userId: user2.id,
      startTime: nextWeek,
      endTime: nextWeekEnd,
      title: 'Engineering All-Hands',
      description: 'Monthly engineering team meeting',
      status: 'CONFIRMED',
    },
  });

  console.log('✓ Sample bookings created');
  console.log('\n✓ Seed completed successfully!');
  console.log('\nTest accounts:');
  console.log('  Admin: admin@miles.com / password123');
  console.log('  Manager (SF): manager.sf@miles.com / password123');
  console.log('  Manager (NY): manager.ny@miles.com / password123');
  console.log('  User 1: john.doe@miles.com / password123');
  console.log('  User 2: jane.smith@miles.com / password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
