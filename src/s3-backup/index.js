const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { spawnSync } = require('child_process');
const { createReadStream, unlinkSync, existsSync } = require('fs');
const cron = require('node-cron');

const cfg = [];
let counter = 0;

while (process.env[`CFG_${counter}_FROM`]) {
    cfg.push({
        from: process.env[`CFG_${counter}_FROM`],
        bucket: process.env[`CFG_${counter}_BUCKET`],
        accessKey: process.env[`CFG_${counter}_ACCESS_KEY`],
        secretKey: process.env[`CFG_${counter}_SECRET_KEY`],
        region: process.env[`CFG_${counter}_REGION`],
        endpoint: process.env[`CFG_${counter}_ENDPOINT`],
        cron: process.env[`CFG_${counter}_CRON`],
        webhookSuccess: process.env[`CFG_${counter}_WEBHOOK_SUCCESS`],
        webhookFail: process.env[`CFG_${counter}_WEBHOOK_FAILURE`],
        container: process.env[`CFG_${counter}_CONTAINER`],
        prefix: process.env[`CFG_${counter}_PREFIX`],
    });
    counter++;
}

if (cfg.length === 0) {
    console.error('No configuration found');
    process.exit(1);
}

if (cfg.some(c => 
    !c.from || 
    !c.bucket || 
    !c.accessKey || 
    !c.secretKey || 
    !c.region || 
    !c.endpoint || 
    !c.cron
)) {
    console.error('Invalid configuration');
    process.exit(1);
}

for (const c of cfg) cron.schedule(c.cron, async () => {
    const container = c.container ? c.container.split(',') : []
    const cleanName = c.from.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '_');
    const tmp = `/tmp/${cleanName}_${timestamp}.tar.gz`;

    try {
        console.log(`Running backup for ${c.from}`);

        for (const c of container) {
            console.log(`Stopping container ${c}`);
            spawnSync('docker', ['stop', c]);
        }
    
        const { status } = spawnSync('tar', [
            '-czpf', // Create, compress, preserve, file
            tmp,
            c.from,
        ], { stdio: 'inherit' });
    
        if (status !== 0) throw new Error('Tar failed');

        const client = new S3Client({
            region: c.region,
            endpoint: c.endpoint,
            credentials: {
                accessKeyId: c.accessKey,
                secretAccessKey: c.secretKey,
            },
        });

        const command = new PutObjectCommand({
            Bucket: c.bucket,
            Key: `${c.prefix ? c.prefix : ''}${cleanName}_${timestamp}.tar.gz`,
            Body: createReadStream(tmp),
        });

        await client.send(command);

        for (const c of container) {
            console.log(`Starting container ${c}`);
            spawnSync('docker', ['start', c]);
        }

        unlinkSync(tmp);

        console.log('Backup uploaded successfully');
        
        if (c.webhookSuccess) {
            console.log('Sending success webhook');
            await fetch(c.webhookSuccess);
        }
    } catch (e) {
        console.error('Failed to upload backup');
        console.error(e);
        if (c.webhookFail) {
            console.log('Sending failure webhook');
            await fetch(c.webhookFail);
        }
        if (existsSync(tmp)) unlinkSync(tmp);
        for (const c of container) {
            console.log(`Starting container ${c}`);
            spawnSync('docker', ['start', c]);
        }
        return;
    }
});

console.log('Backup service started');
