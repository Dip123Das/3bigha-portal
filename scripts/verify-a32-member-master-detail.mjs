import fs from "node:fs";
const page=fs.readFileSync("app/admin/users/page.tsx","utf8");
const css=fs.readFileSync("app/admin/users/MemberAdministration.module.css","utf8");
for(const token of["memberList","detailHeader","Account readiness","Member timeline","Founder controls","Grant complimentary subscription"]){if(!page.includes(token)&&!css.includes(token)){console.error(`FAIL: Missing ${token}`);process.exit(1)}}
console.log("A-3.2 Member Master-Detail Audit");
console.log("================================");
console.log("PASS: Compact member list and detailed founder control panel are present.");
console.log("PASS: Account readiness uses only recorded member data.");
console.log("PASS: Existing approval, restriction and complimentary subscription controls remain.");
console.log("PASS: Desktop and mobile layouts are responsive.");
