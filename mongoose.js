const mongoose = require("mongoose");
const express = require("express");
const app = express();
const employees = require("./model_employee");
const customers = require("./model_customer");
const router = express.Router();
const port = 4000;

var uri = "mongodb://localhost:27018/kennel";

mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });

const connection = mongoose.connection;

connection.once("open", function() {
  console.log("MongoDB database connection established successfully");
});

router.route("/insertemployee").post(function(req, res) {
/*var data = [
  {
    name: "John",
    age: 21,
    location: "New York"
  },
  {
    name: "Smith",
    age: 27,
    location: "Texas"
  },
  {
    name: "Lisa",
    age: 23,
    location: "Chicago"
  }
];*/
var data = req.body;
	console.log(data)
employees.insertMany(data, function(err, result) {
  if (err) {
    res.send(err);
    res.status(500).send(ex.toString());

  } else {
    res.status(200).send(result);
  }
});
});

router.route("/fetchdata").get(function(req, res) {
  employees.find({}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

app.use("/", router);
app.use(express.json())

app.listen(port, function() {
  console.log("Server is running on Port: " + port);
});
