## Prerequisites

- git
- docker
- docker-compose
- node (might need some more dependencies)
- npm install @opentelemetry/sdk-node @opentelemetry/api
- jaeger (support for jaegertracing/all-in-one:1.25 and older because of Go version)
- Dynatrace
-- Setting "Enable Go static application monitoring on every host" must be enabled
-- Rule "Do not monitor processes if Go binary linkage equals 'static' (Rule id: #47)" must be disabled

## How to use this

Make sure that Docker is running.

1. Bring Kafka up:
```
docker-compose up -d
```
2. Bring mongo up:
```
docker container run -p 27018:27017 --name my_mongo -d mongo
```
3. Bring producer up:
```
node producer.js
```
4. Bring consumer up:
```
node consumer-flow.js
```
5. Send an HTTP request to node:
```
curl "127.0.0.1:8081?message=Sample%20Message%201234"
```

## How is the flow?
curl -> Producer.js (Express) -> Producer.js (RDKafka) -> Kafka -> Consumer-flow.js (RDKafka) -> Consumer-flow.js (Mongoose) -> MongoDB

Please set up a Jaeger service locally and spans will be sent automatically to that. Spans are being logged to console. When you activate OneAgent console output will stop and traces will be sent to Dynatrace.

Problems to investigate:
1. With pure Otel everything works and I can se traces stitched together on Jager or the console output.
2. With OA setup and configurations on the cluster I can see traces only for the producer, for the consumer traces are broken and correlation is lost.
3. We need to set this up on customer cluster, activate the "debugNodeOpenTelemetrySensorNodeJS" flag to understand what is going on.
