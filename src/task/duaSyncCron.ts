import cron from 'node-cron';
import { DuaService } from '../app/modules/dua/dua.service';

// Run every day at 3:00 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Starting daily Dua synchronization...');
  try {
    const result = await DuaService.syncFromExternalSource();
    console.log(
      `Dua synchronization completed. Created: ${result.createdCount}, Updated: ${result.updatedCount}`
    );
  } catch (error) {
    console.error('Error during Dua synchronization:', error);
  }
});
