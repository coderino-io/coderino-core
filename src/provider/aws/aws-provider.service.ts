import {
  EC2Client,
  paginateDescribeInstances,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AwsProviderService {
  private client: EC2Client;

  constructor() {
    const credentials = fromIni({ profile: process.env.AWS_PROFILE });
    this.client = new EC2Client({ credentials });
  }
  async createWorkspace(quantity: number): Promise<Array<string>> {
    console.log('create new workspace');

    const userData = `#!/bin/bash

# install docker and caddy
# sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

apt update # TODO: muss vermieden werden, da sehr lange Zeit beansprucht
apt install -y docker.io # TODO: docker über eigene Quellen installieren
apt install -y caddy # TODO: caddy über eigene quellen installieren

usermod -aG docker ubuntu

cat <<EOF > /root/Caddyfile
:8080
reverse_proxy :8081
EOF

caddy reload -c /root/Caddyfile


mkdir -p /home/ubuntu/.config/code-server
chown ubuntu:ubuntu /home/ubuntu/.config
chown ubuntu:ubuntu /home/ubuntu/.config/code-server
mkdir -p /home/ubuntu/.local
chown ubuntu:ubuntu /home/ubuntu/.local
mkdir -p /home/ubuntu/project
chown ubuntu:ubuntu /home/ubuntu/project

docker run -it -d --name code-server -p 8081:8080 -v "/home/ubuntu/.local:/home/coder/.local" -v "/home/ubuntu/.config:/home/coder/.config"   -v "/home/ubuntu/project:/home/coder/project"   -u "$(id -u):$(id -g)"   -e "DOCKER_USER=ubuntu" -e "PASSWORD=coderino" --restart always  codercom/code-server:latest

#cat <<EOF > /home/ubuntu/.config/code-server/config.yaml
#bind-addr: 127.0.0.1:8080
#auth: password
#password: coderino
#cert: false
#EOF

#chown ubuntu:ubuntu /home/ubuntu/.config/code-server/config.yaml

# VERY HACKY
#docker kill code-server
#docker rm code-server

#docker run -it -d --name code-server -p 8081:8080 -v "/home/ubuntu/.local:/home/coder/.local" -v "/home/ubuntu/.config:/home/coder/.config"   -v "/home/ubuntu/project:/home/coder/project"   -u "$(id -u):$(id -g)"   -e "DOCKER_USER=ubuntu"  --restart always  codercom/code-server:latest
`;

    const command = new RunInstancesCommand({
      KeyName: 'coderino-workspace-keypair',
      ImageId: 'ami-0e04bcbe83a83792e', // TODO: aktuell "Ubuntu", noch auf "Amazon Linux" umstellen. Erfordert Test auf neuen AMI
      SecurityGroupIds: ['sg-08ffc656374d0c010'],
      MinCount: quantity,
      MaxCount: quantity,
      InstanceType: 't3a.medium',
      TagSpecifications: [
        { Tags: [{ Key: 'env', Value: 'DEV' }], ResourceType: 'instance' },
      ], // TODO: mit envirnoment Flag abgleichen
      UserData: Buffer.from(userData).toString('base64'),
    });

    try {
      console.log('send command to AWS...');
      const { Instances } = await this.client.send(command);

      const instanceList = Instances.map(
        (instance) => `• ${instance.InstanceId}`,
      ).join('\n');

      console.log(`Launched Instances:\n${instanceList}`);
      return Instances.map((instance) => instance.InstanceId);
    } catch (caught) {
      console.warn(`${caught.message}`);
      return [];
    }
  }

  async terminateInstances(instanceIds: Array<string>): Promise<Array<string>> {
    const command = new TerminateInstancesCommand({
      InstanceIds: instanceIds,
    });

    try {
      const { TerminatingInstances } = await this.client.send(command);
      console.log(`instances terminated: ${TerminatingInstances.length}`);
      return TerminatingInstances.map((instance) => instance.InstanceId);
    } catch (caught) {
      console.warn(`${caught.message}`);
      return [];
    }
  }

  async terminateAll(): Promise<Array<string>> {
    const instanceIds = await this.getRunningInstanceIds();

    console.log(
      `Instances to terminate (${instanceIds.length}):\n${instanceIds.map((id) => `• ${id}`).join('\n')}`,
    );

    if (instanceIds.length > 0) {
      const terminatedIds = await this.terminateInstances(instanceIds);
      return terminatedIds;
    } else {
      return [];
    }
  }

  private async getRunningInstanceIds() {
    const paginator = paginateDescribeInstances(
      { client: this.client, pageSize: 100 },
      {
        Filters: [
          { Name: 'instance-state-name', Values: ['running'] },
          { Name: 'tag:env', Values: ['DEV'] }, // TODO: mit envirnoment Flag abgleichen
        ],
      },
    );

    const instanceList = [];

    try {
      for await (const page of paginator) {
        const { Reservations } = page;
        Reservations.forEach((r) => instanceList.push(...r.Instances));
      }

      return instanceList.map((instance) => instance.InstanceId);
    } catch (caught) {
      console.warn(`${caught.message}`);
      return [];
    }
  }
}
