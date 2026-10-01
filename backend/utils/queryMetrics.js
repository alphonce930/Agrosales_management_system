/**
 * Lightweight in-process query instrumentation.
 *
 * Goals:
 * - make slow queries visible without a heavyweight APM dependency;
 * - give tests and the performance report real numbers to assert on;
 * - never log bound parameter values (they can contain credentials).
 */
const DEFAULT_SLOW_QUERY_MS = 200;

const state = {
  totalQueries: 0,
  totalDurationMs: 0,
  slowQueries: 0,
  maxDurationMs: 0,
  lastSlowQuery: null,
};

const slowQueryThresholdMs = () =>
  Number(process.env.SLOW_QUERY_MS) || DEFAULT_SLOW_QUERY_MS;

/** Collapses whitespace and truncates so log lines stay readable. */
export const summarizeSql = (sql) =>
  String(sql || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

export const recordQuery = (sql, durationMs) => {
  const rounded = Math.round(durationMs * 100) / 100;
  state.totalQueries += 1;
  state.totalDurationMs += rounded;
  if (rounded > state.maxDurationMs) state.maxDurationMs = rounded;

  if (rounded >= slowQueryThresholdMs()) {
    state.slowQueries += 1;
    state.lastSlowQuery = { sql: summarizeSql(sql), durationMs: rounded };
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "slow_query",
        durationMs: rounded,
        thresholdMs: slowQueryThresholdMs(),
        sql: state.lastSlowQuery.sql,
      }),
    );
  }
};

export const getQueryMetrics = () => ({
  ...state,
  avgDurationMs: state.totalQueries
    ? Math.round((state.totalDurationMs / state.totalQueries) * 100) / 100
    : 0,
});

export const resetQueryMetrics = () => {
  state.totalQueries = 0;
  state.totalDurationMs = 0;
  state.slowQueries = 0;
  state.maxDurationMs = 0;
  state.lastSlowQuery = null;
};

/** Times an async operation and records it. Returns { result, durationMs }. */
export const timeQuery = async (sql, operation) => {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    recordQuery(sql, performance.now() - start);
  }
};
