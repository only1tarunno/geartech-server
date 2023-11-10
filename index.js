require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();
const cors = require("cors");

const brands = require("./brands.json");

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.USER}:${process.env.KEY}@cluster0.a27cvav.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// our middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "401 forbidden" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "UnAuthorized" });
    }
    // valid
    req.user = decoded;
    next();
  });
};

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

const dbConnect = async () => {
  try {
    client.connect();
    console.log(" Database Connected Successfully✅ ");
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();

const productCollection = client.db("ProductsDB").collection("Products");
const cartCollection = client.db("ProductsDB").collection("cartCollection");

// auth related api
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
    expiresIn: "1hr",
  });

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
    })
    .send({ sucess: true });
});

// show all products
app.get("/products", async (req, res) => {
  const cursor = productCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

// show products by name
app.get("/products/:brand", async (req, res) => {
  const category = req.params.brand;
  const query = { brand: category };
  const cursor = productCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

// show single product
app.get("/product/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productCollection.findOne(query);
  res.send(result);
});

// add a product
app.post("/products", async (req, res) => {
  const product = req.body;
  const result = await productCollection.insertOne(product);
  res.send(result);
});

// update a product
app.put("/product/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateProduct = req.body;
  const product = {
    $set: {
      photo: updateProduct.photo,
      name: updateProduct.name,
      brand: updateProduct.brand,
      productType: updateProduct.productType,
      price: updateProduct.price,
      rating: updateProduct.rating,
    },
  };
  const result = await productCollection.updateOne(filter, product, options);
  res.send(result);
});

// add to cart related apis
// show my cart page product
app.get("/cart", async (req, res) => {
  const cursor = cartCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});
// show my cart page product by email
app.get("/cart/:email", verifyToken, async (req, res) => {
  const user = req.params.email;
  if (req.user.email !== user) {
    return res.status(403).send({ message: "oi murgi geli??" });
  }
  const query = { email: user };
  const cursor = cartCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});
// add a product into cart
app.post("/cart", async (req, res) => {
  const product = req.body;
  const result = await cartCollection.insertOne(product);
  res.send(result);
});
// delete product from cart
app.delete("/cartDel/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await cartCollection.deleteOne(query);
  res.send(result);
});

//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log(
//       "Pinged your deployment. You successfully connected to MongoDB!"
//     );
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/brands", (req, res) => {
  res.send(brands);
});

app.listen(port);
