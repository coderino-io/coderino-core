package workspaces

import (
	"fmt"

	"coderino.io/core/providers"
)

func CreateWorkspace(name string, provider string) error {
	fmt.Printf("create instance with provider %v\n", provider)

	if provider == "aws" {
		providers.CreateEC2Instance(name)
	}

	return nil
}

func StartWorkspace(name string) error {
	return nil
}

func StopWorkspace(name string) error {
	return nil
}

func DestroyWorkspace(name string) error {
	return nil
}
