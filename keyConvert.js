const fs = require("fs");

const keyBuffer = fs.readFileSync("./firebase-admin-service-key.json");  // Make sure path is correct
const base64 = Buffer.from(keyBuffer, "utf8").toString("base64");

console.log(base64);