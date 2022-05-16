import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HeseInfraStack } from '../lib/hese-infra-stack';
import { snapshotSerializer } from './util';

expect.addSnapshotSerializer(snapshotSerializer);

test('HeseInfraStack synthetizes expected template', async () => {
  const app = new cdk.App();
  const stack = new HeseInfraStack(app, 'infra');

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
