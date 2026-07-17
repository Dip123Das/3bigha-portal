import fs from "fs";

const css = fs.readFileSync("app/globals.old.css","utf8");

console.log("=================================================");
console.log("3Bigha CSS Audit");
console.log("=================================================");

const layout =
(css.match(/layout-container/g)||[]).length;

const pageBody =
(css.match(/pageBody/g)||[]).length;

const media =
(css.match(/@media/g)||[]).length;

const important =
(css.match(/!important/g)||[]).length;

const home =
(css.match(/homePage/g)||[]).length;

const property =
(css.match(/property/g)||[]).length;

const dashboard =
(css.match(/dashboard/g)||[]).length;

console.log("layout-container :",layout);
console.log("pageBody :",pageBody);
console.log("homePage :",home);
console.log("property :",property);
console.log("dashboard :",dashboard);
console.log("@media :",media);
console.log("!important :",important);

console.log("=================================================");
