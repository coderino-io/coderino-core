package main

import (
	"fmt"
	"log"
	"os"

	"coderino.io/core/workspaces"
	"github.com/urfave/cli/v2"
)

func CreateCli() {
	app := &cli.App{
		Name:  "workspace",
		Usage: "Start or stop a workspace",
		Action: func(cCtx *cli.Context) error {
			cmd := cCtx.Args().Get(0)
			workspaceName := cCtx.Args().Get(1)

			if cmd == "create" {
				workspaces.CreateWorkspace(workspaceName)
			} else if cmd == "start" {
				workspaces.StartWorkspace(workspaceName)
			} else if cmd == "stop" {
				workspaces.StopWorkspace(workspaceName)
			} else if cmd == "destroy" {
				workspaces.DestroyWorkspace(workspaceName)
			} else {
				fmt.Printf("unknown command: %v\n", cmd)
			}

			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
