const escapeHtml = (value) =>
  String(value ?? "-").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

export const companyInfo = {
  name: "Golden Agrochemicals",
  location: "Mwenge, Dar es Salaam",
};

export const formatPaymentMethod = (value) =>
  ({
    cash: "Cash",
    mobile_money: "Mobile Money",
    bank: "Bank",
  })[value] ||
  value ||
  "-";

export const openReceiptWindow = (receipt) => {
  const printWindow = window.open("", "_blank", "width=520,height=760");
  if (!printWindow) {
    alert("Please allow pop-ups to print the individual receipt.");
    return;
  }

  const amount = Number(receipt.amountValue || 0).toLocaleString();
  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payment Receipt ${escapeHtml(receipt.receipt)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; color: #172018; }
          body { font-family: Georgia, 'Times New Roman', serif; }
          .receipt { width: 74mm; margin: 0 auto; padding: 9mm 5mm 7mm; }
          .header { text-align: center; border-bottom: 1px solid #172018; padding-bottom: 5mm; }
          .company { margin: 0; font: 800 18px/1.15 Arial, sans-serif; letter-spacing: .02em; }
          .location { margin-top: 2mm; font: 12px/1.3 Arial, sans-serif; }
          .title { margin: 5mm 0 0; font: 800 15px/1.2 Arial, sans-serif; letter-spacing: .08em; }
          .details { margin: 5mm 0; border-bottom: 1px solid #172018; padding-bottom: 5mm; }
          .row { display: flex; justify-content: space-between; gap: 5mm; margin: 3mm 0; font: 12px/1.3 Arial, sans-serif; }
          .label { flex: 0 0 auto; }
          .value { font-weight: 700; text-align: right; overflow-wrap: anywhere; }
          .amount { font-size: 14px; }
          .thanks { text-align: center; font: 700 12px/1.3 Arial, sans-serif; }
          @media screen { body { padding: 16px; } .receipt { border: 1px solid #c8d0c8; } }
        </style>
      </head>
      <body>
        <main class="receipt" aria-label="Payment receipt">
          <header class="header">
            <h1 class="company">${escapeHtml(companyInfo.name)}</h1>
            <div class="location">${escapeHtml(companyInfo.location)}</div>
            <div class="title">PAYMENT RECEIPT</div>
          </header>
          <section class="details">
            <div class="row"><span class="label">Receipt No:</span><span class="value">${escapeHtml(receipt.receipt)}</span></div>
            <div class="row"><span class="label">Customer:</span><span class="value">${escapeHtml(receipt.customer)}</span></div>
            <div class="row"><span class="label">Sale:</span><span class="value">${escapeHtml(receipt.invoice)}</span></div>
            <div class="row"><span class="label">Date:</span><span class="value">${escapeHtml(receipt.issued)}</span></div>
            <div class="row"><span class="label">Payment Method:</span><span class="value">${escapeHtml(receipt.paymentMethod)}</span></div>
            <div class="row amount"><span class="label">Amount Paid:</span><span class="value">TZS ${escapeHtml(amount)}</span></div>
          </section>
          <footer class="thanks">Thank you for your payment.</footer>
        </main>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
};
