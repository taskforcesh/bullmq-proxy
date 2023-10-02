package main

import (
	"fmt"

	"taskforce.sh/bullmq_proxy_client/queue"
)

func main() {
	q := queue.NewQueue("ws://localhost:8080/queues/test?token=1234")
	
	// Sample usage of your library's functionality.
	jobResponse, err := q.AddJob("testJob", map[string]string{"key": "value"}, nil)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Job Added:", jobResponse)
}
