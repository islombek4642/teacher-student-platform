const fs = require('fs');
const path = require('path');
const xlsx = require(path.resolve(__dirname, '../backend/node_modules/xlsx'));

const outputDir = path.resolve(__dirname, '../namunalar');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. 20 ta O'qituvchilar
const teacherNames = [
  { ism: 'Anvar', familiya: 'Karimov', login: 'teacher_anvar' },
  { ism: 'Dilnoza', familiya: 'Rahimova', login: 'teacher_dilnoza' },
  { ism: 'Jasur', familiya: 'Toshmatov', login: 'teacher_jasur' },
  { ism: 'Malika', familiya: 'Ismoilova', login: 'teacher_malika' },
  { ism: 'Bobur', familiya: 'Mirzayev', login: 'teacher_bobur' },
  { ism: 'Nigora', familiya: 'Umarova', login: 'teacher_nigora' },
  { ism: 'Farrux', familiya: 'Qodirov', login: 'teacher_farrux' },
  { ism: 'Shahnoza', familiya: 'Yusupova', login: 'teacher_shahnoza' },
  { ism: 'Otabek', familiya: 'Sobirov', login: 'teacher_otabek' },
  { ism: 'Gulnoza', familiya: 'Aliyeva', login: 'teacher_gulnoza' },
  { ism: 'Alisher', familiya: 'Usmonov', login: 'teacher_alisher' },
  { ism: 'Zarina', familiya: 'Jalolova', login: 'teacher_zarina' },
  { ism: 'Botir', familiya: 'Rustamov', login: 'teacher_botir' },
  { ism: 'Feruza', familiya: 'Nematova', login: 'teacher_feruza' },
  { ism: 'Sardor', familiya: 'Ergashev', login: 'teacher_sardor' },
  { ism: 'Madina', familiya: 'Xolmatova', login: 'teacher_madina' },
  { ism: 'Nodir', familiya: 'Kamilov', login: 'teacher_nodir' },
  { ism: 'Kamola', familiya: 'Sultonova', login: 'teacher_kamola' },
  { ism: 'Aziz', familiya: 'Fayziyev', login: 'teacher_aziz' },
  { ism: 'Sevara', familiya: 'Hasanova', login: 'teacher_sevara' },
];

const teachersData = teacherNames.map(t => ({
  'Ism': t.ism,
  'Familiya': t.familiya,
  'Login': t.login
}));

const wbTeachers = xlsx.utils.book_new();
const wsTeachers = xlsx.utils.json_to_sheet(teachersData);
xlsx.utils.book_append_sheet(wbTeachers, wsTeachers, 'Oqituvchilar');
const teachersPath = path.join(outputDir, 'oqituvchilar.xlsx');
xlsx.writeFile(wbTeachers, teachersPath);
console.log(`[OK] ${teachersPath} (20 ta o'qituvchi) yaratildi`);

// 2. 20 ta O'quvchilar
const studentNames = [
  { ism: 'Shohruh', familiya: 'Qosimov', login: 'student_shohruh' },
  { ism: 'Asilbek', familiya: 'Yuldashev', login: 'student_asilbek' },
  { ism: 'Ilyos', familiya: 'Tojiyev', login: 'student_ilyos' },
  { ism: 'Sanjar', familiya: 'Odilov', login: 'student_sanjar' },
  { ism: 'Doston', familiya: 'Nematov', login: 'student_doston' },
  { ism: 'Shavkat', familiya: 'Mirzayev', login: 'student_shavkat' },
  { ism: 'Zafar', familiya: 'Kamilov', login: 'student_zafar' },
  { ism: 'Bekzod', familiya: 'Fayziyev', login: 'student_bekzod' },
  { ism: 'Akmal', familiya: 'Gafurov', login: 'student_akmal' },
  { ism: 'Javohir', familiya: 'Tolipov', login: 'student_javohir' },
  { ism: 'Lola', familiya: 'Qosimova', login: 'student_lola' },
  { ism: 'Shirin', familiya: 'Yuldasheva', login: 'student_shirin' },
  { ism: 'Asila', familiya: 'Tojiyeva', login: 'student_asila' },
  { ism: 'Zilola', familiya: 'Odilova', login: 'student_zilola' },
  { ism: 'Maftuna', familiya: 'Nematova', login: 'student_maftuna' },
  { ism: 'Dinora', familiya: 'Mirzayeva', login: 'student_dinora' },
  { ism: 'Nilufar', familiya: 'Kamilova', login: 'student_nilufar' },
  { ism: 'Sitora', familiya: 'Fayziyeva', login: 'student_sitora' },
  { ism: 'Shabbona', familiya: 'Gafurova', login: 'student_shabbona' },
  { ism: 'Rayhon', familiya: 'Tolipova', login: 'student_rayhon' },
];

const studentsData = studentNames.map(s => ({
  'Ism': s.ism,
  'Familiya': s.familiya,
  'Login': s.login
}));

const wbStudents = xlsx.utils.book_new();
const wsStudents = xlsx.utils.json_to_sheet(studentsData);
xlsx.utils.book_append_sheet(wbStudents, wsStudents, 'Oquvchilar');
const studentsPath = path.join(outputDir, 'oquvchilar.xlsx');
xlsx.writeFile(wbStudents, studentsPath);
console.log(`[OK] ${studentsPath} (20 ta o'quvchi) yaratildi`);

// 3. 20 ta Guruhlar (har bir sheet = bitta guruh, har birida o'quvchilari bilan)
const groupStudentBank = [
  ['Ali', 'Valiyev'], ['Azizbek', 'Mahmudov'], ['Madina', 'Xolmatova'],
  ['Sardor', 'Ergashev'], ['Kamola', 'Rustamova'], ['Bekzod', 'Yusupov'],
  ['Laylo', 'Saidova'], ['Javohir', 'Normatov'], ['Mohira', 'Qosimova'],
  ['Doston', 'Temirov'], ['Shahzod', 'Nazarov'], ['Ziyoda', 'Karimova'],
  ['Ulugbek', 'Odilov'], ['Sevara', 'Hasanova'], ['Bilol', 'Ganiyev'],
  ['Rayhona', 'Zokirova'], ['Abbos', 'Sultonov'], ['Diyora', 'Olimova'],
  ['Asadbek', 'Murodov'], ['Feruza', 'Toirova'], ['Bobur', 'Mirzayev'],
  ['Jasur', 'Toshmatov'], ['Zarina', 'Jalolova'], ['Shirin', 'Yuldasheva']
];

const wbGroups = xlsx.utils.book_new();

for (let g = 1; g <= 20; g++) {
  const groupName = `Guruh ${g}`;
  const groupRows = [];
  
  // Har bir guruhda 3 tadan 5 tagacha talaba
  const studentCount = 4;
  for (let s = 1; s <= studentCount; s++) {
    const pairIndex = ((g - 1) * 3 + s) % groupStudentBank.length;
    const [ism, familiya] = groupStudentBank[pairIndex];
    groupRows.push({
      'Ism': ism,
      'Familiya': familiya,
      'Login': `std_g${g}_${ism.toLowerCase()}`
    });
  }
  
  const wsGroup = xlsx.utils.json_to_sheet(groupRows);
  xlsx.utils.book_append_sheet(wbGroups, wsGroup, groupName);
}

const groupsPath = path.join(outputDir, 'guruhlar.xlsx');
xlsx.writeFile(wbGroups, groupsPath);
console.log(`[OK] ${groupsPath} (20 ta guruh va ularning talabalari) yaratildi`);
