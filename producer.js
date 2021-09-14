/*
 * node-rdkafka - Node.js wrapper for RdKafka C/C++ library
 *
 * Copyright (c) 2016 Blizzard Entertainment
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE.txt file for details.
 */

const opentelemetry = require('@opentelemetry/api');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const provider = new BasicTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'kafka-producer',
  }),
});

// Configure span processor to send spans to the exporter
const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

provider.register();
const tracer = opentelemetry.trace.getTracer('node-rdkafka-producer');
/*const tracer = opentelemetry.trace.getTracer('node-rdkafka-producer');
const trace = opentelemetry.trace;
const propagation = opentelemetry.propagation;*/


const express = require("express");
const PORT = process.env.PORT || "8081";
const app = express();

app.get("/", (req, res) => {
  const parentSpan = tracer.startSpan('GET /');
  let message = req.query.message;
  if (message == "") message = "Default message..."
  console.log("Message: "+ message);
  if (sendToKafka(message, parentSpan)) res.status(200).send("Messages Sent...");
  else res.status(500).send("Could not send message, there is a problem with Kafka.");
  parentSpan.end();
});

function sendToKafka(message, parent){
      const ctx = opentelemetry.trace.setSpan(opentelemetry.context.active(), parent);
      const span = tracer.startSpan(topicName + " send", { kind: opentelemetry.SpanKind.PRODUCER }, ctx);
      var carrier = Object.create(null);
      try{
        opentelemetry.propagation.inject(ctx, carrier);
      }
      catch(err){
        console.log("Deu erro: "+err.message);
      }
      
      console.log(carrier);
    
      console.log("CTX: "+JSON.stringify(span.spanContext()));
      console.log("carrier: "+JSON.stringify(carrier));
          var value = Buffer.from(message);
          var key = "key-" + Date.now();
          var partition = -1;
          var headers = [
            { "context_carrier": JSON.stringify(carrier) }
          ];
          console.log("Headers: "+ JSON.stringify(headers));
          //const ctx = opentelemetry.trace.setSpan(opentelemetry.context.active(), parent);
          span.setAttribute("messaging.system", "kafka");
          span.setAttribute("messaging.destination", topicName);
          span.setAttribute("messaging.destination_kind", "topic");
          span.setAttribute("messaging.url", "kafka://"+broker+"/"+topicName);

          try{
            producer.produce(topicName, partition, value, key, Date.now(), value, headers);
            producer.flush();
            span.end();
            return true;
          }
          catch(err){
            span.end();
            return false;
          }
}
var Kafka = require('node-rdkafka');

if (process.env.KAFKA_ENDPOINT != undefined) var broker = process.env.KAFKA_ENDPOINT;
else var broker = 'localhost:9093';
var producer = new Kafka.Producer({
    //'debug' : 'all',
    'metadata.broker.list': broker,
    'dr_cb': true  //delivery report callback
  });

  var topicName = 'dynatrace-banco-estado-lab';

  //logging debug messages, if debug is enabled
  producer.on('event.log', function(log) {
    console.log(log);
  });

  producer.on('disconnected', function(arg) {
    console.log('producer disconnected. ' + JSON.stringify(arg));
  });

  //logging all errors
  producer.on('event.error', function(err) {
    console.error('Error from producer');
    console.error(err);
  });

  //counter to stop this sample after maxMessages are sent
  var counter = 0;
  var maxMessages = 1;

  producer.on('delivery-report', function(err, report) {
    console.log('delivery-report: Entregue ' + JSON.stringify(report));
    counter++;
  });

  producer.on('ready', function(arg){
    console.log('producer ready.' + JSON.stringify(arg));
    app.listen(parseInt(PORT, 10), () => {
      console.log(`Listening for requests on http://localhost:${PORT}`);
    });
  });


producer.connect();

