require('dotenv').config()
const express = require('express')
const cors = require("cors")
const app = express()
const port =process.env.PORT || 4000


app.use(express.json())
app.use(cors())




const { MongoClient, ServerApiVersion } = require('mongodb');
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
