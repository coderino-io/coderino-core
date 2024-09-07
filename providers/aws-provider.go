package providers

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func CreateEC2Instance(name string) {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
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

	cfg.Region = "eu-central-1"

	client := ec2.NewFromConfig(cfg)
	runResult, err := client.RunInstances(context.TODO(), &ec2.RunInstancesInput{
		MinCount:     aws.Int32(1),
		MaxCount:     aws.Int32(1),
		ImageId:      aws.String("ami-04f76ebf53292ef4d"),
		InstanceType: types.InstanceTypeT3Micro,
	})

	if err != nil {
		log.Fatal("Could not create instance", err)
		return
	}

	fmt.Println(runResult.Instances)
}
