type LinkDependencyStatus = "disabled" | "error" | "ok" | "pending";

export interface LinkHealthStatuses {
	clickhouse: LinkDependencyStatus;
	postgres: LinkDependencyStatus;
	redis: LinkDependencyStatus;
	redpanda: LinkDependencyStatus;
}

export interface LinkReadiness {
	httpStatus: 200 | 503;
	status: "degraded" | "ok" | "unavailable";
}

export type ProducerHealthState =
	| "connected"
	| "connecting"
	| "cooldown"
	| "disabled"
	| "idle";

export function mapRedpandaServiceStatus(input: {
	producerState: ProducerHealthState;
	probeErrored: boolean;
	kafkaConnectFailed: boolean;
}): LinkDependencyStatus {
	if (input.producerState === "connected") {
		return "ok";
	}
	if (input.producerState === "disabled") {
		return "disabled";
	}
	if (
		input.probeErrored ||
		input.producerState === "cooldown" ||
		(input.producerState === "idle" && input.kafkaConnectFailed)
	) {
		return "error";
	}
	return "pending";
}

export function calculateLinkReadiness(
	services: LinkHealthStatuses
): LinkReadiness {
	const admissionReady = services.postgres === "ok" && services.redis === "ok";
	const deliverySinkReady =
		services.clickhouse === "ok" || services.redpanda === "ok";
	if (!(admissionReady && deliverySinkReady)) {
		return { httpStatus: 503, status: "unavailable" };
	}

	const degraded =
		services.clickhouse === "error" || services.redpanda === "error";
	return {
		httpStatus: 200,
		status: degraded ? "degraded" : "ok",
	};
}
