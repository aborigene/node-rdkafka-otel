// ----------------------------------------------------------------------------
// Copyright 2021 Dynatrace LLC
// All rights reserved.
// ----------------------------------------------------------------------------
// This document contains proprietary information belonging to Dynatrace.
// Passing on and copying of this document, use, and communication of its
// contents is not permitted without prior written authorization.
// ----------------------------------------------------------------------------


// ============================================================================

import * as http from "http";
import { SpanKind, trace, context, SpanStatusCode, ROOT_CONTEXT, propagation, TraceFlags } from "@opentelemetry/api";

// ============================================================================
const cPort = 8601;

const tracerRoot = trace.getTracer("root-tracer");
const tracerRemote = trace.getTracer("remote-tracer", "1.3.5");
const tracerLocal = trace.getTracer("local-tracer");
const tracerClient = trace.getTracer("client-tracer");

function createSpans() {
	// SpanKind Server is entry point on default
	const rootSpan = tracerRoot.startSpan("root-server", {
		kind: SpanKind.SERVER,
		attributes: {
			"r-key-1": "val-1",
			"r-key-2": 2
		}
	});

	const ctx = trace.setSpan(ROOT_CONTEXT, rootSpan);
	//ctx.
	context.with(ctx, () => {
		// wrapSpanContext should not result in a method node
		const wrappedSpan = trace.wrapSpanContext({ spanId: "0011223344556677", traceId: "00112233445566778899001122334466", traceFlags: TraceFlags.NONE });
		wrappedSpan.setAttribute("foo", "bar");

		// forced root span => root path
		const forcedRootLinked = tracerRoot.startSpan("forced-root", { kind: SpanKind.SERVER, root: true });
		forcedRootLinked.end();

		setTimeout(() => {
			// explicit child path => child of root-server
			const explicitChild = tracerRoot.startSpan("explicit-child", { kind: SpanKind.PRODUCER }, ctx);
			explicitChild.end();
		}, 1);

		// kind internal with rootSpan as parent
		const childLocal = tracerLocal.startActiveSpan("child-Local",
			{
				attributes: {
					"l-key-1": "val-1"
				}
			},
			(span) => {
				// OTel links to childLocal but OneAgent selects rootSpan
				const childClient = tracerClient.startSpan("child-Client", {
					kind: SpanKind.CLIENT
				});
				setTimeout(() => {
					childClient.setAttributes({
						"c-key-1": 1,
						"c-key-2": true
					});
					childClient.setStatus({ code: SpanStatusCode.ERROR, message: "so sad..." });
					childClient.end();
				}, 20);

				span.end();
				return span;
			});

		setTimeout(() => {
			// OneAgent doesn't pass context via setTimeout and childLocal is no valid parent
			context.with(trace.setSpan(ROOT_CONTEXT, childLocal), () => {
				// child of root-server as childLocal is a child of it and we use flat span hierarchy
				tracerLocal.startSpan("not-linked-child-local-parent").end();
			});
		}, 1);

		const boundFn = context.bind(context.active(), () => {
			// OneAgent doesn't pass context via setTimeout and SpanKind internal would be suppressed as root
			// but bind should ensure that context is propagated
			// kind internal with rootSpan as parent
			tracerLocal.startSpan("bound span").end();
		});
		setTimeout(() => {
			boundFn();
		}, 2);

		http.get("http://example.org");
	});

	// linked to root-server
	const childLocalDirect = tracerLocal.startSpan("child-local-direct-parent", {
		attributes: {
			"ld-key-1": 1
		}
	}, ctx);
	childLocalDirect.end();

	// interprocess context propagation, use setTimeout to ensure OneAgent doesn't do any linking
	// note: rootSpan is injected here as OneAgent doesn't create a MethodNode for http.get()
	// ServerSide config is needed to get a tag injected, e.g. Attribute key: r-key-1, value: val-1
	var carrier = Object.create(null);
	propagation.inject(ctx, carrier);
	setTimeout(() => {
		http.get({
			port: cPort,
			headers: carrier,
			path: "/propagated/from/root-server"
		});

		// create a spans linked to root-server via remote tags
		const extractedCtx = propagation.extract(ROOT_CONTEXT, carrier);
		// SpanKind consumer => allowed as entry point, child of rootSpan
		tracerRemote.startSpan("remote-direct", { kind: SpanKind.CONSUMER }, extractedCtx).end();
		context.with(extractedCtx, () => {
			// SpanKind consumer => allowed as entry point, child of rootSpan
			tracerRemote.startSpan("remote-with", { kind: SpanKind.CONSUMER }).end();
		});
	}, 1);

	// verify that isRecording checks can't harm agent
	if (rootSpan.isRecording()) {
		rootSpan.setAttribute("r-key-3", "val-3");
		rootSpan.setAttribute("r-key-1", "val-1-changed");
		rootSpan.updateName("root-server-changed");
		rootSpan.setStatus({ code: SpanStatusCode.OK });
		rootSpan.end();
	}
}

http.createServer((req, res) => {
	res.end();
}).listen(cPort);

createSpans();

setTimeout(() => process.exit(), 10000);
