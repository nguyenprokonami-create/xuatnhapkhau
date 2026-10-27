/* IMEX Manager - Logic frontend dùng chung & Chuyển vùng liên kết */

(() => {
  "use strict";

  const page = (
    window.location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();

  const $ = (selector, root = document) => root.querySelector(selector); const $\$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function getValue(form, id) {
    const field = form.elements.namedItem(id);
    return field ? String(field.value || "").trim() : "";
  }

  function formatDate(date) {
    if (!date) return "";
    const parts = date.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
  }

  function toISODate(date) {
    const match = String(date || "")
      .trim()
      .match(/^(\d{2})\/(\d{2})\/(\d{4})\$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  }

  function formatMoney(value) {
    if (!value) return "0 ₫";
    const number = Number(value);
    return Number.isFinite(number)
      ? `${number.toLocaleString("vi-VN")} ₫`
      : value;
  }

  function parseMoney(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  const configs = {
    "orders.html": {
      key: "imex_manager_orders_v1",
      formSelector: "#order-form form",
      tableSelector: ".card .table-container table tbody",
      dataColumns: 7,
      statusIndex: 6,
      filters: [
        { selectIndex: 0, columnIndex: 1 },
        { selectIndex: 1, columnIndex: 6 }
      ],
      readForm(form) {
        return {
          cells: [
            getValue(form, "order-code"),
            getValue(form, "order-type"),
            getValue(form, "partner"),
            getValue(form, "country"),
            formatDate(getValue(form, "created-date")),
            formatMoney(getValue(form, "order-value")),
            getValue(form, "order-status")
          ]
        };
      },
      fillForm(form, cells) {
        form.elements.namedItem("order-code").value = cells[0] || "";
        form.elements.namedItem("order-type").value = cells[1] || "";
        form.elements.namedItem("partner").value = cells[2] || "";
        form.elements.namedItem("country").value = cells[3] || "";
        form.elements.namedItem("created-date").value = toISODate(cells[4]);
        form.elements.namedItem("order-value").value = parseMoney(cells[5]);
        form.elements.namedItem("order-status").value = cells[6] || "Mới tạo";
      }
    },

    "shipments.html": {
      key: "imex_manager_shipments_v1",
      formSelector: "#shipment-form form",
      tableSelector: ".card .table-container table tbody",
      dataColumns: 6,
      statusIndex: 5,
      filters: [
        { selectIndex: 0, columnIndex: 5 }
      ],
      readForm(form) {
        const origin = getValue(form, "origin");
        const destination = getValue(form, "destination");
        return {
          cells: [
            getValue(form, "shipment-code"),
            getValue(form, "related-order"),
            `${origin} → ${destination}`,
            getValue(form, "carrier"),
            formatDate(getValue(form, "arrival")),
            getValue(form, "shipment-status")
          ],
          extra: {
            origin,
            destination,
            departure: getValue(form, "departure")
          }
        };
      },
      fillForm(form, cells, extra = {}) {
        const route = String(cells[2] || "").split("→");
        form.elements.namedItem("shipment-code").value = cells[0] || "";
        form.elements.namedItem("related-order").value = cells[1] || "";
        form.elements.namedItem("origin").value = extra.origin || (route[0] || "").trim();
        form.elements.namedItem("destination").value = extra.destination || (route[1] || "").trim();
        form.elements.namedItem("carrier").value = cells[3] || "";
        form.elements.namedItem("arrival").value = toISODate(cells[4]);
        form.elements.namedItem("departure").value = extra.departure || "";
        form.elements.namedItem("shipment-status").value = cells[5] || "Chờ lấy hàng";
      }
    },

    "partners.html": {
      key: "imex_manager_partners_v1",
      formSelector: "#partner-form form",
      tableSelector: ".card .table-container table tbody",
      dataColumns: 7,
      filters: [
        { selectIndex: 0, columnIndex: 2 },
        { selectIndex: 1, columnIndex: 3 }
      ],
      readForm(form) {
        return {
          cells: [
            getValue(form, "partner-code"),
            getValue(form, "company"),
            getValue(form, "partner-type"),
            getValue(form, "partner-country"),
            getValue(form, "contact-name"),
            getValue(form, "partner-email"),
            getValue(form, "partner-phone")
          ],
          extra: {
            address: getValue(form, "partner-address"),
            notes: getValue(form, "partner-notes")
          }
        };
      },
      fillForm(form, cells, extra = {}) {
        form.elements.namedItem("partner-code").value = cells[0] || "";
        const lines = String(cells[1] || "").split("\n").map(s => s.trim()).filter(Boolean);
        const companyName = lines.length > 1 ? lines[1] : (lines[0] || "");
        form.elements.namedItem("company").value = companyName;
        form.elements.namedItem("partner-type").value = cells[2] || "Khách hàng";
        form.elements.namedItem("partner-country").value = cells[3] || "";
        form.elements.namedItem("contact-name").value = cells[4] || "";
        form.elements.namedItem("partner-email").value = cells[5] || "";
        form.elements.namedItem("partner-phone").value = cells[6] || "";
        form.elements.namedItem("partner-address").value = extra.address || "";
        form.elements.namedItem("partner-notes").value = extra.notes || "";
      }
    }
  };

  function badgeClass(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("hoàn thành") || value.includes("đã giao") || value.includes("khách hàng") || value.includes("cả hai")) {
      return "badge badge-success";
    }
    if (value.includes("hủy") || value.includes("chậm")) {
      return "badge badge-danger";
    }
    if (value.includes("vận chuyển") || value.includes("đã lấy") || value.includes("đã đến")) {
      return "badge badge-info";
    }
    if (value.includes("xử lý") || value.includes("mới tạo") || value.includes("chờ") || value.includes("nhà cung cấp")) {
      return "badge badge-warning";
    }
    return "badge";
  }

  function setupCrud(config) {
    const tbody = \$(config.tableSelector);
    const form = \$(config.formSelector);

    if (!tbody || !form) return;

    let rows;

    try {
      const saved = localStorage.getItem(config.key);
      if (saved) {
        rows = JSON.parse(saved);
      } else {
        rows = $$("tr", tbody).map((tr) => ({ cells: Array.from(tr.cells) .slice(0, config.dataColumns) .map((cell) => cell.innerText.trim()), extra: {} })); localStorage.setItem(config.key, JSON.stringify(rows)); } if (!Array.isArray(rows)) rows = []; } catch (error) { rows = $$("tr", tbody).map((tr) => ({
        cells: Array.from(tr.cells)
          .slice(0, config.dataColumns)
          .map((cell) => cell.innerText.trim()),
        extra: {}
      }));
    }

    let editingIndex = null;
    const submitButton = \$('button[type="submit"]', form);
    const originalSubmitText = submitButton ? submitButton.textContent.trim() : "Lưu";

    function save() {
      try {
        localStorage.setItem(config.key, JSON.stringify(rows));
      } catch (error) {
        alert("Không thể lưu dữ liệu trên trình duyệt.");
      }
    }

    function render() {
      const search = ($('input[type="search"]')?.value \vert{}\vert{} "").toLocaleLowerCase("vi-VN").trim(); const toolbarSelects = $\$(".toolbar select");

      const filtered = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => {
          const content = row.cells.join(" ").toLocaleLowerCase("vi-VN");
          if (search && !content.includes(search)) return false;

          return config.filters.every((filter) => {
            const select = toolbarSelects[filter.selectIndex];
            if (!select || !select.value) return true;

            const selectedText = (select.options[select.selectedIndex]?.text || "").toLocaleLowerCase("vi-VN");
            const cellValue = String(row.cells[filter.columnIndex] || "").toLocaleLowerCase("vi-VN");

            if (selectedText.includes("tất cả")) return true;
            return cellValue.includes(selectedText);
          });
        });

      tbody.innerHTML = "";

      filtered.forEach(({ row, index }) => {
        const tr = document.createElement("tr");
        tr.dataset.index = String(index);

        row.cells.forEach((value, cellIndex) => {
          const td = document.createElement("td");

          if (cellIndex === config.statusIndex || (page === "partners.html" && cellIndex === 2)) {
            const badge = document.createElement("span");
            badge.className = badgeClass(value);
            badge.textContent = value;
            td.appendChild(badge);
          } else {
            td.textContent = value;
          }

          tr.appendChild(td);
        });

        const actionCell = document.createElement("td");
        actionCell.className = "actions";

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "btn btn-secondary btn-sm";
        viewButton.dataset.action = "view";
        viewButton.textContent = "Xem";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn btn-secondary btn-sm";
        editButton.dataset.action = "edit";
        editButton.textContent = "Sửa";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-danger btn-sm";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Xóa";

        actionCell.append(viewButton, editButton, deleteButton);
        tr.appendChild(actionCell);
        tbody.appendChild(tr);
      });

      const countLabel = \$(".pagination .muted");
      if (countLabel) {
        countLabel.textContent = `Hiển thị ${filtered.length ? 1 : 0}–${filtered.length} trong ${rows.length} bản ghi`;
      }
    }

    function resetEditing() {
      editingIndex = null;
      if (submitButton) submitButton.textContent = originalSubmitText;
    }

    function triggerEditMode(index) {
      if (!rows[index]) return;
      editingIndex = index;
      config.fillForm(form, rows[index].cells, rows[index].extra || {});

      if (submitButton) submitButton.textContent = "Cập nhật";

      const formSection = form.closest(".form-card") || form;
      setTimeout(() => {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const record = config.readForm(form);

      if (!record.cells[0]) {
        alert("Vui lòng nhập mã để lưu bản ghi.");
        return;
      }

      if (editingIndex === null) {
        rows.unshift(record);
        alert("Đã thêm bản ghi.");
      } else {
        rows[editingIndex] = record;
        alert("Đã cập nhật bản ghi.");
        resetEditing();
      }

      save();
      render();
      form.reset();
    });

    form.addEventListener("reset", () => {
      window.setTimeout(resetEditing, 0);
    });

    tbody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const tr = button.closest("tr");
      const index = Number(tr?.dataset.index);
      if (!Number.isInteger(index) || !rows[index]) return;

      const record = rows[index];

      if (button.dataset.action === "view") {
        alert(record.cells.map((v, i) => `${i + 1}. ${v}`).join("\n"));
        return;
      }

      if (button.dataset.action === "delete") {
        if (window.confirm(`Xóa bản ghi ${record.cells[0]}?`)) {
          rows.splice(index, 1);
          save();
          render();
          if (editingIndex === index) {
            form.reset();
            resetEditing();
          }
        }
        return;
      }

      if (button.dataset.action === "edit") {
        triggerEditMode(index);
      }
    });

    const searchInput = $('input[type="search"]'); if (searchInput) searchInput.addEventListener("input", render);      $\$(".toolbar select").forEach((select) => select.addEventListener("change", render));

    // Xử lý đọc URL Params (Tìm kiếm & Tự động bật Sửa)
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("search");
    const editCode = urlParams.get("edit");

    if (searchQuery && searchInput) {
      searchInput.value = searchQuery;
    }

    render();

    if (editCode) {
      const targetIndex = rows.findIndex(
        (r) => String(r.cells[0] || "").toLowerCase() === editCode.toLowerCase()
      );
      if (targetIndex !== -1) {
        triggerEditMode(targetIndex);
      }
    }
  }

  function setupReports() {
    if (page !== "reports.html") return;

    const reportForm = $(".card form"); if (reportForm) { reportForm.addEventListener("submit", (e) => { e.preventDefault(); alert("Đã nhận bộ lọc. Báo cáo hiện dùng dữ liệu mẫu."); }); }      $\$("button").forEach((button) => {
      const label = button.textContent.trim().toLowerCase();
      if (label === "in báo cáo") button.addEventListener("click", () => window.print());
      if (label === "xuất csv") button.addEventListener("click", exportTablesToCSV);
    });
  }

  function exportTablesToCSV() {
    const tables = $$("table"); if (!tables.length) return alert("Không có dữ liệu xuất.");      const csvRows = []; tables.forEach((table, i) => { if (i > 0) csvRows.push([]); const caption = table.closest("article")?.querySelector("h2")?.textContent.trim(); if (caption) csvRows.push([caption]);        $$("tr", table).forEach((tr) => {
        csvRows.push(Array.from(tr.cells).map((c) => c.innerText.trim()));
      });
    });

    const csv = "\uFEFF" + csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "imex-manager-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (configs[page]) setupCrud(configs[page]);
  setupReports();

  if (page === "login.html") {
    const loginForm = \$(".login-container form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (loginForm.reportValidity()) window.location.href = "index.html";
      });
    }
  }
})();