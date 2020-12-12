import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
  aws_codepipeline as codepipeline,
  aws_amplify as amplify,
  pipelines,
  aws_codepipeline_actions as codepipeline_actions,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
  aws_events as events,
  aws_events_targets as targets,
  aws_apigatewayv2 as apigw2,
  aws_apigatewayv2_integrations as apigw2_integrations
} from 'aws-cdk-lib';

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
      bundling: { minify: true, },
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
      methods: [apigw2.HttpMethod.GET],
      integration: new apigw2_integrations.LambdaProxyIntegration({
        handler: heseStatusUpdateFunction,
      }),
    });
  }
}
