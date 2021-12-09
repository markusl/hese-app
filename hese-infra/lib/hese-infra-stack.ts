import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
  aws_events as events,
  aws_events_targets as targets,
  pipelines,
} from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as apigw2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigw2_integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

const everyFifteenMinutes = events.Schedule.expression('cron(0/15 * * * ? *)');

export class HeseInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = 'hese-app';
    const githubConfig = {
      owner: 'markusl',
      oauthToken: cdk.SecretValue.secretsManager(`arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:GITHUB_OAUTH_TOKEN-zSOXUo`),
    };
    // Use a connection created using the AWS console to authenticate to GitHub
    const input = pipelines.CodePipelineSource.connection('markusl/hese-app', 'master', {
      connectionArn: 'arn:aws:codestar-connections:eu-west-1:872821666058:connection/2176abff-fac4-4c5d-87e8-0cc53551ab98',
    });

    new pipelines.CodePipeline(this, 'HeseInfraPipeline', {
      crossAccountKeys: false,
      synth: new pipelines.ShellStep('Synth', {
        input,
        commands: [
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
      runtime: lambda.Runtime.NODEJS_14_X,
      bundling: { minify: true, },
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
