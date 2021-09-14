/*
 * node-rdkafka - Node.js wrapper for RdKafka C/C++ library
 *
 * Copyright (c) 2016 Blizzard Entertainment
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE.txt file for details.
 */

const mongoose = require("mongoose");
const employees = require("./model_employee");
//const customers = require("./model_customer");

/*const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const provider = new BasicTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();*/


const opentelemetry = require('@opentelemetry/api');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const provider = new BasicTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'kafka-consumer',
  }),
});

// Configure span processor to send spans to the exporter
const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

provider.register();

const tracer = opentelemetry.trace.getTracer('node-rdkafka-consumer');
const propagation = opentelemetry.propagation;

if (process.env.MONGO_URL != undefined) var uri = process.env.MONGO_URL;
else var uri = "mongodb://localhost:27018/kennel";

for (var i = 0; i< 5; i++){
  try{
    setTimeout(() => {
      mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });
      const connection = mongoose.connection;

      connection.once("open", function() {
      console.log("MongoDB database connection established successfully");
});
    }, 3000);
  }
  catch (error){
    if (i == 4){
      console.log("Mongo is still not up, waiting....");
    }
    else{
      console.log("Timed out waiting for Mongo, exiting...");
      process.exit(1);
    }
  }
}




var Kafka = require('node-rdkafka');
const { json } = require("express");

if (process.env.KAFKA_ENDPOINT != undefined) var broker = process.env.KAFKA_ENDPOINT;
else var broker = 'localhost:9093';

var consumer = new Kafka.KafkaConsumer({
  //'debug': 'all',
  'metadata.broker.list': broker,
  'group.id': 'node-rdkafka-consumer-flow-example',
  'enable.auto.commit': false
});

var topicName = 'dynatrace-banco-estado-lab';

//logging debug messages, if debug is enabled
consumer.on('event.log', function(log) {
  console.log(log);
});

//logging all errors
consumer.on('event.error', function(err) {
  console.error('Error from consumer');
  console.error(err);
});

//counter to commit offsets every numMessages are received
var counter = 0;
var numMessages = 5;

consumer.on('ready', function(arg) {
  console.log('consumer ready.' + JSON.stringify(arg));

  consumer.subscribe([topicName]);
  //start consuming messages
  consumer.consume();
});


consumer.on('data', function(m) {
  //const ctx = opentelemetry.trace.setSpan(opentelemetry.context.active());
  var carrier = Object.create(null);

  const context_carrier = m.headers[0]["context_carrier"];
  const context_carrier_buffer = Buffer.from(context_carrier);
  carrier = JSON.parse(context_carrier_buffer.toString());
  console.log(context_carrier_buffer.toString());

  //var extractedContext = opentelemetry.propagation.extract(opentelemetry.context.active(), carrier);
  var extractedContext = opentelemetry.propagation.extract(opentelemetry.ROOT_CONTEXT, carrier);
  const span = tracer.startSpan(topicName + " receive", { kind: opentelemetry.SpanKind.CONSUMER }, extractedContext);
  console.log(JSON.stringify(extractedContext));
  console.log(JSON.stringify(span));

  span.setAttribute("messaging.system", "kafka");
  span.setAttribute("messaging.destination", topicName);
  span.setAttribute("messaging.destination_kind", "topic");
  span.setAttribute("messaging.url", "kafka://"+broker+"/"+topicName);
  
  console.log("Context Carrier: "+context_carrier);
  console.log(JSON.stringify(m.headers));

  carrier = JSON.parse(context_carrier);
  console.log("Carrier: "+carrier);
  processMessage(m, span);
  span.end();
});

function processMessage(m, parent){
  const ctx = opentelemetry.trace.setSpan(opentelemetry.context.active(), parent);
  const span = tracer.startSpan(topicName + " process",  { kind: opentelemetry.SpanKind.CONSUMER }, ctx);
  const mongoStatus = committToMongo();
  console.log(mongoStatus);
  //if (mongoStatus == true) {
    consumer.commit(m);
    // Output the actual message contents
    console.log(JSON.stringify(m));
    console.log("message: " + m.value.toString());
  //}
  //else console.log("Mongo failed. Not commiting message.");
  
  span.end();
}

function committToMongo(){
    var data = [
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
      ];
      employees.insertMany(data, function(err, result) {
      if (err) {
      //res.send(err);
      //res.status(500).send(ex.toString());
      console.log("Insert to mongo failed...");
      return false;
      
      } else {
      console.log("Insert to mongo succeed...");
      return true;
      }
      });
      
      
}

consumer.on('disconnected', function(arg) {
  console.log('consumer disconnected. ' + JSON.stringify(arg));
});

//starting the consumer
consumer.connect();

//stopping this example after 30s
//setTimeout(function() {
//  consumer.disconnect();
//}, 30000);
