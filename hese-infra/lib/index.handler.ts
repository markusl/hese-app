import { getHeseIceCreamStatusFinland } from './lambda/hese';
import { S3 } from '@aws-sdk/client-s3';

const bucket = process.env.BUCKET_NAME ?? '';
const s3 = new S3({ });

export const handler = async (event: any) => {
  console.log(JSON.stringify(event, undefined, 2));
  try {
    const isScheduledEvent = event['detail-type'] === 'Scheduled Event';
    const status = await getHeseIceCreamStatusFinland();
    const statusJson = JSON.stringify(status);

    // Store a status snapshot
    await s3.putObject({
      Bucket: bucket,
      Key: new Date().toISOString() + '-status.json',
      Body: statusJson,
    });

    // Store a publicly readable version of the latest status
    await s3.putObject({
      Bucket: bucket,
      Key: 'status.json',
      Body: statusJson,
    });
    await s3.putObjectAcl({
      Bucket: bucket,
      Key: 'status.json',
      ACL: 'public-read',
    });

    return {
      statusCode: 200,
      body: isScheduledEvent ? '' : statusJson,
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    };
  }
};
