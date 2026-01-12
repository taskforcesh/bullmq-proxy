package proxyapi

import (
	"bytes"
	"encoding/json"
	"time"
)

type BackoffStrategy struct {
	Type  any
	Delay float64
}

func (b *BackoffStrategy) UnmarshalJSON(xs []byte) error {
	if len(xs) == 0 {
		return nil
	}
	var backoffStrategy struct {
		Type  any     `json:"type,omitempty"`
		Delay float64 `json:"delay,omitempty"`
	}
	// assume object if start with {
	if xs[0] == '{' {
		err := json.Unmarshal(xs, &backoffStrategy)
		if err != nil {
			return err
		}
		b.Type = backoffStrategy.Type
		b.Delay = backoffStrategy.Delay
		return nil
	}
	// otherwise, assume number (delay)
	err := json.Unmarshal(xs, &b.Delay)
	if err != nil {
		return err
	}

	return nil
}

func (b *BackoffStrategy) MarshalJSON() ([]byte, error) {
	if b.Type == nil {
		return json.Marshal(b.Delay)
	}
	return json.Marshal(map[string]any{
		"type":  b.Type,
		"delay": b.Delay,
	})
}

// RemovePolicy represents TS type boolean | number | KeepJobs;
// if Always == true, then always remove, regardless of Count and AgeSeconds
// if Count != 0, keep up to N, for up to AgeSeconds if set
// if AgeSeconds is set, keep up to AgeSeconds. If Count==0, keep infinite, otherwise defer to KeepPolicy
type RemovePolicy struct {
	Always     bool
	Count      int
	AgeSeconds float64
}

func (r *RemovePolicy) UnmarshalJSON(xs []byte) error {
	if len(xs) == 0 {
		return nil
	}
	if bytes.Equal(xs, []byte("true")) {
		r.Always = true
		return nil
	}
	if bytes.Equal(xs, []byte("false")) {
		r.Always = false
		return nil
	}
	var removePolicy struct {
		Count int     `json:"Count,omitempty"`
		Age   float64 `json:"Age,omitempty"`
	}
	// assume object if start with {
	if xs[0] == '{' {
		err := json.Unmarshal(xs, &removePolicy)
		if err != nil {
			return err
		}
		r.Count = removePolicy.Count
		r.AgeSeconds = removePolicy.Age
		return nil
	}
	// otherwise, assume count
	err := json.Unmarshal(xs, &r.Count)
	if err != nil {
		return err
	}
	return nil

}

func (r *RemovePolicy) MarshalJSON() ([]byte, error) {
	if r.Always {
		return json.Marshal(true)
	}
	if r.Count == 0 && r.AgeSeconds == 0 {
		return json.Marshal(false)
	}
	if r.AgeSeconds != 0 {
		return json.Marshal(map[string]any{
			"age":   r.AgeSeconds,
			"count": r.Count,
		})
	}
	return json.Marshal(r.Count)
}

type RepeatOptions struct {
	CurrentDate  *time.Time `json:"currentDate"`
	StartDate    *time.Time `json:"startDate"`
	EndDate      *time.Time `json:"endDate"`
	UTC          *bool      `json:"utc"`
	TZ           *string    `json:"tz"`
	NthDayOfWeek *int       `json:"nthDayOfWeek"`

	// A repeat pattern
	Pattern *string `json:"pattern,omitempty"`
	// Custom repeatable key. This is the key that holds the "metadata"
	// of a given repeatable job. This key is normally auto-generated but
	// it is sometimes useful to specify a custom key for easier retrieval
	// of repeatable jobs.
	Key *string `json:"key,omitempty"`
	// Number of times the job should repeat at max.
	Limit *int `json:"limit,omitempty"`
	// Repeat after this amount of milliseconds
	// (`pattern` setting cannot be used together with this setting.)
	Every *int `json:"every,omitempty"`
	// Repeated job should start right now
	// ( work only with every settings)
	Immediately *bool `json:"immediately,omitempty"`
	// The start value for the repeat iteration count.
	Count      *int    `json:"count,omitempty"`
	PrevMillis *int    `json:"prevMillis,omitempty"`
	Offset     *int    `json:"offset,omitempty"`
	JobId      *string `json:"jobId,omitempty"`
}
