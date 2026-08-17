import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print('Connected to server')

@sio.on('TICKET_CREATED')
def on_ticket_created(data):
    print('Received TICKET_CREATED:', data)

@sio.on('TICKET_SERVING')
def on_ticket_serving(data):
    print('Received TICKET_SERVING:', data)

@sio.on('TICKET_COMPLETED')
def on_ticket_completed(data):
    print('Received TICKET_COMPLETED:', data)

sio.connect('http://localhost:5000')
print("Waiting for events...")
time.sleep(10)
sio.disconnect()
