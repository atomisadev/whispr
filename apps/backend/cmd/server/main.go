package main

import (
	"os"

	"github.com/atomisadev/whispr/apps/backend/cmd/server/configs"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/routes"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	configs.ConnectDB()

	routes.UserRoute(e)

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.GET("/location/:id", getWhispr)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
