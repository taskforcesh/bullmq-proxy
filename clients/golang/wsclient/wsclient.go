package wsclient

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
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
	ID   int    `json:"id"`
	Data T      `json:"data"`
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
	conn *websocket.Conn
	currentMsgID int
	pendingMsgs map[int]chan Message[QueueResult]
	pendingMsgLock sync.Mutex
	writeMutex sync.Mutex
}

func New[T any](url string) *WebSocket[T] {
	return ConnectWebSocket[T](url)
}

func ConnectWebSocket[T any](url string) *WebSocket[T] {
	var conn, _, err = websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		log.Fatal("Error connecting to WebSocket:", err)
	}
	
	var ws = &WebSocket[T]{
		conn: conn,
		currentMsgID: 1,
		pendingMsgs:  make(map[int]chan Message[QueueResult]),
		pendingMsgLock: sync.Mutex{},
		writeMutex: sync.Mutex{},
	}

	go ws.listenForResponses()

	return ws
}

func (ws *WebSocket[T]) listenForResponses() {
	for {
		var msg Message[QueueResult]
		err := ws.conn.ReadJSON(&msg)
		if err != nil {
			log.Println("Error reading message:", err)
			continue
		}

		ws.pendingMsgLock.Lock()
		if ch, ok := ws.pendingMsgs[msg.ID]; ok {
			ch <- msg
			delete(ws.pendingMsgs, msg.ID)
		}
		ws.pendingMsgLock.Unlock()
	}
}

func (ws *WebSocket[T]) SendWebSocketMessage(msg T) (*json.RawMessage, error) {
	ws.pendingMsgLock.Lock()
	msgID := ws.currentMsgID
	ws.currentMsgID++
	ws.pendingMsgLock.Unlock()

	respChan := make(chan Message[QueueResult])
	ws.pendingMsgLock.Lock()
	ws.pendingMsgs[msgID] = respChan
	ws.pendingMsgLock.Unlock()

	message := Message[T]{
		ID:   msgID,
		Data: msg,
	}

	ws.writeMutex.Lock()  // Lock before writing to the connection
	err := ws.conn.WriteJSON(message)
	defer ws.writeMutex.Unlock()  // Unlock after writing

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

func (ws *WebSocket[T]) ReceiveWebSocketMessage() (Message[T], error) {
	var msg Message[T]
	err := ws.conn.ReadJSON(&msg)
	return msg, err
}

func (ws *WebSocket[T]) Close() {
	ws.conn.Close()
}

func (ws *WebSocket[T]) Respond(id int, data interface{}) error {
	message := Message[any]{
		ID:   id,
		Data: data,
	}

	ws.writeMutex.Lock()  // Lock before writing to the connection
	err := ws.conn.WriteJSON(message)
	defer ws.writeMutex.Unlock()  // Unlock after writing

	return err
}
