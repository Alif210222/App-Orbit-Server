require('dotenv').config()
const express = require('express')
const cors = require("cors")
const app = express()
const port =process.env.PORT || 4000


app.use(express.json())
app.use(cors())


const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY); 



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkye2zi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("app_orbit");
    const productCollection = db.collection("products")
    const userCollection = db.collection("users")
    const reviewCollection = db.collection("reviews")




//---------------------------------------------------------------------payment related api 
app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // cents
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.json({ clientSecret: paymentIntent.client_secret });
});





// --------------------------------------------------------------------    All user api 

// GOOGLE BASED USER LOGIN DATA SAVE IN DATABASE 
app.post("/googleUsers" , async(req,res) =>{
 
    const userInfo = req.body;
    const result = await userCollection.insertOne(userInfo)
    res.send(result)
 })




// user data save in database 
 app.post("/users" , async(req,res) =>{
 
    const userInfo = req.body;
    const result = await userCollection.insertOne(userInfo)
    res.send(result)
 })

 // get userdata when i add some product ==> user verifued or not 

 app.get('/userData/:email', async (req, res) => {
  const email = req.params.email;

//   if (!userEmail) {
//     return res.status(400).send({ message: 'Email is required' });
//   }

  try {
    const user = await userCollection.findOne({ email: email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).send({ message: "Failed to get user" });
  }
});

 
 //all user get api 
 app.get("/users",async(req,res) =>{
    const result = await userCollection.find().toArray()
    res.send(result)
 })


 // after membership subscription ==>>   user data get api for knowing membership status 

 app.get("/membershipUser/:email", async(req,res) =>{
    const email = req.params.email;
    const result = await userCollection.findOne({email})
    res.send(result)
 })


 // user role update api create 
 app.patch("/users/:id/role" , async(req,res) =>{
    const id = req.params.id;
    const {role} = req.body;

    if(!["admin", "user","moderator"].includes(role)){
          return res.status(400).send({message:"invalid role"})
         }

         const result = await userCollection.updateOne(
            {_id:new ObjectId(id)},
            {$set:{role}}
         )
         res.send(result)
 })


 // after subscription user membership status update 

 app.patch("/user/membership-status/:email", async (req, res) => {
  const email = req.params.email;
  const updateDoc = {
    $set: {
      membership_status: "verified",
    },
  };
  const result = await userCollection.updateOne({ email }, updateDoc);
  res.send(result);
});


 // --------------------------------------------------------------------    featured data get api 


 app.get('/featured-products', async (req, res) => {
  try {
    const featured = await productCollection
      .find({ featured_status: 'featured' })
      .sort({ createdAt: -1 }) // latest first
      .toArray();

    res.send(featured);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).send({ message: 'Failed to load featured products' });
  }
});

// featured section  =====>>>> voted cound add and update 

app.patch('/upvote/:id', async (req, res) => {
  const productId = req.params.id;
  const { userEmail } = req.body;

  try {
    const product = await productCollection.findOne({ _id: new ObjectId(productId) });

    // Check if user already voted
    if (product?.voted_users?.includes(userEmail)) {
      return res.send({ message: "Already voted", modifiedCount: 0 });
    }

    // Prepare vote increment logic
    const updateDoc = {
      $inc: { vote_count: 1 }, // increment vote_count by 1
      $addToSet: { voted_users: userEmail }, // add userEmail only if not exists
    };

    const result = await productCollection.updateOne(
      { _id: new ObjectId(productId) },
      updateDoc
    );

    res.send(result);
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).send({ message: "Vote failed" });
  }
});



// DETAILS SECTION VOTE COUNT patch req.

app.patch("/report/:id" , async(req,res) =>{
    const id = req.params.id;
    const {report_status} =req.body;
    const {userEmail} = req.body

      if (!["reported"].includes(report_status)) {
             return res.status(400).send({ message: "Invalid status" });
          }


           try {
            const product = await productCollection.findOne({ _id: new ObjectId(id) });

    // Check if user already voted
    if (product?.reported_users?.includes(userEmail)) {
      return res.send({ message: "Already reported", modifiedCount: 0 });
    }

    // Prepare vote increment logic
    const updateDoc = {
      $set: { report_status: "reported" }, // increment vote_count by 1
      $addToSet: { reported_users: userEmail }, // add userEmail only if not exists
    };

    const result = await productCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    res.send(result);
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).send({ message: "Vote failed" });
  }


})

//--------------------------------------------------------------------- reported peoduct get api 

app.get('/reported-products', async (req, res) => {
  try {
    const reported = await productCollection
      .find({ report_status: 'reported' })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(reported);
  } catch (error) {
    console.error('Error fetching reported products:', error);
    res.status(500).send({ message: 'Failed to load reported products' });
  }
});


// reported product dellete api 




//-------------------------------------------------------------------  product review api 

app.post("/reviews",async(req,res) =>{
    const review = req.body;
     try {
    const result = await reviewCollection.insertOne(review);
    res.send(result); // contains insertedId
  } catch (error) {
    console.error("Error saving review:", error);
    res.status(500).send({ message: "Failed to post review" });
  }
})

// review get api 

app.get("/reviews/:productId" , async(req,res) =>{
    const {productId} = req.params;
    try{
        const reviews = await reviewCollection.find({productId}).sort({createdAt:-1}).toArray()
        res.send(reviews)
    }catch(error){
          console.error('Failed to get reviews', error);
          res.status(500).send({ message: 'Server error' });
    }
})

//---------------------------------------------------------------------trending product get api 

app.get('/trending-products', async (req, res) => {
  try {
    const products = await productCollection
      .find({ product_status: 'accepted' })
      .sort({ vote_count: -1 })
      .toArray();
    res.send(products);
  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


//---------------------------------------------------------------------All product related api 


// a normal user when add data then need some product data {how much product he add} ==>> from this api 

app.get("/productsData", async (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).send({ message: 'Email is required' });
  }

  try {
    const query = { ownerEmail: userEmail };
    const options = {
      sort: { createdAt: -1 }
    };

    const result = await productCollection.find(query, options).toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Failed to get products" });
  }
});


// all ACCEPETED product get & search functionallity added


app.get('/alProducts', async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // Search by tag (case-insensitive)
    const query = {
      product_status: 'accepted',
      tags: { $regex: search, $options: 'i' }
    };

    // Get total count for pagination
    const total = await productCollection.countDocuments(query);

    // Fetch paginated results
    const products = await productCollection
      .find(query)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send({ total, products });
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// ALL PRODUCT GET API 

app.get("/reviewProducts" , async(req,res) =>{
    const result = await productCollection.find().toArray()
    res.send(result)
})


//PRODUCT GET API  by email

app.get("/products", async (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).send({ message: 'Email is required' });
  }

  try {
    const query = {
      ownerEmail: { $regex: new RegExp(`^${userEmail}$`, 'i') }, // case-insensitive
    };

    const result = await productCollection
      .find(query)
      .sort({ createdAt: -1 }) // latest products first
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Failed to get products" });
  }
});


// get single product  by id

app.get("/productDetails/:id",async(req,res) =>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await productCollection.findOne(query)
    res.send(result)
})


// PRODUCT POST API 
    app.post("/products" , async(req,res) =>{
        try {
        const product = req.body;
        const result = await productCollection.insertOne(product)
        res.send(result)

         }
         catch(error){
            console.log("Error insert Product :" , error)
            res.status(500).send({message:"Failed to Create product data"})
         }
    })



    // seller  product update api 
  app.put("/updateProduct/:id", async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  try {
    // ❗ Remove _id if it exists in the update data
    if ('_id' in updateData) {
      delete updateData._id;
    }

    const updateDoc = {
      $set: updateData,
    };

    const filter = { _id: new ObjectId(id) };
    const result = await productCollection.updateOne(filter, updateDoc);

    res.send(result);
  } catch (error) {
    console.log("Error update Product:", error);
    res.status(500).send({ message: "Failed to update product data" });
  }
});



    // product delete api 

    app.delete("/deleteProduct/:id", async(req,res) =>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const result = await productCollection.deleteOne(filter)
        res.send(result)

    })

     // modaretor update product status : 

     app.patch("/update-status/:id",async(req,res)=>{
        const id= req.params.id;
        const {product_status} = req.body;

          if (!["accepted", "rejected"].includes(product_status)) {
             return res.status(400).send({ message: "Invalid status" });
          }

        try{
          const filter = {_id: new ObjectId(id)}
          const updateDoc = {
            $set:{
                product_status,
            }
          }
          const result = await productCollection.updateOne(filter,updateDoc)
          res.send(result)
        }
        catch (error) {
               console.error("Error updating product status:", error);
               res.status(500).send({ message: "Failed to update product status." });
           }
     } )


     // modaretor product featured api 

      app.patch("/make-featured/:id",async(req,res)=>{
        const id= req.params.id;
        const {featured_status} = req.body;

          if (!["featured"].includes(featured_status)) {
             return res.status(400).send({ message: "Invalid status" });
          }

        try{
          const filter = {_id: new ObjectId(id)}
          const updateDoc = {
            $set:{
                featured_status,
            }
          }
          const result = await productCollection.updateOne(filter,updateDoc)
          res.send(result)
        }
        catch (error) {
               console.error("Error updating product status:", error);
               res.status(500).send({ message: "Failed to update product status." });
           }
     } )





     // admin pie chart data get api 

     app.get('/dashboard-stats', async (req, res) => {
  try {
    const acceptedCount = await productCollection.countDocuments({ product_status: "accepted" });
    const pendingCount = await productCollection.countDocuments({ product_status: "pending" });
    const reviewCount = await reviewCollection.estimatedDocumentCount();
    const userCount = await userCollection.estimatedDocumentCount();

    res.send({
      accepted: acceptedCount,
      pending: pendingCount,
      reviews: reviewCount,
      users: userCount
    });
  } catch (error) {
    console.error('Dashboard stats error', error);
    res.status(500).send({ message: "Failed to load stats" });
  }
});






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






// simple running 
app.get('/', (req, res) => {
  res.send('app Orbit server is  running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
