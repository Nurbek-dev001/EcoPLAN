import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SavedCalculation } from "./train-data";
import { calcRevenue } from "./train-data";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./roboto-fonts";

let fontsRegistered = false;

function ensureFonts(doc: jsPDF) {
  if (!fontsRegistered) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jsPDF as any).API.events.push([
      "addFonts",
      function (this: jsPDF) {
        this.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
        this.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        this.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
        this.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      },
    ]);
    fontsRegistered = true;
  }
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
}

function fmtMoney(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ")} ₸`;
}

function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// KTZ Corporate colors
const KTZ_BROWN: [number, number, number] = [90, 55, 20];
const KTZ_GOLD: [number, number, number] = [232, 185, 35];
const KTZ_DARK_BROWN: [number, number, number] = [60, 35, 12];
const KTZ_LIGHT_BEIGE: [number, number, number] = [250, 246, 240];

export function generatePdfReport(
  calc: SavedCalculation,
  type: "full" | "cost" | "executive" = "full",
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  ensureFonts(doc);

  const pageWidth = doc.internal.pageSize.width;
  const margin = 18;
  let y = 14;
  const isProfit = calc.financial.financialResult >= 0;

  const reportTypeLabel = type === "full" ? "Полный отчёт" : type === "cost" ? "Себестоимость" : "Сводный отчёт";

  // === HEADER: KTZ LOGO PLACEHOLDER + TITLE ===
  doc.setFillColor(KTZ_BROWN[0], KTZ_BROWN[1], KTZ_BROWN[2]);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFillColor(KTZ_GOLD[0], KTZ_GOLD[1], KTZ_GOLD[2]);
  doc.rect(0, 28, pageWidth, 2, "F");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(KTZ_GOLD[0], KTZ_GOLD[1], KTZ_GOLD[2]);
  doc.text("ҚТЖ", margin, 19);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 225, 215);
  doc.text("«Қазақстан Темір Жолы»", margin, 24);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const memoTitle = `Меморандум по бюджету маршрута №${calc.trainNumber}`;
  doc.text(memoTitle, pageWidth - margin, 19, { align: "right" });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(210, 205, 195);
  doc.text(`EcoPlan Hub — ${reportTypeLabel}`, pageWidth - margin, 24, { align: "right" });

  y = 36;

  const formationDate = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const calcDate = new Date(calc.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  doc.setFontSize(9);
  doc.setTextColor(80, 70, 60);
  doc.text(`Дата формирования: ${formationDate}`, margin, y);
  doc.text(`Дата расчёта: ${calcDate}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.setDrawColor(180, 170, 155);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // === SECTION 1: ОБЩАЯ ИНФОРМАЦИЯ ===
  y = sectionTitle(doc, type === "executive" ? "Рейс" : "Раздел 1. Общая информация", y, margin);

  const routeTypeLabel = calc.routeType === "social" ? "Социальный" : calc.trainInfo.isInternational ? "Международный" : "Коммерческий";
  const trainTypeLabel = calc.trainType === "talgo" ? "Talgo" : "Стандартный";

  const infoBody: (string | number)[][] = [
    ["Номер поезда", calc.trainNumber],
    ["Маршрут", calc.trainRoute],
    ["Время в пути", calc.trainInfo.duration],
    ["Расстояние", `${calc.trainInfo.distanceKm} км`],
    ["Тип поезда", trainTypeLabel],
    ["Тип маршрута", routeTypeLabel],
  ];
  if (type !== "executive") {
    infoBody.push(
      ["Количество вагонов", String(calc.productionMetrics.totalWagons)],
      ["Количество мест", String(calc.productionMetrics.totalSeats)],
      ["Рейсов в месяц", String(calc.expenses.find(e => e.id === "mzs")?.quantity ?? "—")],
    );
  }

  autoTable(doc, {
    startY: y,
    body: infoBody,
    theme: "plain",
    styles: { font: "Roboto", fontStyle: "normal", fontSize: 10, cellPadding: 1.8, textColor: [40, 40, 40] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60, textColor: [60, 60, 60] },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });
  y = getY(doc, y, 50) + 6;

  // === EXECUTIVE: KPI DASHBOARD (compact) ===
  if (type === "executive") {
    if (y > 220) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Ключевые показатели", y, margin);

    const { ticketRevenue, totalRevenue } = calcRevenue(calc.revenue);
    autoTable(doc, {
      startY: y,
      body: [
        ["Доходы всего", fmtMoney(totalRevenue)],
        ["Расходы всего", fmtMoney(calc.financial.totalExpenses)],
        [isProfit ? "Прибыль" : "Убыток", fmtMoney(calc.financial.financialResult)],
        ["Рентабельность", `${fmtNum(calc.financial.profitMargin, 1)} %`],
        ["Загрузка", `${calc.productionMetrics.occupancyPercent} %`],
        ["Вагонов", String(calc.productionMetrics.totalWagons)],
      ],
      theme: "grid",
      styles: { font: "Roboto", fontStyle: "normal", fontSize: 11, cellPadding: 3, textColor: [40, 40, 40] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 80 },
        1: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = isProfit ? [225, 240, 225] : [250, 225, 225];
          data.cell.styles.textColor = isProfit ? [25, 90, 30] : [140, 25, 25];
        }
      },
      margin: { left: margin, right: margin },
    });
    y = getY(doc, y, 50) + 6;
  }

  // === FULL / EXECUTIVE: REVENUE ===
  if (type !== "cost") {
    if (y > 230) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, type === "executive" ? "Доходы" : "Раздел 2. Доходы", y, margin);
    const { ticketRevenue, totalRevenue } = calcRevenue(calc.revenue);

    const revenueRows: (string | number)[][] = [
      ["Доход от перевозок (билеты)", fmtMoney(ticketRevenue)],
    ];
    if (calc.revenue.subsidy > 0) {
      revenueRows.push(["Государственные субсидии", fmtMoney(calc.revenue.subsidy)]);
    } else {
      revenueRows.push(["Государственные субсидии", fmtMoney(0)]);
    }

    autoTable(doc, {
      startY: y,
      head: [["Статья дохода", "Сумма"]],
      body: revenueRows,
      foot: [["ИТОГО ДОХОДЫ", fmtMoney(totalRevenue)]],
      theme: "grid",
      styles: { font: "Roboto", fontStyle: "normal", fontSize: 9.5, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { font: "Roboto", fontStyle: "bold", fillColor: KTZ_BROWN, textColor: [255, 255, 255], halign: "left" },
      footStyles: { font: "Roboto", fontStyle: "bold", fillColor: KTZ_LIGHT_BEIGE, textColor: KTZ_DARK_BROWN },
      columnStyles: { 1: { halign: "right", cellWidth: 55 } },
      margin: { left: margin, right: margin },
    });
    y = getY(doc, y, 35) + 6;
  }

  // === FULL / COST: EXPENSES ===
  if (type !== "executive") {
    if (y > 230) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, type === "cost" ? "Раздел 2. Структура расходов" : "Раздел 3. Расходы", y, margin);

    const expenseGroupOrder = ["МЖС", "Станционные", "Санобработка", "Подвижной состав", "Тяга", "Расходники"];
    const expenseRows: (string | number)[][] = [];
    for (const group of expenseGroupOrder) {
      if (calc.results.byGroup[group] !== undefined) {
        const pct = calc.results.total > 0 ? (calc.results.byGroup[group] / calc.results.total) * 100 : 0;
        expenseRows.push(type === "cost"
          ? [group, fmtMoney(calc.results.byGroup[group]), `${fmtNum(pct, 1)} %`]
          : [group, fmtMoney(calc.results.byGroup[group])]
        );
      }
    }
    for (const [group, amount] of Object.entries(calc.results.byGroup)) {
      if (!expenseGroupOrder.includes(group)) {
        const pct = calc.results.total > 0 ? (amount / calc.results.total) * 100 : 0;
        expenseRows.push(type === "cost"
          ? [group, fmtMoney(amount), `${fmtNum(pct, 1)} %`]
          : [group, fmtMoney(amount)]
        );
      }
    }

    autoTable(doc, {
      startY: y,
      head: type === "cost" ? [["Категория", "Сумма", "Доля"]] : [["Категория расходов", "Сумма"]],
      body: expenseRows,
      foot: [["ИТОГО РАСХОДЫ", fmtMoney(calc.results.total), ...(type === "cost" ? ["100.0 %"] : [])]],
      theme: "grid",
      styles: { font: "Roboto", fontStyle: "normal", fontSize: 9.5, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { font: "Roboto", fontStyle: "bold", fillColor: KTZ_BROWN, textColor: [255, 255, 255], halign: "left" },
      footStyles: { font: "Roboto", fontStyle: "bold", fillColor: [245, 235, 230], textColor: KTZ_DARK_BROWN },
      columnStyles: type === "cost"
        ? { 1: { halign: "right", cellWidth: 50 }, 2: { halign: "right", cellWidth: 35 } }
        : { 1: { halign: "right", cellWidth: 55 } },
      margin: { left: margin, right: margin },
    });
    y = getY(doc, y, 60) + 6;
  }

  // === COST: UNIT ECONOMICS ===
  if (type === "cost") {
    if (y > 220) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Раздел 3. Удельные расходы", y, margin);

    const wagons = calc.productionMetrics.totalWagons;
    const passengers = calc.revenue.passengers;
    const costPerKm = calc.trainInfo.distanceKm > 0 ? calc.results.total / calc.trainInfo.distanceKm : 0;
    const rides = calc.expenses.find(e => e.id === "mzs")?.quantity || 1;

    autoTable(doc, {
      startY: y,
      head: [["Показатель", "Значение"]],
      body: [
        ["Расход на 1 вагон", fmtMoney(calc.results.costPerWagon)],
        ["Расход на 1 пассажира", fmtMoney(calc.results.costPerPassenger)],
        ["Расход на 1 км", fmtMoney(costPerKm)],
        ["Расход на 1 рейс", fmtMoney(calc.results.total / rides)],
        ["Расход на вагон (норматив)", fmtMoney(500000)],
        ["Отклонение от норматива", `${fmtNum((calc.results.costPerWagon - 500000) / 500000 * 100, 1)} %`],
      ],
      theme: "grid",
      styles: { font: "Roboto", fontStyle: "normal", fontSize: 10, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { font: "Roboto", fontStyle: "bold", fillColor: KTZ_BROWN, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "right", cellWidth: 60 } },
      margin: { left: margin, right: margin },
    });
    y = getY(doc, y, 45) + 6;
  }

  // Page break check
  if (y > 230) { doc.addPage(); y = 20; }

  // === FINANCIAL RESULT (all types) ===
  y = sectionTitle(doc, type === "executive" ? "Финансовый результат" : (type === "cost" ? "Раздел 4. Финансовый результат" : "Раздел 4. Финансовый результат"), y, margin);
  const resultLabel = isProfit ? "ПРИБЫЛЬ" : "УБЫТОК";

  const finBody: (string | number)[][] = [
    ["Доходы всего", fmtMoney(calc.financial.totalRevenue)],
    ["Расходы всего", fmtMoney(calc.financial.totalExpenses)],
    [resultLabel, fmtMoney(calc.financial.financialResult)],
  ];
  if (type === "executive") {
    finBody.push(["Рентабельность", `${fmtNum(calc.financial.profitMargin, 1)} %`]);
  }

  autoTable(doc, {
    startY: y,
    body: finBody,
    theme: "grid",
    styles: { font: "Roboto", fontStyle: "normal", fontSize: 10.5, cellPadding: 3, textColor: [40, 40, 40] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: type === "executive" ? 80 : 90 },
      1: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11.5;
        data.cell.styles.fillColor = isProfit ? [225, 240, 225] : [250, 225, 225];
        data.cell.styles.textColor = isProfit ? [25, 90, 30] : [140, 25, 25];
      }
    },
    margin: { left: margin, right: margin },
  });
  y = getY(doc, y, 30) + 6;

  // === FULL: ANALYTICS ===
  if (type === "full") {
    if (y > 220) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Раздел 5. Аналитика", y, margin);

    const passengers = calc.revenue.passengers;
    const wagons = calc.productionMetrics.totalWagons;
    const costPerWagon = wagons > 0 ? calc.results.total / wagons : 0;
    const costPerPassenger = passengers > 0 ? calc.results.total / passengers : 0;
    const revenuePerPassenger = passengers > 0 ? calc.financial.totalRevenue / passengers : 0;

    autoTable(doc, {
      startY: y,
      head: [["Показатель", "Значение"]],
      body: [
        ["Рентабельность", `${fmtNum(calc.financial.profitMargin, 1)} %`],
        ["Расход на 1 вагон", fmtMoney(costPerWagon)],
        ["Расход на 1 пассажира", fmtMoney(costPerPassenger)],
        ["Доход на 1 пассажира", fmtMoney(revenuePerPassenger)],
        ["Пробег", `${fmtNum(calc.productionMetrics.mileageThousKm, 1)} тыс. ваг-км`],
        ["Пассажирооборот", `${fmtNum(calc.productionMetrics.passengerTurnover, 1)} тыс. пасс-км`],
        ["Вместимость", `${calc.productionMetrics.occupancyPercent} %`],
      ],
      theme: "grid",
      styles: { font: "Roboto", fontStyle: "normal", fontSize: 9.5, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { font: "Roboto", fontStyle: "bold", fillColor: KTZ_BROWN, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "right", cellWidth: 60 } },
      margin: { left: margin, right: margin },
    });
    y = getY(doc, y, 50) + 6;
  }

  // === FULL: APPROVAL ===
  if (type === "full") {
    if (y > 210) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Раздел 6. Утверждение", y, margin);

    const statusText = calc.status === "approved" ? "УТВЕРЖДЁН" : calc.status === "rejected" ? "ОТКЛОНЁН" : "НА УТВЕРЖДЕНИИ";
    const statusColor = calc.status === "approved" ? [46, 125, 50] : calc.status === "rejected" ? [198, 40, 40] : [150, 120, 60];

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(margin, y, 60, 10, 2, 2, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.text(statusText, margin + 30, y + 6.5, { align: "center" });
    y += 14;

    doc.setTextColor(60, 50, 40);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.text("Подпись экономиста: _______________________", margin, y);
    y += 6;
    doc.text("Подпись контролёра: _______________________", margin, y);
    y += 6;
    doc.text(`Дата утверждения: ${formationDate}`, margin, y);
    y += 10;

    if (calc.anomalyExplanation) {
      doc.setFont("Roboto", "bold");
      doc.setFontSize(9);
      doc.setTextColor(140, 30, 30);
      doc.text("Обоснование перерасхода:", margin, y);
      y += 4;
      doc.setFont("Roboto", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 50, 40);
      const explanationLines = doc.splitTextToSize(calc.anomalyExplanation, pageWidth - 2 * margin - 4);
      doc.text(explanationLines, margin + 2, y + 4);
    }
  }

  // === FOOTER on every page ===
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const ph = doc.internal.pageSize.height;
    doc.setFont("Roboto", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, ph - 12, pageWidth - margin, ph - 12);
    doc.text("АО «НК «Қазақстан Темір Жолы» — Конфиденциально", margin, ph - 7);
    doc.text(`Страница ${p} из ${pageCount}`, pageWidth - margin, ph - 7, { align: "right" });
  }

  doc.save(`KTZ_${type === "full" ? "Memorandum" : type === "cost" ? "CostReport" : "Executive"}_${calc.trainNumber}_${calc.id.slice(-6)}.pdf`);
}

function sectionTitle(doc: jsPDF, text: string, y: number, margin: number): number {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(KTZ_DARK_BROWN[0], KTZ_DARK_BROWN[1], KTZ_DARK_BROWN[2]);
  doc.text(text, margin, y);
  doc.setDrawColor(KTZ_GOLD[0], KTZ_GOLD[1], KTZ_GOLD[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 1.5, margin + doc.getTextWidth(text), y + 1.5);
  doc.setFont("Roboto", "normal");
  return y + 5;
}

function getY(doc: jsPDF, fallback: number, addIfMissing: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? fallback + addIfMissing;
}
