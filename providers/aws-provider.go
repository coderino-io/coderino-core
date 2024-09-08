package providers

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func CreateEC2Instance(name string) {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("eu-central-1"),
		config.WithCredentialsProvider(credentials.StaticCredentialsProvider{
			Value: aws.Credentials{
				AccessKeyID:     "",
				SecretAccessKey: "",
				Source:          "example hard coded credentials",
			},
		}))
	if err != nil {
		log.Fatal("error while loading AWS config")
		return
	}

	client := ec2.NewFromConfig(cfg)

	instanceId, err := createInstance(client, "MyEC2InstanceProfile")
	if err != nil {
		log.Fatal("Error while creating EC2 instance: ", err)
		return
	}

	err = waitForInstanceRunning(client, instanceId)
	if err != nil {
		log.Fatal("Instance not successfully created: ", err)
		return
	}

	fmt.Printf("Intance succesfully created. Instance ID: %v\n", instanceId)
}

func createInstance(client *ec2.Client, instanceProfileName string) (string, error) {

	userData := `#!/bin/bash
useradd -m -d /home/coderino coderino

curl -fsSL https://get.docker.com | bash

# Modify Docker daemon configuration
cat > /etc/docker/daemon.json <<EOF
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
EOF

# Create a systemd drop-in file to modify the Docker service
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
EOF

systemctl daemon-reload
systemctl restart docker
systemctl start docker

usermod -aG docker coderino

if grep -q sudo /etc/group; then
	usermod -aG sudo,docker coderino
elif grep -q wheel /etc/group; then
	usermod -aG wheel,docker coderino
fi

echo "coderino ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/91-coderino

`

	runResult, err := client.RunInstances(context.TODO(), &ec2.RunInstancesInput{
		MinCount:     aws.Int32(1),
		MaxCount:     aws.Int32(1),
		ImageId:      aws.String("ami-04f76ebf53292ef4d"),
		InstanceType: types.InstanceTypeT3Micro,
		KeyName:      aws.String("coderino-key-pair"),
		SecurityGroupIds: []string{
			"sg-06b1a1845661e100a",
		},
		IamInstanceProfile: &types.IamInstanceProfileSpecification{
			Name: aws.String(instanceProfileName),
		},
		UserData: aws.String(base64.StdEncoding.EncodeToString([]byte(userData))),
	})

	if err != nil {
		return "", err
	}

	return *runResult.Instances[0].InstanceId, nil
}

func waitForInstanceRunning(client *ec2.Client, instanceId string) error {
	waiter := ec2.NewInstanceRunningWaiter(client)
	err := waiter.Wait(context.TODO(), &ec2.DescribeInstancesInput{
		InstanceIds: []string{instanceId},
	}, *aws.Duration(time.Hour))

	return err
}
