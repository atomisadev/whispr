package routes

import (
	"github.com/atomisadev/whispr/apps/backend/cmd/server/controllers"
	"github.com/labstack/echo/v4"
)

func UploadRoute(e *echo.Echo) {
	uploadGroup := e.Group("/upload")

	uploadGroup.POST("/video", controllers.UploadVideo)
}