import * as fs from 'fs';
import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as amplify from '@aws-cdk/aws-amplify';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda_nodejs from '@aws-cdk/aws-lambda-nodejs';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as apigw2 from '@aws-cdk/aws-apigatewayv2';
import * as apigw2_integrations from '@aws-cdk/aws-apigatewayv2-integrations';

const everyFifteenMinutes = events.Schedule.expression('cron(0/15 * * * ? *)');

export class HeseInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = 'hese-app';
    const githubConfig = {
      owner: 'markusl',
      oauthToken: cdk.SecretValue.secretsManager(`arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:GITHUB_OAUTH_TOKEN-zSOXUo`),
    };

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();
    new pipelines.CdkPipeline(this, 'HeseInfraPipeline', {
      cloudAssemblyArtifact,
      crossAccountKeys: false,
  
      sourceAction: new codepipeline_actions.GitHubSourceAction({
        actionName: 'Source',
        repo: repository,
        output: sourceArtifact,
        ...githubConfig,
      }),
  
      synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        subdirectory: 'hese-infra',
      }),
    });

    const amplifyApp = new amplify.App(this, 'hese-react-app', {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        repository,
        ...githubConfig,
      }),
    });
    amplifyApp.addDomain('olmi.be', {
      subDomains: [{
        branch: amplifyApp.addBranch('master'),
        prefix: 'hese',
      }]
    });

    const statusBucket = new s3.Bucket(this, 'HeseStatus', { bucketName: 'hese-status' });
    statusBucket.addCorsRule({
      allowedMethods: [s3.HttpMethods.GET],
      allowedOrigins: ['*'],
    });

    // NodejsFunction workaround..
    const entry = fs.existsSync(path.join(__dirname, 'index.handler.ts'))
      ? path.join(__dirname, 'index.handler.ts')
      : path.join(__dirname, 'index.handler.js');

    const heseStatusUpdateFunction = new lambda_nodejs.NodejsFunction(this, 'HeseStatusUpdate', {
      entry,
      runtime: lambda.Runtime.NODEJS_12_X,
      minify: true,
      memorySize: 256,
      timeout: cdk.Duration.minutes(1),
      environment: {
        BUCKET_NAME: statusBucket.bucketName,
      },
    });

    statusBucket.grantReadWrite(heseStatusUpdateFunction);

    const rule = new events.Rule(this, 'Rule', { schedule: everyFifteenMinutes });
    rule.addTarget(new targets.LambdaFunction(heseStatusUpdateFunction));

    // An additional endpoint to manually trigger the status update
    const httpApi = new apigw2.HttpApi(this, 'HttpApi');
    httpApi.addRoutes({
      path: '/status',
      methods: [ apigw2.HttpMethod.GET ],
      integration: new apigw2_integrations.LambdaProxyIntegration({
        handler: heseStatusUpdateFunction,
      }),
    });
  }
}
