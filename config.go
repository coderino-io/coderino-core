package main

import (
	"log"

	"github.com/spf13/viper"
)

// type credentials struct {
// 	awsAccessID string
// 	secretKey   string
// }

func Configuration() any {
	viper.SetConfigName("credentials.yml")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("config/")

	err := viper.ReadInConfig()
	if err != nil {
		log.Fatal("No credential configuration found")
	}

	awsCreds := viper.Get("aws")
	return awsCreds
}
