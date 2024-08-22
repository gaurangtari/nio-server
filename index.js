import express from "express";
import bodyParser from "body-parser";
import http from "http";
import Redis from "ioredis";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const PORT = 9090;
const redis = new Redis(
  "redis://default:jhnr76GXIDfoqtETx8GGIi9PeNqBHYwe@redis-12396.c261.us-east-1-4.ec2.redns.redis-cloud.com:12396"
);
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

app.get("/", (req, res) => {
  res.send("Running again");
});
//SOKCET
io.on("connection", (socket) => {
  socket.emit("me", socket.id);

  socket.on("disconnect", () => {
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
});
//REDIS
app.post("/joystick-data", (req, res) => {
  const { surge, sway, heave, yaw } = req.body;
  console.log({ surge, sway, heave, yaw });

  const messageId = redis.xadd(
    "joystickStream",
    "*",
    "data",
    JSON.stringify({ surge, sway, heave, yaw })
  );
  res.status(200).send({ message: "Data added to stream", id: messageId });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
