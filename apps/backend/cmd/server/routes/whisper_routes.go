package routes

import (
	"github.com/labstack/echo/v4"

	"github.com/atomisadev/whispr/apps/backend/cmd/server/controllers"
)

func UserRoute(e *echo.Echo) {
	e.POST("/whisper", controllers.CreateWhisper)

	e.GET("/whisper", controllers.GetWhisper) // with query param ?whisperId=????

	e.GET("/whispers", controllers.GetWhispers) // with query param ?location=something?radius=????
}
