import Admin from '../src/models/Admin';
import database from '../src/config/database';

/**
 * Initialize or update admin user with hardcoded credentials
 * Email: forlok@gmail.com
 * Password: forlok123
 * Username: forlok (derived from email)
 */
async function initAdmin() {
  try {
    console.log('🔐 Initializing admin user...\n');

    // Connect to database
    await database.connect();
    console.log('✅ Connected to database\n');

    const adminEmail = 'forlok@gmail.com';
    const adminUsername = 'forlok'; // Username for login
    const adminPassword = 'forlok123';
    const adminName = 'FORLOK Admin';

    // Check if admin already exists
    let admin = await Admin.findOne({
      $or: [
        { email: adminEmail },
        { username: adminUsername },
      ],
    });

    if (admin) {
      console.log('📋 Admin user already exists:');
      console.log(`   Admin ID: ${admin.adminId}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}\n`);

      // Update password and ensure active
      admin.password = adminPassword; // Will be hashed by pre-save hook
      admin.email = adminEmail;
      admin.username = adminUsername;
      admin.name = adminName;
      admin.isActive = true;
      admin.role = 'super_admin';

      await admin.save();
      console.log('✅ Updated admin credentials:\n');
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role: super_admin\n`);
    } else {
      // Create new admin
      admin = await Admin.create({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        name: adminName,
        role: 'super_admin',
        permissions: ['*'], // All permissions
        isActive: true,
      });

      console.log('✅ Created new admin user:\n');
      console.log(`   Admin ID: ${admin.adminId}`);
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Name: ${adminName}`);
      console.log(`   Role: super_admin\n`);
    }

    console.log('📝 Admin Login Credentials:');
    console.log('   ========================');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ========================\n');

    console.log('✅ Admin initialization complete!\n');
  } catch (error: any) {
    console.error('❌ Error initializing admin:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await database.disconnect();
    process.exit(0);
  }
}

// Run the script
initAdmin();
