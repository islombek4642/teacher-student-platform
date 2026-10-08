export interface LeaderboardExportItem {
  rank: number;
  fullName: string;
  username: string;
  testsTaken: number;
  averageBand: number;
  bestBand: number;
  lastActive: string | null;
}

export function exportLeaderboardToPrint(groupName: string, items: LeaderboardExportItem[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${groupName} - Natijalar va Reyting</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111827; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 6px 0; font-size: 22px; color: #1e3a8a; }
          .header p { margin: 0; font-size: 13px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 13px; }
          th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .badge { font-weight: bold; color: #1d4ed8; }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${groupName} — O'quvchilar Reytingi va Natijalari</h1>
          <p>Chop etilgan sana: ${new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">#</th>
              <th>O'quvchi</th>
              <th>Login</th>
              <th class="text-center">Topshirgan testlari</th>
              <th class="text-center">Eng yaxshi Band</th>
              <th class="text-center">O'rtacha Band</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td class="text-center font-bold">${item.rank}</td>
                <td><strong>${item.fullName}</strong></td>
                <td>@${item.username}</td>
                <td class="text-center">${item.testsTaken} ta</td>
                <td class="text-center badge">${item.bestBand.toFixed(1)}</td>
                <td class="text-center badge">${item.averageBand.toFixed(1)}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
