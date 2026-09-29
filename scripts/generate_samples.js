const fs = require('fs');
const path = require('path');
const xlsx = require(path.resolve(__dirname, '../backend/node_modules/xlsx'));

const outputDir = path.resolve(__dirname, '../namunalar');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. O'qituvchilar (10 ta)
const teachersData = [
  { 'Ism': 'Anvar', 'Familiya': 'Karimov', 'Login': 'teacher_anvar' },
  { 'Ism': 'Dilnoza', 'Familiya': 'Rahimova', 'Login': 'teacher_dilnoza' },
  { 'Ism': 'Jasur', 'Familiya': 'Toshmatov', 'Login': 'teacher_jasur' },
  { 'Ism': 'Malika', 'Familiya': 'Ismoilova', 'Login': 'teacher_malika' },
  { 'Ism': 'Bobur', 'Familiya': 'Mirzayev', 'Login': 'teacher_bobur' },
  { 'Ism': 'Nigora', 'Familiya': 'Umarova', 'Login': 'teacher_nigora' },
  { 'Ism': 'Farrux', 'Familiya': 'Qodirov', 'Login': 'teacher_farrux' },
  { 'Ism': 'Shahnoza', 'Familiya': 'Yusupova', 'Login': 'teacher_shahnoza' },
  { 'Ism': 'Otabek', 'Familiya': 'Sobirov', 'Login': 'teacher_otabek' },
  { 'Ism': 'Gulnoza', 'Familiya': 'Aliyeva', 'Login': 'teacher_gulnoza' },
];

const wbTeachers = xlsx.utils.book_new();
const wsTeachers = xlsx.utils.json_to_sheet(teachersData);
xlsx.utils.book_append_sheet(wbTeachers, wsTeachers, 'Oqituvchilar');
const teachersPath = path.join(outputDir, '1_oqituvchilar_10ta.xlsx');
xlsx.writeFile(wbTeachers, teachersPath);
console.log('Yaratildi:', teachersPath);

// 2. 1-guruh o'quvchilari (10 ta)
const studentsGroup1 = [
  { 'Ism': 'Ali', 'Familiya': 'Valiyev', 'Login': 'student_g1_ali' },
  { 'Ism': 'Azizbek', 'Familiya': 'Mahmudov', 'Login': 'student_g1_azizbek' },
  { 'Ism': 'Madina', 'Familiya': 'Xolmatova', 'Login': 'student_g1_madina' },
  { 'Ism': 'Sardor', 'Familiya': 'Ergashev', 'Login': 'student_g1_sardor' },
  { 'Ism': 'Kamola', 'Familiya': 'Rustamova', 'Login': 'student_g1_kamola' },
  { 'Ism': 'Bekzod', 'Familiya': 'Yusupov', 'Login': 'student_g1_bekzod' },
  { 'Ism': 'Laylo', 'Familiya': 'Saidova', 'Login': 'student_g1_laylo' },
  { 'Ism': 'Javohir', 'Familiya': 'Normatov', 'Login': 'student_g1_javohir' },
  { 'Ism': 'Mohira', 'Familiya': 'Qosimova', 'Login': 'student_g1_mohira' },
  { 'Ism': 'Doston', 'Familiya': 'Temirov', 'Login': 'student_g1_doston' },
];

// 3. 2-guruh o'quvchilari (10 ta)
const studentsGroup2 = [
  { 'Ism': 'Shahzod', 'Familiya': 'Nazarov', 'Login': 'student_g2_shahzod' },
  { 'Ism': 'Ziyoda', 'Familiya': 'Karimova', 'Login': 'student_g2_ziyoda' },
  { 'Ism': 'Ulugbek', 'Familiya': 'Odilov', 'Login': 'student_g2_ulugbek' },
  { 'Ism': 'Sevara', 'Familiya': 'Hasanova', 'Login': 'student_g2_sevara' },
  { 'Ism': 'Bilol', 'Familiya': 'Ganiyev', 'Login': 'student_g2_bilol' },
  { 'Ism': 'Rayhona', 'Familiya': 'Zokirova', 'Login': 'student_g2_rayhona' },
  { 'Ism': 'Abbos', 'Familiya': 'Sultonov', 'Login': 'student_g2_abbos' },
  { 'Ism': 'Diyora', 'Familiya': 'Olimova', 'Login': 'student_g2_diyora' },
  { 'Ism': 'Asadbek', 'Familiya': 'Murodov', 'Login': 'student_g2_asadbek' },
  { 'Ism': 'Feruza', 'Familiya': 'Toirova', 'Login': 'student_g2_feruza' },
];

// Guruhlar fayli (10 ta guruh varaqlari bilan)
const wbGroups = xlsx.utils.book_new();

// 1-guruh varaqasi
xlsx.utils.book_append_sheet(wbGroups, xlsx.utils.json_to_sheet(studentsGroup1), 'Guruh 1');

// 2-guruh varaqasi
xlsx.utils.book_append_sheet(wbGroups, xlsx.utils.json_to_sheet(studentsGroup2), 'Guruh 2');

// 3-10 guruhlar varaqlari
for (let i = 3; i <= 10; i++) {
  const sampleStudents = [
    { 'Ism': 'Oquvchi 1', 'Familiya': `Guruh ${i}`, 'Login': `student_g${i}_1` },
    { 'Ism': 'Oquvchi 2', 'Familiya': `Guruh ${i}`, 'Login': `student_g${i}_2` },
  ];
  xlsx.utils.book_append_sheet(wbGroups, xlsx.utils.json_to_sheet(sampleStudents), `Guruh ${i}`);
}

const groupsPath = path.join(outputDir, '2_guruhlar_10ta_va_oquvchilar.xlsx');
xlsx.writeFile(wbGroups, groupsPath);
console.log('Yaratildi:', groupsPath);

// Alohida 1-guruh o'quvchilari fayli (Guruh ichiga alohida import qilish uchun)
const wbSingleG1 = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wbSingleG1, xlsx.utils.json_to_sheet(studentsGroup1), 'Guruh 1');
const singleG1Path = path.join(outputDir, '3_guruh_1_oquvchilar_10ta.xlsx');
xlsx.writeFile(wbSingleG1, singleG1Path);
console.log('Yaratildi:', singleG1Path);

// Alohida 2-guruh o'quvchilari fayli (Guruh ichiga alohida import qilish uchun)
const wbSingleG2 = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wbSingleG2, xlsx.utils.json_to_sheet(studentsGroup2), 'Guruh 2');
const singleG2Path = path.join(outputDir, '4_guruh_2_oquvchilar_10ta.xlsx');
xlsx.writeFile(wbSingleG2, singleG2Path);
console.log('Yaratildi:', singleG2Path);

console.log('Barcha fayllar muvaffaqiyatli yaratildi!');
