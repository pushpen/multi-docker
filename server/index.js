const keys = require("./keys");
// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Client } = require("pg");

const client = new Client({
  user: "postgres",
  host: "postgres",
  database: "postgres",
  password: "postgres1",
  port: 5432,
});

console.log("Hiiiiiiiii");
client.connect();
client
  .query("SELECT NOW()")
  .then((result) => console.log(result.rows))
  .catch((e) => console.error(e.stack));

client
  .query("CREATE TABLE IF NOT EXISTS values (number INT)")
  .catch((err) => console.log(err));

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/", (req, res) => {
  console.log("Hi root");
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  const values = await client.query("SELECT * from values");

  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }

  redisClient.hset("values", index, "Nothing yet!");
  redisPublisher.publish("insert", index);
  client
    .query("INSERT INTO values(number) VALUES($1)", [index])
    .catch((err) => console.log(err));

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening");
});
