const XLSX = require('xlsx');

const names = [
  'Alisher', 'Otabek', 'Sardor', 'Nodir', 'Jasur',
  'Botir', 'Aziz', 'Bekzod', 'Rustam', 'Dilshod',
  'Zarina', 'Malika', 'Shahnoza', 'Nigina', 'Umida',
  'Gulnoza', 'Feruza', 'Sevara', 'Madina', 'Kamola'
];

const surnames = [
  'Karimov', 'Tursunov', 'Aliyev', 'Valiyev', 'Qodirov',
  'Murodov', 'Rahimov', 'Usmonov', 'Jalolov', 'Ergashev',
  'Karimova', 'Tursunova', 'Aliyeva', 'Valiyeva', 'Qodirova',
  'Murodova', 'Rahimova', 'Usmonova', 'Jalolova', 'Ergasheva'
];

const data = [];
for (let i = 0; i < 20; i++) {
  const isMale = i < 10;
  const name = names[i];
  const surname = isMale ? surnames[i % 10] : surnames[10 + (i % 10)];
  const login = `t_${name.toLowerCase()}`;
  data.push({
    'Ism': name,
    'Familiya': surname,
    'Login': login
  });
}

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Teachers");

XLSX.writeFile(wb, "20_oqituvchi.xlsx");
console.log("Created 20_oqituvchi.xlsx");
