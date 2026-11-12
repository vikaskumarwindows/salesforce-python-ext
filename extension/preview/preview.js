document.addEventListener("DOMContentLoaded", () => {
  const viewerTitle = document.getElementById("viewerTitle");
  const viewerSubtitle = document.getElementById("viewerSubtitle");
  const viewerRowCount = document.getElementById("viewerRowCount");
  const viewerTableContainer = document.getElementById("viewerTableContainer");
  const viewerSearchInput = document.getElementById("viewerSearchInput");
  const viewerCopyBtn = document.getElementById("viewerCopyBtn");
  const viewerDownloadBtn = document.getElementById("viewerDownloadBtn");

  let fullDataset = [];
  let cleanedCsv = "";
  let cleanedTsv = "";

  // Load dataset stored in chrome.storage.local
  chrome.storage.local.get(["previewData", "cleanedCsv", "cleanedTsv", "datasetName"], (res) => {
    if (res.previewData && res.previewData.length > 0) {
      fullDataset = res.previewData;
      cleanedCsv = res.cleanedCsv || "";
      cleanedTsv = res.cleanedTsv || "";
      const name = res.datasetName || "Cleaned Data";

      viewerTitle.textContent = name;
      viewerSubtitle.textContent = `Cleaned & verified by Pyodide WebAssembly • ${fullDataset.length} rows loaded`;
      renderTable(fullDataset);
    } else {
      viewerTableContainer.innerHTML = '<p style="padding: 24px; color: #94a3b8; text-align: center;">No preview data found. Please clean a dataset from the extension popup first.</p>';
      viewerRowCount.textContent = "0 rows";
    }
  });

  function renderTable(rows) {
    if (!rows || rows.length === 0) {
      viewerTableContainer.innerHTML = '<p style="padding: 20px; color: #94a3b8; text-align: center;">No matching rows found.</p>';
      viewerRowCount.textContent = "0 rows";
      return;
    }

    const cols = Object.keys(rows[0]);
    viewerRowCount.textContent = `Showing ${rows.length} of ${fullDataset.length} rows (${cols.length} columns)`;

    let html = '<table class="viewer-table"><thead><tr>';
    html += '<th class="row-index">#</th>';
    cols.forEach((col) => (html += `<th>${col}</th>`));
    html += "</tr></thead><tbody>";

    rows.forEach((row, i) => {
      html += `<tr><td class="row-index">${i + 1}</td>`;
      cols.forEach((col) => {
        const val = row[col] !== null && row[col] !== undefined ? row[col] : "";
        html += `<td>${val}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    viewerTableContainer.innerHTML = html;
  }

  // Real-time search filter
  viewerSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderTable(fullDataset);
      return;
    }

    const filtered = fullDataset.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
    renderTable(filtered);
  });

  // Copy All TSV
  viewerCopyBtn.addEventListener("click", () => {
    if (!cleanedTsv) return;
    navigator.clipboard.writeText(cleanedTsv).then(() => {
      const orig = viewerCopyBtn.textContent;
      viewerCopyBtn.textContent = "✓ Copied to Clipboard!";
      setTimeout(() => (viewerCopyBtn.textContent = orig), 2500);
    });
  });

  // Download CSV
  viewerDownloadBtn.addEventListener("click", () => {
    if (!cleanedCsv) return;
    const blob = new Blob([cleanedCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
