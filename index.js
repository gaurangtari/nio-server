import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import EventEmitter from "events";

const app = express();
const PORT = 9090;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
});

app.use(cors());
app.use(bodyParser.json());
process.setMaxListeners(0);
const emitter = new EventEmitter();
emitter.setMaxListeners(100);

app.get("/", (req, res) => {
  res.send("sep24/1530");
});
//--------------------------------------------------------------------SOKCET---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("connected to socket", socket.id);
  socket.emit("me", socket.id);

  socket.on("connect", () => {
    console.log("Connected to socket");
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit(" ");
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal, data.to);
  });

  socket.on("hungup", ({ adminId, me }) => {
    io.to(adminId, me).emit("hungup", "cut the call");
  });
});
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server is running on port ${PORT}`)
);
