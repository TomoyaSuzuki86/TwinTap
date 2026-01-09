export function drawSessionChart(canvas, sessions, options) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { baseColor, unknownColor } = options;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!sessions.length) {
    ctx.fillStyle = "#b7b0a4";
    ctx.font = "12px sans-serif";
    ctx.fillText("データなし", 10, 20);
    return;
  }

  const padding = 12;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;
  const maxValue = Math.max(...sessions.map((s) => s.durationSec));
  const barWidth = width / sessions.length;

  sessions.forEach((session, index) => {
    const value = session.durationSec;
    const barHeight = maxValue ? (value / maxValue) * height : 0;
    const x = padding + index * barWidth + 4;
    const y = canvas.height - padding - barHeight;
    const isUnknown = session.baby === "U";

    ctx.fillStyle = isUnknown ? `${unknownColor}bb` : baseColor;
    ctx.fillRect(x, y, barWidth - 8, barHeight);

    if (isUnknown) {
      ctx.fillStyle = unknownColor;
      ctx.beginPath();
      ctx.arc(x + (barWidth - 8) / 2, y - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

