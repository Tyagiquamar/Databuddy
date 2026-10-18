import { describe, expect, test } from "bun:test";
import { calculateLinkReadiness, mapRedpandaServiceStatus } from "./health";

const healthy = {
	clickhouse: "ok",
	postgres: "ok",
	redis: "ok",
	redpanda: "ok",
} as const;

describe("Redpanda health mapping", () => {
	test("reports degraded when Kafka failed but probe state is idle", () => {
		expect(
			mapRedpandaServiceStatus({
				producerState: "idle",
				probeErrored: false,
				kafkaConnectFailed: true,
			})
		).toBe("error");
	});

	test("keeps pending for idle producer without a recorded connect failure", () => {
		expect(
			mapRedpandaServiceStatus({
				producerState: "idle",
				probeErrored: false,
				kafkaConnectFailed: false,
			})
		).toBe("pending");
	});
});

describe("Links readiness", () => {
	test("stays ready when Redpanda is down but ClickHouse is available", () => {
		expect(calculateLinkReadiness({ ...healthy, redpanda: "error" })).toEqual({
			httpStatus: 200,
			status: "degraded",
		});
	});

	test("stays ready when ClickHouse is down but Redpanda is available", () => {
		expect(calculateLinkReadiness({ ...healthy, clickhouse: "error" })).toEqual(
			{ httpStatus: 200, status: "degraded" }
		);
	});

	test("requires at least one available delivery sink", () => {
		expect(
			calculateLinkReadiness({
				...healthy,
				clickhouse: "error",
				redpanda: "error",
			})
		).toEqual({ httpStatus: 503, status: "unavailable" });
	});

	test("accepts ClickHouse as the sole configured sink", () => {
		expect(
			calculateLinkReadiness({ ...healthy, redpanda: "disabled" })
		).toEqual({ httpStatus: 200, status: "ok" });
	});
});
