import * as cdk from 'aws-cdk-lib';
import { SynthUtils } from '@aws-cdk/assert';
import { HeseInfraStack } from '../lib/hese-infra-stack';
import { snapshotSerializer } from './util';

expect.addSnapshotSerializer(snapshotSerializer);

test('HeseInfraStack synthetizes expected template', async () => {
  const app = new cdk.App();
  const stack = new HeseInfraStack(app, 'infra');

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
