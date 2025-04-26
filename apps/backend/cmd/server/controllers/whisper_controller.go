package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/atomisadev/whispr/apps/backend/cmd/server/configs"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/models"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/responses"

	"math"

	"strconv"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/net/context"
)

var whisperCollection *mongo.Collection = configs.GetCollection(configs.DB, "whispers")

var validate = validator.New()

func CreateWhisper(c echo.Context) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	var whisper models.Whisper
	defer cancel()

	if err := c.Bind(&whisper); err != nil {
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": err.Error()}})
	}

	if validationErr := validate.Struct(&whisper); validationErr != nil {
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": validationErr.Error()}})
	}

	newWhisper := models.Whisper{
		Location:      whisper.Location,
		Data:          whisper.Data,
		DataType:      whisper.DataType,
		MaxListens:    whisper.MaxListens,
		AmountListens: whisper.AmountListens,
		Emotions:      whisper.Emotions,
	}

	result, err := whisperCollection.InsertOne(ctx, newWhisper)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": err.Error()}})
	}

	return c.JSON(http.StatusCreated, responses.WhisperResponse{Status: http.StatusCreated, Message: "success", Data: &echo.Map{"data": result}})
}

func GetWhisper(c echo.Context) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	whisperId := c.QueryParam("whisperId")
	var whisper models.Whisper
	defer cancel()

	objId, _ := primitive.ObjectIDFromHex(whisperId)

	err := whisperCollection.FindOne(ctx, bson.M{"_id": objId}).Decode(&whisper)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": err.Error()}})
	}

	return c.JSON(http.StatusOK, responses.WhisperResponse{Status: http.StatusOK, Message: "success", Data: &echo.Map{"data": whisper}})
}

func GetWhispers(c echo.Context) error {
	radius, _ := strconv.Atoi(c.QueryParam("radius"))
	location := c.QueryParam("location")
	realLocation := strings.Split(location, ",")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	var whisper []models.Whisper
	defer cancel()

	results, err := whisperCollection.Find(ctx, bson.M{})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": err.Error()}})
	}

	defer results.Close(ctx)
	for results.Next(ctx) {
		var singleWhisper models.Whisper
		if err = results.Decode(&singleWhisper); err != nil {
			return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": err.Error()}})
		}

		userLat, _ := strconv.Atoi(realLocation[0])
		userLong, _ := strconv.Atoi(realLocation[1])

		whisperLoc := strings.Split(singleWhisper.Location, ",")
		whisperLat, _ := strconv.Atoi(whisperLoc[0])
		whisperLong, _ := strconv.Atoi(whisperLoc[1])

		distanceFromUser := math.Sqrt(math.Pow(float64(whisperLat-userLat), 2) + math.Pow(float64(whisperLong-userLong), 2))

		if distanceFromUser <= float64(radius) {
			whisper = append(whisper, singleWhisper)
		}
	}

	return c.JSON(http.StatusOK, responses.WhisperResponse{Status: http.StatusOK, Message: "success", Data: &echo.Map{"data": whisper}})
}
