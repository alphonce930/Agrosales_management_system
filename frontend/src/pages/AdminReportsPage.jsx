import { BarChart3, Download, TrendingUp, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  downloadAnalyticsReport,
  hasAnalyticsReportData,
} from "../utils/analyticsReport";

export default function AdminReportsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api
      .get("/analytics/dashboard")
      .then(({ data: result }) => setData(result))
      .catch(() => setError("Unable to load dashboard data."));
  }, []);

  const generateReport = () => {
    if (generating) return;
    setError("");
    setMessage("");

    if (!hasAnalyticsReportData(data)) {
      setError("No data available to generate the report.");
      return;
    }

    setGenerating(true);
    try {
      downloadAnalyticsReport(data);
      setMessage("Report downloaded successfully.");
    } catch {
      setError("Unable to generate the report.");
    } finally {
      setGenerating(false);
    }
  };

  const totals = data?.totals || {};
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">
            Analytics
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            Business performance
          </h2>
        </div>
        <button
          type="button"
          onClick={generateReport}
          disabled={generating}
          className="btn-primary gap-2 disabled:cursor-wait disabled:opacity-60"
        >
          <Download size={17} />
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp size={16} /> Total revenue
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            TZS {Number(totals.total_sales_value || 0).toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Wallet size={16} /> Cash collected
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600">
            TZS {Number(totals.total_cash_sales || 0).toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 size={16} /> Outstanding debt
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">
            TZS {Number(totals.outstanding_debt || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Monthly revenue
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthly || []}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f3d2e" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#0f3d2e" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0f3d2e"
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Top performers
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.staffPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#d4a72c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
