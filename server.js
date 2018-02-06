const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 80;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Handle http requests.
server.on('request', (request, response) => {
  const { headers, method, url } = request;
  request.on('error', (err) => {
    console.error(err);
  });

  // Handle post requests - message is body of request.
  if (method === 'POST') {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      console.log("Recieved via post: " + body);
      wss.broadcast(body);
      response.statusCode = 200;
      response.end();
    });
  // Handle get requests - message is url of request.
  } else if (method === 'GET') {
    console.log("Recieved via get: " + url);
    wss.broadcast(url);
    response.statusCode = 200;
    response.end();
  }
});

// Handle websocket connections.
wss.on('connection', (socket) => {
  socket.name = socket._socket.remoteAddress.replace(/^.*:/, '') +
    ':' + socket._socket.remotePort;
  console.log('Connected: ' + socket.name);

  socket.on('message', (message) => {
    message = message.trim();
    console.log("Recieved via ws: " + message);
    wss.broadcast(message);
  });
});

// Broadcast to all.
wss.broadcast = function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

// Handle ctrl-c.
process.on('SIGINT', () => {
  wss.close(() => {
    console.log("Exiting.");
    process.exit(0);
  });
});

server.listen(port);
console.log("Broadcaster listening on port " + port);
