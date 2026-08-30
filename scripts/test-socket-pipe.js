const { io } = require('socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

console.log('Connecting to Socket.io server at', SOCKET_URL);

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log(`\x1b[32m✔ Connected to Socket.io server with ID: ${socket.id}\x1b[0m`);

  console.log('Emitting test event: "ping"...');
  socket.emit('ping', { test: true, sentAt: new Date().toISOString() });
});

socket.on('pong', (data) => {
  console.log('\x1b[35m✔ Received "pong" from server:\x1b[0m', data);
  console.log('\x1b[32m✔ Socket.io bidirectional pipe is 100% verified and working!\x1b[0m\n');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error (ensure backend server is running):', err.message);
  process.exit(1);
});
