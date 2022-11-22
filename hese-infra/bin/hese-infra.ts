#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import HeseInfraStack from '../lib/hese-infra-stack';

const app = new App();
new HeseInfraStack(app, 'HeseInfraStack', {
  env: {
    region: 'eu-west-1',
  }
});

app.synth();
