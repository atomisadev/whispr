package controllers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/atomisadev/whispr/apps/backend/cmd/server/configs"
	"github.com/atomisadev/whispr/apps/backend/cmd/server/responses"

	"github.com/google/uuid"                                         
	"github.com/labstack/echo/v4"
	"github.com/minio/minio-go/v7"
)

func UploadVideo(c echo.Context) error {
	fileHeader, err := c.FormFile("video") 
	if err != nil {
		log.Printf("Error getting form file: %v", err)
		return c.JSON(http.StatusBadRequest, responses.WhisperResponse{ 
			Status:  http.StatusBadRequest,
			Message: "error",
			Data:    &echo.Map{"data": "Missing or invalid 'video' file field"},
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("Error opening file stream: %v", err)
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{
			Status:  http.StatusInternalServerError,
			Message: "error",
			Data:    &echo.Map{"data": "Failed to open uploaded file"},
		})
	}
	defer file.Close() 

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second) 
	defer cancel()

	bucketName := configs.EnvMinioBucket()
	objectName := uuid.NewString() + filepath.Ext(fileHeader.Filename)
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	fileSize := fileHeader.Size

	log.Printf("Attempting to upload: Bucket=%s, Object=%s, Size=%d, ContentType=%s", bucketName, objectName, fileSize, contentType)


	uploadInfo, err := configs.MinioClient.PutObject(ctx, bucketName, objectName, file, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})

	if err != nil {
		log.Printf("Error uploading to Minio: %v", err)
		return c.JSON(http.StatusInternalServerError, responses.WhisperResponse{
			Status:  http.StatusInternalServerError,
			Message: "error",
			Data:    &echo.Map{"data": fmt.Sprintf("Failed to upload file to storage: %v", err)},
		})
	}

	log.Printf("Successfully uploaded %s of size %d (ETag: %s)", objectName, uploadInfo.Size, uploadInfo.ETag)

	return c.JSON(http.StatusCreated, responses.WhisperResponse{
		Status:  http.StatusCreated,
		Message: "success",
		Data: &echo.Map{"data": echo.Map{
			"message":    "Video uploaded successfully",
			"bucket":     uploadInfo.Bucket,
			"objectName": uploadInfo.Key, 
			"size":       uploadInfo.Size,
			"etag":       uploadInfo.ETag,
		}},
	})
}