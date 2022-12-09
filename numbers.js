const express = require("express");
const app = express();
const path = require("path");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(".env") });
process.stdin.setEncoding("utf8");
let env = process.env;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
(async function () {
  const uri = `mongodb+srv://${env.MONGO_DB_USERNAME}:${env.MONGO_DB_PASSWORD}@cluster0.v3bkyhq.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
  });

  await client.connect();

  if (process.argv.length != 3) {
    process.stdout.write("Usage: node numbers.js PORT_NUMBER");
  }
  const portNumber = process.argv[2];

  app.use(express.static(path.resolve("public/")));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.set("views", "templates");
  app.set("view engine", "ejs");
  app.get("/", (req, res) => {
    res.sendFile(path.resolve("home.html"));
  });

  app.post("/", async (req, res) => {
    let form = req.body;
    form.phone = form.phone.split("-");
    form.date = form.date.split("/");
    form.ssn = form.ssn.split("-");
    let fact = {
      phoneFact: await fetch(
        `http://numbersapi.com/${form.phone[0]},${form.phone[1]},${form.phone[2]}/math?json`
      ).then((data) => data.json()),
    };
    fact.dateFact1 = await fetch(
      `http://numbersapi.com/${form.date[0]}/${form.date[1]}/date?json`
    ).then((data) => data.json());

    fact.dateFact2 = await fetch(
      `http://numbersapi.com/${form.date[2]}/year?json`
    ).then((data) => data.json());

    fact.ssnFact = await fetch(
      `http://numbersapi.com/${form.ssn[0]},${form.ssn[2]}/math?json`
    ).then((data) => data.json());

    fact.ssnFact[form.ssn[1]] = await fetch(
      `http://numbersapi.com/${form.ssn[1]}/trivia?json`
    ).then((data) => data.json());

    fact.ssnFact[form.ssn[1]] = fact.ssnFact[form.ssn[1]].text;
    form.fact = fact;

    let time = Date.now();
    form.time = new Date(time).toUTCString();
    console.log(form);
    await client
      .db(env.MONGO_DB_NAME)
      .collection(env.MONGO_COLLECTION)
      .insertOne(form);
    let variables = { form };
    res.render("results", variables);
  });

  app.get("/search", async (req, res) => {
    let name = req.query.name;
    let filter = { name: name };
    let cursor = client
      .db(env.MONGO_DB_NAME)
      .collection(env.MONGO_COLLECTION)
      .find(filter);
    let result = await cursor.toArray();
    console.log(result);
    res.render("history", { array: result });
  });

  app.get("/history", async (req, res) => {
    let id = ObjectId(req.query.id);
    let filter = { _id: id };
    let result = await client
      .db(env.MONGO_DB_NAME)
      .collection(env.MONGO_COLLECTION)
      .findOne(filter);
    let variables = { form: result };
    res.render("results", variables);
  });
  app.listen(portNumber);
})();
