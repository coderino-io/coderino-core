import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';
import { Injectable } from '@nestjs/common';
import { AwsCredentialIdentityProvider } from '@smithy/types';

@Injectable()
export class AwsProviderService {
  private credentials: AwsCredentialIdentityProvider;

  constructor() {
    console.log(`aws profile: ${process.env.AWS_PROFILE}`);
    this.credentials = fromIni({ profile: process.env.AWS_PROFILE });
  }
  async createWorkspace(): Promise<void> {
    console.log('create new workspace');
    const client = new EC2Client({ credentials: this.credentials });

    const command = new RunInstancesCommand({
      KeyName: 'coderino-workspace-keypair',
      ImageId: 'ami-0e04bcbe83a83792e', // TODO: aktuell "Ubuntu", noch auf "Amazon Linux" umstellen. Erfordert Test auf neuen AMI
      SecurityGroupIds: ['sg-08ffc656374d0c010'],
      MinCount: 12,
      MaxCount: 12,
      InstanceType: 't2.micro',
    });

    try {
      console.log('send command to AWS...');
      const { Instances } = await client.send(command);

      const instanceList = Instances.map(
        (instance) => `• ${instance.InstanceId}`,
      ).join('\n');

      console.log(`Launched Instances:\n${instanceList}`);
    } catch (caught) {
      console.warn(`${caught.message}`);
    }
  }
}
