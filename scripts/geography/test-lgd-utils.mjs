import { readLgdRows } from "./lgd-import-utils.mjs";

const rows = readLgdRows("districts", "west-bengal");

console.log("Rows:", rows.length);
console.log("First row keys:", Object.keys(rows[0] || {}));
console.log("First row:", rows[0]);
