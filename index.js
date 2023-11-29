const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

// use verify admin after verifyToken
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ctrkbrk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const articlesCollection = client.db("theDailyPulseNews").collection("articles");
    const userCollection = client.db("theDailyPulseNews").collection("users");
    const publisherCollection = client.db("theDailyPulseNews").collection("publishers");

    // artciles api
    app.post("/articles", async(req, res) => {
      const article = req.body;
      const result = await articlesCollection.insertOne(article);
      res.send(result);
    });
    app.get("/articles", async(req, res) => {
      const result = await articlesCollection.find();
      res.send(result);
    });
    app.get("/articles/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result =await articlesCollection.findOne(query);
      res.send(result);
    });
    app.put("/articles/:id", async(req, res) => {
      const id = req.params.id;
      const article = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      // todo: add validation, set feilds data individually
      const updateDoc = {
        $set: article,
      };
      const result =await articlesCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.delete("/articles/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result =await articlesCollection.deleteOne(query);
      res.send(result);
    });

    // user api
    app.post("/users", async(req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // todo: add jwt validation
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.put("/users/:id", async(req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      // todo: add validation, set feilds data individually
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // publisher api
    app.post("/publisher", async(req, res) => {
      const user = req.body;
      const result =await publisherCollection.insertOne(user);
      res.send(result);
    });
    app.get("/publisher/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result =await publisherCollection.findOne(query);
      res.send(result);
    });
    app.get("/publisher", async(req, res) => {
      const result = await publisherCollection.find();
      res.send(result);
    });
    app.delete("/publisher/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await publisherCollection.deleteOne(query);
      res.send(result);
    });
    // jwt api
 // jwt related api
      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.SECRET, { expiresIn: '1h' });
        res.send({ token });
      })

    app.delete("/jwt", (req, res) => {
      res.clearCookie("token");
      res.send({ success: true });

    })
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`NewsPaper web server listening on port ${port}`);
});
