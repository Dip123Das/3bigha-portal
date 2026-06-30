import XLSX from "xlsx";

const file = "data/lgd/urban-local-body-wards-covered/urban-local-body-wards-covered-west-bengal.xls";
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  blankrows: false,
});

for (let i = 0; i < Math.min(matrix.length, 16); i++) {
  console.log("ROW", i, JSON.stringify(matrix[i]));
}
