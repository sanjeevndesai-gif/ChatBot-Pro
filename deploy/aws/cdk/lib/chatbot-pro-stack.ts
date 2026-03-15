import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';

export class ChatbotProStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const prefix = 'chatbot-pro';

    const ecrGateway = new ecr.Repository(this, 'GatewayRepo', {
      repositoryName: `${prefix}-gateway`,
      lifecycleRules: [{ maxImageCount: 20 }],
    });

    const ecrAuth = new ecr.Repository(this, 'AuthRepo', {
      repositoryName: `${prefix}-auth-service`,
    });

    const ecrBook = new ecr.Repository(this, 'BookAppointmentRepo', {
      repositoryName: `${prefix}-book-appointment`,
    });

    const ecrChat = new ecr.Repository(this, 'ChatRepo', {
      repositoryName: `${prefix}-chat`,
    });

    const ecrEureka = new ecr.Repository(this, 'EurekaRepo', {
      repositoryName: `${prefix}-eureka`,
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `${prefix}-cluster`,
    });

    // NOTE: Add ECS Fargate Services + ALB here in a real deployment.
    // This stack is a starter template to create the core resources.
  }
}
