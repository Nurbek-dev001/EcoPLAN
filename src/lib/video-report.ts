export async function generateVideoReport(calc: any, onProgress?: (progress: number) => void): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;

  const frames: Blob[] = [];
  const fps = 30;
  const totalFrames = fps * 15; // 15 seconds

  const isProfit = calc.financial.financialResult >= 0;

  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    if (onProgress) onProgress(progress);

    // Clear
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Slide 1: Title (0-2s)
    if (progress < 0.15) {
      ctx.fillStyle = "#e2b13c";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Меморандум по бюджету`, canvas.width / 2, canvas.height / 2 - 40);
      ctx.fillStyle = "#fff";
      ctx.font = "36px sans-serif";
      ctx.fillText(`Маршрут №${calc.trainNumber}`, canvas.width / 2, canvas.height / 2 + 20);
    }
    // Slide 2: Train info (2-5s)
    else if (progress < 0.35) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Общая информация", 80, 100);
      ctx.font = "24px sans-serif";
      const items = [
        `Маршрут: ${calc.trainRoute}`,
        `Время в пути: ${calc.trainInfo.duration}`,
        `Расстояние: ${calc.trainInfo.distanceKm} км`,
        `Вагонов: ${calc.productionMetrics.totalWagons}`,
        `Мест: ${calc.productionMetrics.totalSeats}`,
      ];
      items.forEach((item, idx) => ctx.fillText(item, 80, 160 + idx * 40));
    }
    // Slide 3: Expenses chart (5-9s)
    else if (progress < 0.6) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Структура расходов", 80, 100);
      const groups = Object.entries(calc.results.byGroup || {});
      const maxVal = Math.max(...groups.map(([, v]) => v as number));
      groups.forEach(([name, value], idx) => {
        const barWidth = ((value as number) / maxVal) * 600;
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(80, 150 + idx * 50, barWidth * Math.min(1, (progress - 0.35) / 0.25), 30);
        ctx.fillStyle = "#fff";
        ctx.font = "16px sans-serif";
        ctx.fillText(`${name}: ${Math.round(value as number).toLocaleString("ru-RU")} тг`, 80, 145 + idx * 50);
      });
    }
    // Slide 4: Financial result (9-12s)
    else if (progress < 0.8) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Финансовый результат", canvas.width / 2, 100);
      ctx.font = "28px sans-serif";
      ctx.fillStyle = "#4ade80";
      ctx.fillText(`Доходы: ${calc.financial.totalRevenue.toLocaleString("ru-RU")} тг`, canvas.width / 2, 200);
      ctx.fillStyle = "#f87171";
      ctx.fillText(`Расходы: ${calc.financial.totalExpenses.toLocaleString("ru-RU")} тг`, canvas.width / 2, 280);
      ctx.fillStyle = isProfit ? "#4ade80" : "#f87171";
      ctx.font = "bold 36px sans-serif";
      const resultText = isProfit ? "Прибыль" : "Убыток";
      ctx.fillText(`${resultText}: ${Math.abs(calc.financial.financialResult).toLocaleString("ru-RU")} тг`, canvas.width / 2, 380);
    }
    // Slide 5: Conclusion (12-15s)
    else {
      ctx.fillStyle = isProfit ? "#166534" : "#7f1d1d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      const status = isProfit ? "✅ РЕЙС РЕНТАБЕЛЬНЫЙ" : "⚠️ ТРЕБУЕТ ОПТИМИЗАЦИИ";
      ctx.fillText(status, canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "24px sans-serif";
      ctx.fillText(`Рентабельность: ${calc.financial.profitMargin.toFixed(1)}%`, canvas.width / 2, canvas.height / 2 + 40);
    }

    // Capture frame
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", 0.8));
    frames.push(blob);
  }

  // Create video from frames using MediaRecorder
  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  const videoBlob = await new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 100);
  });
  return videoBlob;
}
