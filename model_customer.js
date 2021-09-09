const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let customer = new Schema(
  {
    name: {
      type: String
    },
    age: {
      type: Number
    },
    location: {
      type: String
    }
  },
  { collection: "Customers" }
)
module.exports = mongoose.model("customers", customer);
