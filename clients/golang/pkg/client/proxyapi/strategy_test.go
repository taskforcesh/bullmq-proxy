package proxyapi_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
	"taskforce.sh/bullmq_proxy_client/pkg/client/proxyapi"
)

func TestBulkJobOptionsMarshalNoRepeat(t *testing.T) {
	ans, err := json.Marshal(&proxyapi.BulkJobOptions{
		Repeat:       "test",
		RepeatJobKey: "foo",
	})
	require.NoError(t, err)
	var o map[string]any
	err = json.Unmarshal(ans, &o)
	require.NoError(t, err)
	require.NotContains(t, o, "repeat")
	require.NotContains(t, o, "repeatJobKey")

}
