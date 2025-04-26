package configs

import (
	"context"
	"fmt"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var MinioClient *minio.Client

func ConnectMinio() {
	endpoint := EnvMinioEndpoint()
	accessKeyID := EnvMinioAccessKey()
	secretAccessKey := EnvMinioSecretKey()
	useSSL := EnvMinioUseSSL()

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKeyID, secretAccessKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Fatalln("Failed to initialize Minio client:", err)
	}

	log.Println("Successfully connected to Minio!")
	MinioClient = client
}

func EnsureBucketExists(ctx context.Context, bucketName string, location string) error {
	if MinioClient == nil {
		return fmt.Errorf("Minio client not initialized")
	}
	exists, err := MinioClient.BucketExists(ctx, bucketName)
	if err != nil {
		log.Printf("Error checking if bucket %s exists: %v", bucketName, err)
		return err
	}
	if !exists {
		log.Printf("Bucket %s does not exist. Creating...", bucketName)
		err = MinioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: location})
		if err != nil {
			log.Printf("Error creating bucket %s: %v", bucketName, err)
			return err
		}
		log.Printf("Successfully created bucket %s", bucketName)
	} else {
		log.Printf("Bucket %s already exists.", bucketName)
	}
	return nil
}