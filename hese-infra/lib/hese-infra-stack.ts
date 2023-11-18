import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
  aws_codebuild as codebuild,
  aws_events as events,
  aws_events_targets as targets,
  aws_apigatewayv2 as apigw2,
  aws_apigatewayv2_integrations as apigw2_integrations,
  pipelines,
} from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';

const everyFifteenMinutes = events.Schedule.expression('cron(0/15 * * * ? *)');

export default class HeseInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = 'hese-app';
    const githubConfig = {
      owner: 'markusl',
      oauthToken: cdk.SecretValue.secretsManager(`arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:GITHUB_OAUTH_TOKEN-Qw9kGt`),
    };
    // Use a connection created using the AWS console to authenticate to GitHub
    const input = pipelines.CodePipelineSource.connection('markusl/hese-app', 'master', {
      connectionArn: `arn:aws:codestar-connections:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:connection/2176abff-fac4-4c5d-87e8-0cc53551ab98`,
    });

    new pipelines.CodePipeline(this, 'HeseInfraPipeline', {
      crossAccountKeys: false,
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          computeType: codebuild.ComputeType.SMALL,
        },
      },
      synth: new pipelines.ShellStep('Synth', {
        input,
        commands: [
          'n 18',
          'cd hese-infra',
          'npm ci',
          'npm run test',
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'hese-infra/cdk.out',
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

    const heseStatusUpdateFunction = new lambda_nodejs.NodejsFunction(this, 'HeseStatusUpdate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      bundling: {
        minify: true,
        format: lambda_nodejs.OutputFormat.ESM,
      },
      logFormat: lambda.LogFormat.JSON,
      memorySize: 256,
      timeout: cdk.Duration.minutes(1),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BUCKET_NAME: statusBucket.bucketName,
      },
    });

    statusBucket.grantReadWrite(heseStatusUpdateFunction);
    statusBucket.grantPutAcl(heseStatusUpdateFunction);

    const rule = new events.Rule(this, 'Rule', { schedule: everyFifteenMinutes });
    rule.addTarget(new targets.LambdaFunction(heseStatusUpdateFunction));

    // An additional endpoint to manually trigger the status update
    const httpApi = new apigw2.HttpApi(this, 'HttpApi');
    const integration = new apigw2_integrations.HttpLambdaIntegration('integration', heseStatusUpdateFunction);
    httpApi.addRoutes({
      path: '/status',
      methods: [apigw2.HttpMethod.GET],
      integration,
    });
  }
}
