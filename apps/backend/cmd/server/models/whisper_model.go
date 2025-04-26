package models

type Whisper struct {
	Location      string   `json:"Location" validate:""`
	Data          string   `json:"Data,omitempty"`
	MediaUrl      string   `json:"MediaUrl,omitempty"`
	DataType      string   `json:"DataType" validate:"required,oneof=text image video"`
	MaxListens    int      `json:"MaxListens" validate:"required,gte=1"`
	AmountListens int      `json:"AmountListens" validate:"gte=0"`
	Emotions      []string `json:"Emotions" validate:"required,min=1"`
}
