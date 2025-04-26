package models

type Whisper struct {
	Location      string   `json:"location" validate:""`
	Data          string   `json:"data,omitempty"`
	MediaUrl      string   `json:"mediaUrl,omitempty"`
	DataType      string   `json:"dataType" validate:"required,oneof=text image video"`
	MaxListens    int      `json:"maxListens" validate:"required,gte=1"`
	AmountListens int      `json:"amountListens" validate:"gte=0"`
	Emotions      []string `json:"emotions" validate:"required,min=1"`
}
