package configs

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

var envLoaded = false

func loadEnvOnce() {
	if !envLoaded {
		err := godotenv.Load()
		if err != nil {
			log.Println("Warning: Error loading .env file", err)
		}
		envLoaded = true
	}

}
func EnvMongoURI() string {
	loadEnvOnce()
	return os.Getenv("MONGOURI")
}

//rest is minio shit
func EnvMinioEndpoint() string {
	loadEnvOnce()
	val := os.Getenv("MINIO_ENDPOINT")
	if val == "" {
		log.Println("Warning: MINIO_ENDPOINT not set, defaulting to localhost:9000")
		return "localhost:9000"
	}
	return val
}

func EnvMinioAccessKey() string {
	loadEnvOnce()
	return os.Getenv("MINIO_ACCESS_KEY")
}

func EnvMinioSecretKey() string {
	loadEnvOnce()
	return os.Getenv("MINIO_SECRET_KEY")
}

func EnvMinioBucket() string {
	loadEnvOnce()
	bucket := os.Getenv("MINIO_BUCKET")
	if bucket == "" {
		log.Println("Warning: MINIO_BUCKET not set, defaulting to 'whispers'")
		return "whispers"
	}
	return bucket
}

func EnvMinioUseSSL() bool {
	loadEnvOnce()
	useSSLStr := os.Getenv("MINIO_USE_SSL")
	useSSL, err := strconv.ParseBool(useSSLStr)
	if err != nil {
		return false
	}
	return useSSL
}

func EnvMinioPublicURLBase() string {
	loadEnvOnce()
	publicURL := os.Getenv("MINIO_PUBLIC_URL_BASE")
	if publicURL != "" {
		if !strings.HasSuffix(publicURL, "/") {
			publicURL += "/"
		}
		return publicURL
	}

	endpoint := EnvMinioEndpoint()
	useSSL := EnvMinioUseSSL()
	protocol := "http"
	if useSSL {
		protocol = "https"
	}
	return fmt.Sprintf("%s://%s/", protocol, endpoint)
}
