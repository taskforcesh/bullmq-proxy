package wsclient

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

/*
type Message struct {
	ID   int         `json:"id"`
	Data interface{} `json:"data"`
}
*/

type Message[T any] struct {
	ID   int `json:"id"`
	Data T   `json:"data"`
}

type QueueResult struct {
	OK  *json.RawMessage `json:"ok,omitempty"`
	Err *ErrorDetail     `json:"err,omitempty"`
}

type ErrorDetail struct {
	Message string `json:"message"`
	Stack   string `json:"stack"`
}

const (
	// Time to wait before timing out a response from server
	responseTimeout = time.Second * 10
)

// Struct to hold pending messages
type PendingMessage[T any] struct {
	messageID int
	response  chan Message[QueueResult]
}

// Struct to hold the WebSocket connection
type WebSocket[T any] struct {
	conn         *websocket.Conn
	currentMsgID atomic.Int64

	writeMutex sync.Mutex

	pendingMsgs    map[int]chan Message[QueueResult]
	pendingMsgLock sync.Mutex

	stopCh    chan struct{}
	closeOnce sync.Once
}

func New[T any](ctx context.Context, url string, headers http.Header) (*WebSocket[T], error) {
	return ConnectWebSocket[T](ctx, url, headers)
}

var defaultUpgrader = websocket.Upgrader{
	HandshakeTimeout:  responseTimeout,
	EnableCompression: false,
}

func ConnectWebSocket[T any](ctx context.Context, url string, headers http.Header) (*WebSocket[T], error) {
	var conn, _, err = websocket.DefaultDialer.DialContext(ctx, url, headers)
	if err != nil {
		log.Fatal("Error connecting to WebSocket:", err)
	}

	var ws = &WebSocket[T]{
		conn:           conn,
		pendingMsgs:    make(map[int]chan Message[QueueResult]),
		pendingMsgLock: sync.Mutex{},
		writeMutex:     sync.Mutex{},
		stopCh:         make(chan struct{}),
	}
	ws.currentMsgID.Add(1)

	go ws.listenForResponses()

	return ws, nil
}

func (ws *WebSocket[T]) listenForResponses() {
	for {
		select {
		case <-ws.stopCh:
			return
		default:
		}
		var msg Message[QueueResult]
		err := ws.conn.ReadJSON(&msg)
		if err != nil {
			log.Println("Error reading message:", err)
			ws.Close()
			return
		}

		ws.pendingMsgLock.Lock()
		if ch, ok := ws.pendingMsgs[msg.ID]; ok {
			ch <- msg
			delete(ws.pendingMsgs, msg.ID)
		}
		ws.pendingMsgLock.Unlock()
	}
}

func (ws *WebSocket[T]) ReceiveMessage() (*Message[T], error) {
	var msg Message[T]
	err := ws.conn.ReadJSON(&msg)
	if err != nil {
		return nil, err
	}
	return &msg, err
}

func (ws *WebSocket[T]) Request(msg T) (*json.RawMessage, error) {
	msgID := int(ws.currentMsgID.Add(1))
	respChan := make(chan Message[QueueResult])
	ws.pendingMsgLock.Lock()
	ws.pendingMsgs[msgID] = respChan
	ws.pendingMsgLock.Unlock()

	message := &Message[any]{
		ID:   msgID,
		Data: msg,
	}
	err := ws.writeMessage(message)
	if err != nil {
		return nil, err
	}

	select {
	case resp := <-respChan:
		var result = resp.Data
		if result.Err != nil {
			return nil, fmt.Errorf("%s\n%s", result.Err.Message, result.Err.Stack)
		}
		return result.OK, nil
	case <-time.After(responseTimeout):
		return nil, errors.New("Response timed out")
	}
}

func (ws *WebSocket[T]) Respond(id int, data any) error {
	message := &Message[any]{
		ID:   id,
		Data: data,
	}
	return ws.writeMessage(message)
}

func (ws *WebSocket[T]) writeMessage(msg *Message[any]) error {
	ws.writeMutex.Lock() // Lock before writing to the connection
	err := ws.conn.WriteJSON(msg)
	ws.writeMutex.Unlock() // Unlock after writing
	if err != nil {
		return err
	}
	return nil
}

func (ws *WebSocket[T]) Close() {
	ws.closeOnce.Do(func() {
		close(ws.stopCh)
		ws.conn.Close()
	})
}
