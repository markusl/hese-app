#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { HeseInfraStack } from '../lib/hese-infra-stack';

const app = new cdk.App();
new HeseInfraStack(app, 'HeseInfraStack', {
  env: {
    region: 'eu-west-1',
  }
});
