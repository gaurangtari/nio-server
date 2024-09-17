import express from "express";
import bodyParser from "body-parser";
import http from "http";
import Redis from "ioredis";
import { Server } from "socket.io";
import cors from "cors";
import EventEmitter from "events";

const app = express();
const PORT = 9090;
const LOCAL_NETWORK = "172.27.30.10";
const redis = new Redis();
// "redis://default:jhnr76GXIDfoqtETx8GGIi9PeNqBHYwe@redis-12396.c261.us-east-1-4.ec2.redns.redis-cloud.com:12396"
const redisPublisher = new Redis();
// "redis://default:jhnr76GXIDfoqtETx8GGIi9PeNqBHYwe@redis-12396.c261.us-east-1-4.ec2.redns.redis-cloud.com:12396"
const redisSubscriber = new Redis();
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
  res.send("sep10/0946");
});
//--------------------------------------------------------------------SOKCET---------------------------------------------------------------------------
io.on("connection", (socket) => {
  socket.emit("me", socket.id);

  // subscribe to redis
  redisSubscriber.subscribe("vehicle-state");
  redisSubscriber.on("message", (channel, data) => {
    if (channel === "vehicle-state") {
      socket.emit("vehicle-state", JSON.parse(data));
    }
  });

  socket.on("join-room", (room, whoJoined) => {
    socket.join(room);
  });

  socket.on("which-device", (data) => {
    console.log(data, " connected");
  });
  socket.emit("trial", "trial data");

  socket.on("disconnect", () => {
    socket.broadcast.emit("  ");
    redisSubscriber.unsubscribe;
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal, data.to);
  });

  socket.on("joystick-data", (data) => {
    console.log(data);
    const { surge, sway, heave, yaw } = data;
    const messageId = redis.xadd(
      "joystickStream",
      "*",
      "data",
      JSON.stringify({ surge, sway, heave, yaw })
    );

    const messageId1 = redis.xtrim("joystickStream", "MAXLEN", 5);

    const channel = "joystick-data";
    redisPublisher.publish(
      channel,
      JSON.stringify({ surge, sway, heave, yaw }),
      (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log({ surge, sway, heave, yaw });
        }
      }
    );
  });

  // socket.on("non-joy-input", (data) => {
  //   const messageId = redis.xadd(
  //     "nonJoyStream",
  //     "*",
  //     "data",
  //     JSON.stringify(data)
  //   );

  //   const messageId1 = redis.xtrim("nonJoyStream", "MAXLEN", 5);

  //   console.log(messageId);
  // });
});

//---------------------------------------------------------------------REDIS-------------------------------------------------------------------------------------

// app.post("/joystick-data", (req, res) => {
//   const { surge, sway, heave, yaw } = req.body;

//   const messageId = redis.xadd(
//     "joystickStream",
//     "*",
//     "data",
//     JSON.stringify({ surge, sway, heave, yaw })
//   );

//   const messageId1 = redis.xtrim("joystickStream", "MAXLEN", 5);
//   res.status(200).send({ message: "Data added to stream", id: messageId });
// });

app.post("/non-joy-input", (req, res) => {
  const data = req.body;

  const messageId = redis.xadd(
    "nonJoyStream",
    "*",
    "data",
    JSON.stringify(data)
  );

  const messageId1 = redis.xtrim("nonJoyStream", "MAXLEN", 5);
  res.status(200).send({ message: "Data added to stream", id: messageId });
});

//Creating a publisher
app.post("/publish-joystick-data", (req, res) => {});
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
// app.get("/get-telm", async(req, res)=>{
//   try {
//     const streamData = await redis.xrange("vehicleStateStream", "-", "+")

//     const results = streamData.map(([id, fields]) => {
//       const data = {};
//       for (let i = 0; i < fields.length; i += 2) {
//         data[fields[i]] = fields[i + 1];
//       }
//       return { id, data };
//     });
//     res.status(200).json(results)
//   }catch(error){console.error("error reading from redis stream:", error);
//     res.status(500).json({message: "internal Server Error"})
//   }
// })

server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server is running on port ${PORT}`)
);
