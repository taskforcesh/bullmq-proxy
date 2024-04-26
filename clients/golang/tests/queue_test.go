package wsclient

import (
	"context"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"taskforce.sh/bullmq_proxy_client/pkg/queue"
)

func TestAddJob(t *testing.T) {
	ctx := context.Background()
	h := make(http.Header)
	h.Set("Authorization", "Bearer 1234")
	const numJobs = 10
	q, err := queue.NewQueue(ctx, "ws://localhost:8080/ws/queues/test", h)
	require.NoError(t, err)

	// Use a wait group to wait for all goroutines to finish
	var wg sync.WaitGroup

	// A buffered channel to communicate errors. It can store as many errors as there are jobs.
	errCh := make(chan error, 100)

	// Add 1000 jobs and benchmark the time it takes to add them.
	start := time.Now()

	for i := 0; i < numJobs; i++ {
		wg.Add(1) // Add a count to the wait group for each goroutine

		go func() {
			defer wg.Done() // Decrease the count when the goroutine finishes

			_, err := q.AddJob("test", map[string]interface{}{"foo": "bar"}, nil)
			if err != nil {
				errCh <- err // Send any errors to the channel
			}
		}()
	}

	// Wait for all goroutines to finish
	wg.Wait()
	close(errCh) // Close the error channel

	elapsed := time.Since(start)
	t.Logf("Added %d jobs in %s\n", numJobs, elapsed)

	// Check if there were any errors
	for err := range errCh {
		t.Error("Error adding job:", err)
	}

	// Channels for signaling
	var jobCount int

	worker, err := queue.NewWorker(ctx, "ws://localhost:8080", "test", "1234", 10, func(job interface{}) (interface{}, error) {
		t.Logf("Processing job: %v", job)
		jobCount++
		return nil, nil
	})
	require.NoError(t, err)

	// Sleep for a bit to allow the worker to  process
	time.Sleep(8 * time.Second)

	t.Logf("Processed %d of %d jobs", jobCount, numJobs)

	// Close the worker now
	worker.Close()
}
