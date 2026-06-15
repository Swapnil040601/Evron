// src/migrations/tenantMigration.js
import { runTenantMigrations } from '../../scripts/runTenantMigrations.js';

export const handler = async (event, context) => {
  console.log('Starting tenant migrations via Lambda...');
  
  try {
    // Call your existing migration function
    const result = await runTenantMigrations();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Migrations completed successfully',
        result: result
      })
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};