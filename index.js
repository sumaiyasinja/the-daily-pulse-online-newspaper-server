const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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
    // database collections
    const articlesCollection = client.db("theDailyPulseNews").collection("articles");
    const userCollection = client.db("theDailyPulseNews").collection("users");
    const publisherCollection = client.db("theDailyPulseNews").collection("publishers");
    const paymentCollection = client.db("theDailyPulseNews").collection("payments");


    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    const verifyPremium = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isPremiumTaken = user?.premiumTaken === "true";
      if (!isPremiumTaken) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
 

    // artciles api
    app.get("/articles", verifyToken, verifyAdmin,async (req, res) => {
      try {
        const result = await articlesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });
    app.get("/article-deatials/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log("prob",id);
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.findOne(query);
      res.send(result);
    });
    app.post("/articles",verifyToken, async (req, res) => {
      try {
        const article = req.body;
        const result = await articlesCollection.insertOne(article);
        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error" });
      }
    });

    app.get("/premium-articles",verifyToken, verifyPremium, async (req, res) => {
      try {
        const result = await articlesCollection
          .find({ status: "approved", isPremium: "true" })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
    app.get("/articles-approved", async (req, res) => {
      try {
        // Filter articles with status "approved"
        const result = await articlesCollection
          .find({ status: "approved" })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
    app.get("/articles/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "author.email": email };
      try {
        const result = await articlesCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
    app.get('/articles-by-catagory', verifyToken, async (req, res) => {
      try {
        const publisher = req.query.publisher;
        const tags = req.query.tags;

        const query = {};

        if (publisher) {
          query.publisher = publisher;
        }

        if (tags) {
          query.tags = { $in: tags.split(',') }; 
        }

        const articles = await articlesCollection.find(query).toArray();

        res.send(articles);

      } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
    app.put("/articles/change-status-decline/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const article = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            status: "declined",
            feedback: article.feedback,
          },
        };
        const result = await articlesCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );
    app.put("/articles/change-status-approve/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const article = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            status: "approved",
          },
        };
        const result = await articlesCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );
    app.put("/articles/make-premium/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const article = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            isPremium: "true",
          },
        };
        const result = await articlesCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );
    app.put("/articles/update-views/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const article = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          views: article.views,
        },
      };
      const result = await articlesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.put("/articles/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const article = req.body;

        console.log(article);
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            title: article.title,
            description: article?.description,
            image: article?.image,
            publisher: article?.publisher,
            tags: article?.tags,
          },
        };

        const result = await articlesCollection.updateOne(
          filter,
          updateDoc,
          options
        );

        res.send(result);
      } catch (error) {
        console.error("Error updating article:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        res.send({ message: "user already exists", insertedId: null });
        return;
      }

      try {
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).send({ error: error.message });
      }
    });
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.put("/users/update-role/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.put(`/users/update/:email`,verifyToken, async (req, res) => {
      const userEmail = req.params.email;
      const user = req.body;
      console.log("Received request:", req.body);

      const filter = { email: userEmail };

      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: user.name,
          photoURL: user.photoURL,
        },
      };

      try {
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        console.log("Result:", result);
        res.send(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get( "/users/admin/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;

        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      }
    );

    app.patch("/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // publisher api
    app.post("/publishers", async (req, res) => {
      const user = req.body;
      const result = await publisherCollection.insertOne(user);
      res.send(result);
    });
    app.get("/publishers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await publisherCollection.findOne(query);
      res.send(result);
    });
    app.get("/publishers", async (req, res) => {
      const result = await publisherCollection.find().toArray();
      res.send(result);
    });
    app.delete("/publishers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await publisherCollection.deleteOne(query);
      res.send(result);
    });
    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    app.delete("/jwt", (req, res) => {
      res.clearCookie("token");
      res.send({ success: true });
    });

    // payment api
    app.post('/create-payment-intent', async (req, res) => {
      const price = req.body.price;
      console.log('Received price:', price);
      const amount = parseInt(price)* 100;
      console.log(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      // const query = {
      //   _id: {
      //     $in: payment.cartIds.map(id => new ObjectId(id))
      //   }
      // };

      // const deleteResult = await cartCollection.deleteMany(query);
      // const userPremium = await userCollection.find(query);

      res.send({ paymentResult });
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
