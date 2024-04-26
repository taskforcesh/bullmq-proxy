package main

import (
	"context"
	"fmt"
	"net/http"

	"taskforce.sh/bullmq_proxy_client/pkg/queue"
)

func main() {
	h := make(http.Header)
	h.Set("Authorization", "Bearer 1234")
	ctx := context.Background()
	q, err := queue.NewQueue(ctx, "ws://localhost:8080/queues/test", h)
	if err != nil {
		fmt.Println("Error Connecting:", err)
		return
	}

	// Sample usage of your library's functionality.
	jobResponse, err := q.AddJob("testJob", map[string]string{"key": "value"}, nil)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Job Added:", jobResponse)
}
