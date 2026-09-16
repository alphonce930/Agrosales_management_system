import * as XLSX from "xlsx";

const valueOrBlank = (value) => value ?? "";

const addRows = (
  rows,
  section,
  items,
  nameKey,
  valueKey,
  extraColumns = {},
) => {
  items.forEach((item) => {
    rows.push({
      Section: section,
      "Metric / Name": valueOrBlank(item[nameKey]),
      Value: valueOrBlank(item[valueKey]),
      Paid: valueOrBlank(extraColumns.paid ? item[extraColumns.paid] : ""),
      Outstanding: valueOrBlank(
        extraColumns.outstanding ? item[extraColumns.outstanding] : "",
      ),
    });
  });
};

export const hasAnalyticsReportData = (data) => {
  if (!data) return false;

  const hasTotals = Object.values(data.totals || {}).some(
    (value) => Number(value) > 0,
  );
  const hasRows = [
    "monthly",
    "products",
    "payments",
    "debt",
    "staffPerformance",
  ].some((key) => Array.isArray(data[key]) && data[key].length > 0);

  return hasTotals || hasRows;
};

export const downloadAnalyticsReport = (data) => {
  const rows = [];
  const totals = data.totals || {};
  const totalLabels = {
    total_sales: "Total sales",
    total_sales_value: "Total revenue",
    total_cash_sales: "Cash collected",
    total_lending: "Lending sales",
    outstanding_debt: "Outstanding debt",
    total_payments: "Total payments",
    total_staff: "Total staff",
    verified_staff: "Verified staff",
    pending_staff: "Pending staff",
    total_products: "Total products",
    total_customers: "Total customers",
  };

  Object.entries(totalLabels).forEach(([key, label]) => {
    if (totals[key] !== undefined && totals[key] !== null) {
      rows.push({
        Section: "Summary",
        "Metric / Name": label,
        Value: valueOrBlank(totals[key]),
        Paid: "",
        Outstanding: "",
      });
    }
  });

  addRows(rows, "Monthly revenue", data.monthly || [], "name", "value");
  addRows(rows, "Product demand", data.products || [], "name", "sales");
  addRows(rows, "Payment mix", data.payments || [], "name", "value");
  addRows(rows, "Lending", data.debt || [], "name", "total", {
    paid: "paid",
    outstanding: "outstanding",
  });
  addRows(
    rows,
    "Staff performance",
    data.staffPerformance || [],
    "name",
    "sales",
  );

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Section", "Metric / Name", "Value", "Paid", "Outstanding"],
  });
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rent Invoke Offset");
  XLSX.writeFile(
    workbook,
    `AgroSales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};
