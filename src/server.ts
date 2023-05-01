import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";

const port = process.env.PORT ?? 80;
const server = createServer();
const wss = new WebSocketServer({ server });

// Handle http requests.
server.on("request", (request, response) => {
  const { method, url } = request;
  const name =
    request.socket.remoteAddress?.replace(/^.*:/, "") +
    ":" +
    request.socket.remotePort;

  request.on("error", (err) => {
    console.error(err);
  });

  // Handle post requests - message is body of request.
  if (method === "POST") {
    let chunks: Array<any> = [];
    request
      .on("data", (chunk) => {
        chunks.push(chunk);
      })
      .on("end", () => {
        const body = Buffer.concat(chunks).toString();
        console.log(`Recieved via post from ${name}: ${body}`);
        broadcast(body);
        response.statusCode = 200;
        response.end();
      });
    // Handle get requests - message is url of request.
  } else if (method === "GET") {
    console.log(`Recieved via get from ${name}: ${url}`);
    broadcast(`${url}`);
    response.statusCode = 200;
    response.end();
  }
});

// Handle websocket connections.
wss.on("connection", (ws, request) => {
  const name =
    request.socket.remoteAddress?.replace(/^.*:/, "") +
    ":" +
    request.socket.remotePort;
  console.log(`Connected: ${name}`);

  ws.on("message", (raw) => {
    const message = raw.toString().trim();
    console.log(`Received via ws from ${name}: ${message}`);
    broadcast(message);
  });

  ws.on("pong", () => {
    console.log(`Received PONG from ${name}`);
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    client.ping();
    console.log(`Sent PING to`, client);
  });
}, 10000);

wss.on("close", () => {
  clearInterval(interval);
});

// Broadcast to all.
const broadcast = (data: string) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

// Handle ctrl-c.
process.on("SIGINT", () => {
  clearInterval(interval);
  wss.close(() => {
    console.log("Exiting.");
    process.exit(0);
  });
});

server.listen(port);
console.log(`Broadcaster listening on port ${port}`);
