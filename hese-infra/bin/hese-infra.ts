#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import HeseInfraStack from '../lib/hese-infra-stack';

const app = new App();
new HeseInfraStack(app, 'HeseInfraStack', {
  env: {
    region: 'eu-west-1',
  }
});
Tags.of(app).add('Project', 'HesburgerIceCreamTracker');

app.synth();
