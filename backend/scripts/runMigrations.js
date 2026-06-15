import "dotenv/config";
import { AppDataSource } from "../src/configs/data-source.js"; // your template DataSource

// Export this function for Lambda use
export async function runTenantMigrations() {


    try {
      await AppDataSource.initialize();
      await AppDataSource.runMigrations();
      console.log(`✅ Migrations completed`);
    } catch (err) {
      console.error(`❌ Migration failed`, err);
    } finally {
      await AppDataSource.destroy();
    }

  console.log("\nMigrations completed!");
  return {
    success: true
  };
}

// Keep this for direct execution via npm script
if (import.meta.url === `file://${process.argv[1]}`) {
  runTenantMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}