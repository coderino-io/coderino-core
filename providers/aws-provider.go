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
	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
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

	// instanceProfileName, err := createIAMRoleForEC2(cfg)
	// if err != nil {
	// 	log.Fatalf("Unable to create IAM role for EC2, %v", err)
	// 	return
	// }

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

	// sendBashScriptToInstance(cfg, instanceId)
	fmt.Printf("Intance succesfully created. Instance ID: %v\n", instanceId)
}

func createInstance(client *ec2.Client, instanceProfileName string) (string, error) {

	bashScript := `#!/bin/bash
useradd -m -d /home/workspace developer

cd /home/workspace
wget https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v1.93.0/openvscode-server-v1.93.0-linux-x64.tar.gz
tar -xzf openvscode-server-v1.93.0-linux-x64.tar.gz
cd openvscode-server-v1.93.0-linux-x64
./bin/openvscode-server --host 0.0.0.0`

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
		UserData: aws.String(base64.StdEncoding.EncodeToString([]byte(bashScript))),
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

func sendBashScriptToInstance(cfg aws.Config, instanceID string) error {
	ssmClient := ssm.NewFromConfig(cfg)

	_, err := ssmClient.SendCommand(context.TODO(), &ssm.SendCommandInput{
		DocumentName: aws.String("AWS-RunShellScript"),
		InstanceIds:  []string{instanceID},
		Parameters: map[string][]string{
			"commands": {
				"echo \"Hello from EC2!\" > /home/ec2-user/hello.txt",
			},
		},
	})

	return err
}

func createIAMRoleForEC2(cfg aws.Config) (string, error) {
	iamClient := iam.NewFromConfig(cfg)

	// Define the assume role policy document for EC2 to assume the role
	assumeRolePolicy := `{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {
					"Service": "ec2.amazonaws.com"
				},
				"Action": "sts:AssumeRole"
			}
		]
	}`

	// Create the IAM role
	roleName := "EC2SSMRole"
	_, err := iamClient.CreateRole(context.TODO(), &iam.CreateRoleInput{
		RoleName:                 aws.String(roleName),
		AssumeRolePolicyDocument: aws.String(assumeRolePolicy),
	})

	if err != nil {
		return "", err
	}

	// Attach the AmazonSSMManagedInstanceCore policy to the role
	_, err = iamClient.AttachRolePolicy(context.TODO(), &iam.AttachRolePolicyInput{
		RoleName:  aws.String(roleName),
		PolicyArn: aws.String("arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"),
	})

	if err != nil {
		return "", err
	}

	// Create an instance profile for the role
	instanceProfileName := "EC2SSMInstanceProfile"
	_, err = iamClient.CreateInstanceProfile(context.TODO(), &iam.CreateInstanceProfileInput{
		InstanceProfileName: aws.String(instanceProfileName),
	})

	if err != nil {
		return "", err
	}

	// Add the role to the instance profile
	_, err = iamClient.AddRoleToInstanceProfile(context.TODO(), &iam.AddRoleToInstanceProfileInput{
		InstanceProfileName: aws.String(instanceProfileName),
		RoleName:            aws.String(roleName),
	})

	if err != nil {
		return "", err
	}

	// Return the instance profile name
	return instanceProfileName, nil
}
