require('dotenv').config()
const express = require('express')
const cors = require("cors")
const app = express()
const port =process.env.PORT || 4000


app.use(express.json())
app.use(cors())









// simple running 
app.get('/', (req, res) => {
  res.send('Parcel server is  running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
