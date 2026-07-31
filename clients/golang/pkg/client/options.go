package client

func RootUrl(url string) ClientOpts {
	return func(c *Client) {
		c.rootUrl = url
	}
}
func AuthToken(token string) ClientOpts {
	return func(c *Client) {
		c.authToken = token
	}
}
