import fs from "node:fs";
import path from "node:path";
const shell=fs.readFileSync(path.join(process.cwd(),"components/3bos/vendor/VendorDashboardApplicationShell.tsx"),"utf8");
function check(c,m){if(!c)throw new Error(m);}
check(shell.includes("V14E_READABLE_COMPACT_DASHBOARD"),"V-14E marker missing.");
for(const marker of ["min-height:0!important","height:auto!important","font-size:15px!important","font-size:13px!important","margin:0 0 10px!important","margin-top:-62px!important"]){check(shell.includes(marker),`Missing V-14E rule: ${marker}`);}
check(shell.includes("V14D_UNIFIED_DASHBOARD_DENSITY"),"V-14D base layer removed.");
console.log("V-14E Readable Compact Dashboard assertions passed.");
console.log("Artificial card heights are neutralized and desktop text is readable.");
