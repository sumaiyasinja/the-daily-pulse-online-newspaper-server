const express = require('express')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",

    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const tokenVerify = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('Token verifying', token);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized - Token missing" });
  }

  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      console.error("Token verification error:", err);
      return res.status(401).json({ message: "Unauthorized - Token invalid" });
    }
    req.user = decoded;
    console.log("Token verification successful");
    next();
  });
};
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
    const publisherCollection = client.db("theDailyPulseNews").collection("publishers");
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

        // publisher api
        app.post('/publisher', (req, res) => {
          const user = req.body;
          const result = publisherCollection.insertOne(user);
          res.send(result);
        })
        app.get('/publisher/:id', (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = publisherCollection.findOne(query);
          res.send(result);
        })
        app.get('/publisher', (req, res) => {
          const result = publisherCollection.find();
          res.send(result);
        })
        app.delete('/publisher/:id', (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = publisherCollection.deleteOne(query);
          res.send(result);
        })
        // jwt api
        app.post("/jwt", async (req, res) => {
          const user = req.body;
          console.log("user from body", user);
    
          const token = jwt.sign(user, process.env.SECRET, { expiresIn: "1h" });
    
          res
          .cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    
        })
          res.send({ success: true });
        });
    
       
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
