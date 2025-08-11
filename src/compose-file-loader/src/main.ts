import { getFileOperationsFromEnv } from './config';
import { executeOperation } from './operations';

/**
* A simple logger that can be disabled by the SILENT environment variable.
*/
const logger = {
  log: process.env.SILENT === 'true' ? () => {} : console.log,
  error: process.env.SILENT === 'true' ? () => {} : console.error,
};

/**
* Pauses execution for a specified duration.
* @param ms The number of milliseconds to sleep.
* @param reason An optional reason for logging.
*/
async function sleep(ms: number, reason: string): Promise<void> {
  if (!ms || ms <= 0) return;
  logger.log(`😴 Sleeping for ${ms}ms (${reason})...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
* The main application function.
*/
async function main() {
  console.log('🚀 Starting compose-file-loader...');
  
  await sleep(parseInt(process.env.SLEEP || '0', 10), 'initial delay');
  
  const operations = getFileOperationsFromEnv();
  
  for (const op of operations) {
    try {
      await sleep(op.sleepBefore, `before ${op.prefix}`);
      
      await executeOperation(op);
      logger.log(`✅ Successfully processed ${op.prefix}`);
      
      await sleep(op.sleepAfter, `after ${op.prefix}`);
      
    } catch (error) {
      logger.error(`❌ Error processing ${op.prefix}: ${(error as Error).message}`);
      if (op.failOnError) {
        logger.error('Aborting due to failOnError flag.');
        process.exit(1);
      }
    }
  }
  
  await sleep(parseInt(process.env.SLEEP_AFTER || '0', 10), 'final delay');
  logger.log('✨ All operations complete.');
}

// Run the application
main().catch((error) => {
  logger.error('An unexpected fatal error occurred:', error);
  process.exit(1);
});
