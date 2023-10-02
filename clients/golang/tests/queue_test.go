package wsclient

import (
	"sync"
	"testing"
	"time"

	"taskforce.sh/bullmq_proxy_client/queue"
)

func TestAddJob(t *testing.T) {
	const numJobs = 10
	q := queue.NewQueue("ws://localhost:8080/queues/test?token=1234")

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
	
	worker := queue.NewWorker("ws://localhost:8080", "test", "1234", 10, func(job interface{}) (interface{}, error) {
		t.Logf("Processing job: %v", job)
		jobCount++	
		return nil, nil
	})

	// Sleep for a bit to allow the worker to  process
	time.Sleep(8 * time.Second)

	t.Logf("Processed %d of %d jobs", jobCount, numJobs)

	// Close the worker now
	worker.Close()
}
