import {
  DescribeInstancesCommand,
  EC2Client,
  paginateDescribeInstances,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AwsProviderService {
  private client: EC2Client;

  constructor(private readonly http: HttpService) {
    const credentials = fromIni({ profile: process.env.AWS_PROFILE });
    this.client = new EC2Client({ credentials });
  }
  async createWorkspace(names: Array<string>): Promise<Array<string>> {
    console.log('create new workspace');

    //     const userData = `#!/bin/bash

    // # install docker and caddy
    // curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    // curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

    // apt update # TODO: muss vermieden werden, da sehr lange Zeit beansprucht
    // apt install -y docker.io # TODO: docker über eigene Quellen installieren
    // apt install -y caddy # TODO: caddy über eigene quellen installieren

    // usermod -aG docker ubuntu

    // cat <<EOF > /root/Caddyfile
    // :8080
    // reverse_proxy :8081
    // EOF

    // caddy reload -c /root/Caddyfile

    // mkdir -p /home/ubuntu/.config/code-server
    // chown ubuntu:ubuntu /home/ubuntu/.config
    // chown ubuntu:ubuntu /home/ubuntu/.config/code-server
    // mkdir -p /home/ubuntu/.local
    // chown ubuntu:ubuntu /home/ubuntu/.local
    // mkdir -p /home/ubuntu/project
    // chown ubuntu:ubuntu /home/ubuntu/project

    // docker run -it -d --name code-server -p 8081:8080 -v "/home/ubuntu/.local:/home/coder/.local" -v "/home/ubuntu/.config:/home/coder/.config"   -v "/home/ubuntu/project:/home/coder/project"   -u "$(id -u):$(id -g)"   -e "DOCKER_USER=ubuntu" -e "PASSWORD=coderino" --restart always  codercom/code-server:latest
    // `;

    const newUserData = `#!/bin/bash
export HOME=/root
curl -fsSL https://code-server.dev/install.sh | sh

systemctl enable --now code-server@ec2-user

dnf install -y nginx

cat <<EOF > /etc/nginx/conf.d/code-server.conf
server {
    listen 80;
    listen [::]:80;

    location / {
      proxy_pass http://localhost:8080/;
      proxy_set_header Host \\$http_host;
      proxy_set_header Upgrade \\$http_upgrade;
      proxy_set_header Connection upgrade;
      proxy_set_header Accept-Encoding gzip;
    }
}
EOF

systemctl enable --now nginx.service

cat <<EOF > /home/ec2-user/.config/code-server/config.yaml
bind-addr: 127.0.0.1:8080
auth: password
password: coderino
cert: false
EOF

systemctl restart code-server@ec2-user


su - ec2-user -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash"
su - ec2-user -c "source ~/.nvm/nvm.sh && nvm install 20 && nvm use 20"
su - ec2-user -c "echo 'nvm use 20' >> ~/.bashrc"
su - ec2-user -c "source ~/.nvm/nvm.sh && npm install -g typescript"
`;

    const command = new RunInstancesCommand({
      KeyName: 'coderino-workspace-keypair',
      ImageId: 'ami-0592c673f0b1e7665',
      SecurityGroupIds: ['sg-08ffc656374d0c010'],
      MinCount: 1, //names.length,
      MaxCount: 1, //names.length,
      InstanceType: 't3a.medium',
      TagSpecifications: [
        {
          Tags: [
            { Key: 'env', Value: 'DEV' },
            { Key: 'Name', Value: names[0] },
          ],
          ResourceType: 'instance',
        },
      ], // TODO: mit envirnoment Flag abgleichen
      UserData: Buffer.from(newUserData).toString('base64'),
    });

    try {
      console.log('send command to AWS...');
      const { Instances } = await this.client.send(command);

      const instanceList = Instances.map((instance) => {
        return `• ${instance.InstanceId}`;
      }).join('\n');

      console.log(`Launched Instances:\n${instanceList}`);

      // wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { Reservations } = await this.client.send(
        new DescribeInstancesCommand({
          InstanceIds: Instances.map((inst) => inst.InstanceId),
        }),
      );

      const idAddressMapping = Reservations[0].Instances.map((instance) => ({
        id: instance.InstanceId,
        address: instance.PublicIpAddress,
        name:
          instance.Tags.filter((tag) => tag.Key === 'Name')[0]?.Value ||
          'no name',
      }));

      this.adaptApiGateway(idAddressMapping).catch((err) =>
        console.error(`Error creating kong route: ${JSON.stringify(err)}`),
      );

      return idAddressMapping.map((instance) => JSON.stringify(instance));
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

  async adaptApiGateway(
    idAddressMapping: Array<{ id: string; address: string; name: string }>,
  ) {
    for (const mapping of idAddressMapping) {
      const serviceResponse = await firstValueFrom(
        this.http.post(
          'http://127.0.0.1:8001/services/',
          new URLSearchParams({
            name: `workspace_${mapping.name}_service`,
            url: `http://${mapping.address}:80`,
          }),
        ),
      );

      await firstValueFrom(
        this.http.post(
          'http://localhost:8001/routes/',
          new URLSearchParams({
            'service.id': serviceResponse.data.id,
            'hosts[]': `${mapping.name}.coderino.io`,
          }),
        ),
      ).then(() =>
        console.log(`kong route created: ${mapping.name} : ${mapping.address}`),
      );
    }
  }
}
