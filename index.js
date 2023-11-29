const express = require('express')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ctrkbrk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const articlesCollection = client.db("theDailyPulseNews").collection("articles");
    const userCollection = client.db("theDailyPulseNews").collection("users");
    const adminCollection = client.db("theDailyPulseNews").collection("admin");
    // artciles api
    app.post('/articles', (req, res) => {
      const article = req.body;
      const result = articlesCollection.insertOne(article);
      res.send(result);
    })
    app.get('/articles', (req, res) => {
      const result = articlesCollection.find();
      res.send(result);
    })
    app.get('/articles/:id', (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = articlesCollection.findOne(query);
      res.send(result);
    })
    app.put('/articles/:id', (req, res) => {
      const id = req.params.id;
      const article = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      // todo: add validation, set feilds data individually
      const updateDoc = {
        $set: article,
        
      }
      const result = articlesCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    })
    app.delete('/articles/:id', (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = articlesCollection.deleteOne(query);
      res.send(result);
    })

        // user api
        app.post('/users', (req, res) => {
          const user = req.body;
          const result = userCollection.insertOne(user);
          res.send(result);
        })
        app.get('/users/:id', (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          // todo: add jwt validation
          const result = userCollection.findOne(query);
          res.send(result);
        })
        app.put('/users/:id', (req, res) => {
          const id = req.params.id;
          const user = req.body;
          const filter = { _id: new ObjectId(id) };
          const options = { upsert: true };
          // todo: add validation, set feilds data individually
          const updateDoc = {
            $set: user,
          }
          const result = userCollection.updateOne(filter, updateDoc, options);
          res.send(result);
        })

       
  } finally {
  }
}
run().catch(console.dir);

  app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`NewsPaper web server listening on port ${port}`)
  })
