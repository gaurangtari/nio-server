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
  res.send("aug27/0922");
});
//SOKCET
io.on("connection", (socket) => {
  socket.emit("me", socket.id);

  socket.on("join-room", (room) => {
    console.log(`user joined room ${room}`);
    socket.room(room)
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("  ");
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
});




//---------------------------------------------------------------------REDIS-------------------------------------------------------------------------------------


app.post("/joystick-data", (req, res) => {
  const { surge, sway, heave, yaw } = req.body;

  const messageId = redis.xadd(
    "joystickStream",
    "*",
    "data",
    JSON.stringify({ surge, sway, heave, yaw })
  );
  console.log({surge, sway, heave, yaw})

  const messageId1 = redis.xtrim("joystickStream", "MAXLEN", 5);
  res.status(200).send({ message: "Data added to stream", id: messageId });
  console.log(messageId, messageId1);
});

//sending ID
app.post("/admin-id", (req, res) => {
  const { id } = req.body;
  const adminId = redis.xadd(
    "adminIdStream",
    "*",
    "data",
    JSON.stringify({ id })
  );
  const adminIdDelete = redis.xtrim("adminIdStream", "MAXLEN", 2);
  res.status(200).send({ message: "Data added to stream", id: adminId });
  console.log(adminId, adminIdDelete);
});


//getting ID
app.get("/get-admin-id", async (req, res) => {
  try {
    const streamData = await redis.xrange("adminIdStream", "-", "+");

    const results = streamData.map(([id, fields]) => {
      const data = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }
      return { id, data: JSON.parse(data.data) };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Error reading from Redis stream:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//getting telemetary data
app.get("/get-telm", async(req, res)=>{
  try {
    const streamData = await redis.xrange("vehicle-state", "-", "+");

    const results = streamData.map(([id, fields])=>{
      const data ={}
      for (let i = 0; i<fields.length; i +=2) {
        data[fields[i]] = fields[i + 1];
      }
      return {id, data: JSON.parse(data.data)}
    })
    res.status(200).json(results)
  }catch(error){console.error("error reading from redis stream:", error);
    res.status(500).json({message: "internal Server Error"})
  }
})

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
