package models

type Whisper struct {
	Location      string   `json:"location" validate:"required"`
	Data          string   `json:"data" validate:"required"`
	MediaUrl      string   `json:"mediaUrl,omitempty"`
	DataType      string   `json:"dataType" validate:"required"`
	MaxListens    int      `json:"maxListens" validate:"required"`
	AmountListens int      `json:"amountListens" validate:"required"`
	Emotions      []string `json:"emotions" validate:"required"`
}
