const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { v4: uuidv4 } = require("uuid");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    transports: ["websocket"],
  },
  allowEIO3: true,
});

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
});

app.use("/peerjs", peerServer);
app.set("view engine", "ejs");
app.use(express.static("public"));

const rooms = {};

// ✅ Redirect to /room/:uuid instead of just /:uuid
app.get("/", (req, res) => {
  res.redirect(`/room/${uuidv4()}`);
});

// ✅ Correctly serve /room/:roomId
app.get("/room/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(userId);

    socket.emit("all-users", rooms[roomId].filter(id => id !== userId));
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId].filter(id => id !== userId);
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
