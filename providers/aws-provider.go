package providers

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
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
				AccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
				SecretAccessKey: os.Getenv("AWS_SECRET_KEY"),
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

sudo su -
yum update -y
yum install docker -y
systemctl start docker
docker volume create vscodeserver
docker run -d --init -p 3000:3000 -v vscodeserver gitpod/openvscode-server

usermod -aG docker coderino

if grep -q sudo /etc/group; then
	usermod -aG sudo,docker coderino
elif grep -q wheel /etc/group; then
	usermod -aG wheel,docker coderino
fi

echo "coderino ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/91-coderino

`

	runResult, err := client.RunInstances(context.TODO(), &ec2.RunInstancesInput{
		MinCount:         aws.Int32(1),
		MaxCount:         aws.Int32(1),
		ImageId:          aws.String("ami-04f76ebf53292ef4d"),
		InstanceType:     types.InstanceTypeT3Micro,
		KeyName:          aws.String("coderino-key-pair"),
		SecurityGroupIds: []string{"sg-03d779f2ea697952d"},
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
