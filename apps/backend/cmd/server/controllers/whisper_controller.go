package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/atomisadev/whispr/apps/backend/cmd/server/configs"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/models"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/responses"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var whisperCollection *mongo.Collection = configs.GetCollection(configs.DB, "whispers")
var validate = validator.New()

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}
var allowedVideoTypes = map[string]bool{
	"video/mp4":       true,
	"video/webm":      true,
	"video/ogg":       true,
	"video/quicktime": true,
}

func CreateWhisper(c echo.Context) error {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	location := c.FormValue("location")
	maxListensStr := c.FormValue("maxListens")
	emotionsStr := c.FormValue("emotions")

	maxListens, err := strconv.Atoi(maxListensStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": "Invalid maxListens value"}})
	}

	var emotions []string
	if err := json.Unmarshal([]byte(emotionsStr), &emotions); err != nil {
		emotions = strings.Split(emotionsStr, ",")
		for i := range emotions {
			emotions[i] = strings.TrimSpace(emotions[i])
		}
	}
	validEmotions := []string{}
	for _, e := range emotions {
		if e != "" {
			validEmotions = append(validEmotions, e)
		}
	}
	emotions = validEmotions

	whisper := models.Whisper{
		Location:      location,
		MaxListens:    maxListens,
		AmountListens: 0,
		Emotions:      emotions,
	}

	mediaFileHeader, err := c.FormFile("mediaFile")

	if err == nil && mediaFileHeader != nil {
		log.Printf("Received mediaFile: %s, Size: %d", mediaFileHeader.Filename, mediaFileHeader.Size)

		mediaFile, err := mediaFileHeader.Open()
		if err != nil {
			log.Printf("Error opening media file stream: %v", err)
			return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": "Failed to open uploaded file"}})
		}
		defer mediaFile.Close()

		contentTypeHeader := mediaFileHeader.Header.Get("Content-Type")
		contentType, _, _ := mime.ParseMediaType(contentTypeHeader)
		if contentType == "" || contentType == "application/octet-stream" {
			ext := strings.ToLower(filepath.Ext(mediaFileHeader.Filename))
			contentType = mime.TypeByExtension(ext)
			if contentType == "" {
				contentType = "application/octet-stream"
			}
		}

		log.Printf("Detected Content-Type: %s (Header was: %s)", contentType, contentTypeHeader)

		if allowedImageTypes[contentType] {
			whisper.DataType = "image"
		} else if allowedVideoTypes[contentType] {
			whisper.DataType = "video"
		} else {
			log.Printf("Unsupported file type: %s", contentType)
			return c.JSON(http.StatusBadRequest, responses.WhisperResponse{
				Status:  http.StatusBadRequest,
				Message: "error",
				Data:    &echo.Map{"data": fmt.Sprintf("Unsupported file type: %s. Please upload common image or video formats.", contentType)},
			})
		}

		bucketName := configs.EnvMinioBucket()
		objectName := uuid.NewString() + filepath.Ext(mediaFileHeader.Filename)
		fileSize := mediaFileHeader.Size

		log.Printf("Attempting %s upload: Bucket=%s, Object=%s, Size=%d, ContentType=%s", whisper.DataType, bucketName, objectName, fileSize, contentType)

		_, err = configs.MinioClient.PutObject(ctx, bucketName, objectName, mediaFile, fileSize, minio.PutObjectOptions{
			ContentType: contentType,
		})
		if err != nil {
			log.Printf("Error uploading %s to Minio: %v", whisper.DataType, err)
			return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": "Failed to upload file to storage"}})
		}

		publicBaseURL := configs.EnvMinioPublicURLBase()
		whisper.MediaUrl = publicBaseURL + bucketName + "/" + objectName
		log.Printf("%s uploaded successfully: %s", strings.Title(whisper.DataType), whisper.MediaUrl)

	} else if err != nil && err != http.ErrMissingFile {
		log.Printf("Error retrieving form file 'mediaFile': %v", err)
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": "Error processing file upload"}})
	} else {
		textContent := c.FormValue("data")
		if strings.TrimSpace(textContent) == "" {
			return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": "Missing 'mediaFile' or non-empty 'data' field is required"}})
		}
		whisper.DataType = "text"
		whisper.Data = textContent
		log.Println("Processing text whisper.")
	}

	if validationErr := validate.Struct(&whisper); validationErr != nil {
		log.Printf("Validation failed for whisper: %+v, Errors: %v", whisper, validationErr)
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": validationErr.Error()}})
	}

	result, err := whisperCollection.InsertOne(ctx, whisper)
	if err != nil {
		log.Printf("Error inserting whisper into MongoDB: %v", err)
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": "Failed to save whisper"}})
	}

	var createdWhisper models.Whisper
	err = whisperCollection.FindOne(ctx, bson.M{"_id": result.InsertedID}).Decode(&createdWhisper)
	if err != nil {
		log.Printf("Error fetching created whisper: %v", err)
		return c.JSON(http.StatusCreated, responses.WhisperResponse{
			Status:  http.StatusCreated,
			Message: "success (whisper created, but failed to fetch for response)",
			Data:    &echo.Map{"data": result},
		})
	}

	return c.JSON(http.StatusCreated, responses.WhisperResponse{
		Status:  http.StatusCreated,
		Message: "success",
		Data:    &echo.Map{"data": createdWhisper},
	})
}

func GetWhisper(c echo.Context) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	whisperId := c.QueryParam("whisperId")
	var whisper models.Whisper
	defer cancel()

	objId, err := primitive.ObjectIDFromHex(whisperId)
	if err != nil {
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": "Invalid whisperId format"}})
	}

	err = whisperCollection.FindOne(ctx, bson.M{"_id": objId}).Decode(&whisper)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, responses.WhisperResponse{Status: http.StatusNotFound, Message: "error", Data: &echo.Map{"data": "Whisper not found"}})
		}
		log.Printf("Error finding whisper %s: %v", whisperId, err)
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": "Database error"}})
	}

	return c.JSON(http.StatusOK, responses.WhisperResponse{Status: http.StatusOK, Message: "success", Data: &echo.Map{"data": whisper}})
}

func GetWhispers(c echo.Context) error {
	radiusStr := c.QueryParam("radius")
	location := c.QueryParam("location")

	radius, err := strconv.ParseFloat(radiusStr, 64)
	if err != nil || radius <= 0 {
		log.Printf("Invalid or missing radius '%s', defaulting to 5000 units", radiusStr)
		radius = 5000
	}

	locParts := strings.Split(location, ",")
	if len(locParts) != 2 {
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": "Invalid location format. Expected 'latitude,longitude'"}})
	}
	userLat, errLat := strconv.ParseFloat(strings.TrimSpace(locParts[0]), 64)
	userLng, errLng := strconv.ParseFloat(strings.TrimSpace(locParts[1]), 64)
	if errLat != nil || errLng != nil {
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{Status: http.StatusBadRequest, Message: "error", Data: &echo.Map{"data": "Invalid latitude or longitude values"}})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := whisperCollection.Find(ctx, bson.M{})
	if err != nil {
		log.Printf("Error finding whispers: %v", err)
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": "Database query error"}})
	}
	defer cursor.Close(ctx)

	var nearbyWhispers []models.Whisper
	for cursor.Next(ctx) {
		var singleWhisper models.Whisper
		if err = cursor.Decode(&singleWhisper); err != nil {
			log.Printf("Error decoding whisper: %v", err)
			continue
		}

		whisperLocParts := strings.Split(singleWhisper.Location, ",")
		if len(whisperLocParts) != 2 {
			log.Printf("Skipping whisper %s due to invalid location format: %s", singleWhisper.Data, singleWhisper.Location)
			continue
		}
		whisperLat, errWLat := strconv.ParseFloat(strings.TrimSpace(whisperLocParts[0]), 64)
		whisperLng, errWLng := strconv.ParseFloat(strings.TrimSpace(whisperLocParts[1]), 64)
		if errWLat != nil || errWLng != nil {
			log.Printf("Skipping whisper %s due to invalid location values: %s", singleWhisper.Data, singleWhisper.Location)
			continue
		}
		latDiff := whisperLat - userLat
		lngDiff := whisperLng - userLng
		distanceSquared := (latDiff * latDiff) + (lngDiff * lngDiff)
		distanceFromUser := math.Sqrt(distanceSquared)

		if distanceFromUser <= radius {
			if singleWhisper.AmountListens < singleWhisper.MaxListens {
				nearbyWhispers = append(nearbyWhispers, singleWhisper)
			}
		}
	}

	if err := cursor.Err(); err != nil {
		log.Printf("Cursor error after iterating whispers: %v", err)
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{Status: http.StatusInternalServerError, Message: "error", Data: &echo.Map{"data": "Error reading whispers from database"}})
	}

	return c.JSON(http.StatusOK, responses.WhisperResponse{
		Status:  http.StatusOK,
		Message: "success",
		Data:    &echo.Map{"data": nearbyWhispers},
	})
}
