package controllers

import (
	"net/http"
	"time"

	"github.com/atomisadev/whispr/apps/backend/cmd/server/configs"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/models"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/responses"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/net/context"
    "go.mongodb.org/mongo-driver/bson"
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
		Id:            primitive.NewObjectID(),
		Latitude:      whisper.Latitude,
		Longitude:     whisper.Longitude,
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

    err := whisperCollection.FindOne(ctx, bson.M{"id": objId}).Decode(&whisper)
    if err != nil {
        return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": err.Error()}})
    }

    return c.JSON(http.StatusOK, responses.WhisperResponse{Status: http.StatusOK, Message: "success", Data: &echo.Map{"data": whisper}})
}

func GetWhispers(c echo.Context) error {
    radius := c.QueryParam("radius")
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
        
        distanceFromUser
        
        if (singleWhisper.)
            whisper = append(whisper, singleWhisper)
    }

    return c.JSON(http.StatusOK, responses.WhisperResponse{Status: http.StatusOK, Message: "success", Data: &echo.Map{"data": whisper}})
}

