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

To start playing around just run the command below inside the main repository folder:

```
docker-compose up -d
```

This will do:

1. Bring Kafka up
2. Bring mongo up
3. Bring producer up
4. Bring consumer up
5. Bring traffic generator up
6. Bring Jaeger up


## How is the flow?
curl -> Producer.js (Express) -> Producer.js (RDKafka) -> Kafka -> Consumer-flow.js (RDKafka) -> Consumer-flow.js (Mongoose) -> MongoDB

Traces will start to be sent to Jaeger and Consoler automatically. To test OpenTelemetry with OneAgent just do the following:
1. Bring OneAgent up
2. Restart the lab
```
docker-compose down
docker-compose up -d
```
3. Traces are now sent to Dynatrace instead of Jaeger

Problems to investigate:
1. With pure Otel everything works and I can se traces stitched together on Jager or the console output.
2. With OneAget setup and configurations on the cluster I can see traces only for the producer, for the consumer traces are broken and correlation is lost.
3. We need to set this up on customer cluster, activate the "debugNodeOpenTelemetrySensorNodeJS" flag to understand what is going on.
