const XLSX = require('xlsx');

const names = [
  'Shohruh', 'Asilbek', 'Ilyos', 'Sanjar', 'Doston',
  'Shavkat', 'Zafar', 'Bobur', 'Akmal', 'Javohir',
  'Lola', 'Shirin', 'Asila', 'Zilola', 'Maftuna',
  'Dinora', 'Nilufar', 'Sitora', 'Shabbona', 'Rayhon'
];

const surnames = [
  'Qosimov', 'Yuldashev', 'Tojiyev', 'Odilov', 'Nematov',
  'Mirzayev', 'Kamilov', 'Fayziyev', 'Gafurov', 'Tolipov',
  'Qosimova', 'Yuldasheva', 'Tojiyeva', 'Odilova', 'Nematova',
  'Mirzayeva', 'Kamilova', 'Fayziyeva', 'Gafurova', 'Tolipova'
];

const data = [];
for (let i = 0; i < 20; i++) {
  const isMale = i < 10;
  const name = names[i];
  const surname = isMale ? surnames[i % 10] : surnames[10 + (i % 10)];
  const login = `student_${name.toLowerCase()}`;
  data.push({
    'Ism': name,
    'Familiya': surname,
    'Login': login
  });
}

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Students");

XLSX.writeFile(wb, "20_oquvchi.xlsx");
console.log("Created 20_oquvchi.xlsx");
