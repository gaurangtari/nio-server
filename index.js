 import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import EventEmitter from "events";
import { sign } from "crypto";

const app = express();
const PORT = 8080;
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
  const currentDate = new Date();

  const day = String(currentDate.getDate()).padStart(2, "0");
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const year = currentDate.getFullYear();

  // Get day name
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = days[currentDate.getDay()];

  // Get time components
  const hours = String(currentDate.getHours()).padStart(2, "0");
  const minutes = String(currentDate.getMinutes()).padStart(2, "0");
  res.send(`${day}/${month}/${year}, ${dayName}, Time: ${hours}:${minutes}`);
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
    console.log("       ", signalData, "             ");
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal, data.to);
  });

  socket.on("hungup", ({ adminId, me }) => {
    io.to(adminId, me).emit("hungup", "cut the call");
  });
  socket.on("callDeline", (is, to) => {
    io.to(to).emit("callDeclined", is);
    console.log("isDecline?:", is, "the call was by:", to);
  });
});

//-------------------------------------------------------------------- LISTEN ------------------------------------------------------------------
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server is running on port ${PORT}`)
);
