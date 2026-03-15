#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ChatbotProStack } from '../lib/chatbot-pro-stack';

const app = new cdk.App();
new ChatbotProStack(app, 'ChatbotProStack', {
  /*
   * You can set `env` here for a specific account/region, e.g.
   * env: { account: '123456789012', region: 'us-east-1' }
   */
});
