import client from "prom-client";

export type HttpMetrics = {
  httpRequestDuration: client.Histogram<string>;
  httpInFlight: client.Gauge<string>;
};

export function createHttpMetrics(registry: client.Registry): HttpMetrics {
  const httpInFlight = new client.Gauge({
    name: "http_in_flight_requests",
    help: "In-flight HTTP requests",
    labelNames: ["method", "route"] as const,
    registers: [registry],
  });

  const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  return { httpRequestDuration, httpInFlight };
}
