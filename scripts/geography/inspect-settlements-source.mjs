import fs from "fs";
import path from "path";

const folders = [
  "villages",
  "urban-local-bodies",
  "urban-local-body-wards",
];

for (const folder of folders) {
  const dir = path.join("data", "lgd", folder);
  console.log("\nFOLDER:", dir);

  if (!fs.existsSync(dir)) {
    console.log("MISSING");
    continue;
  }

  console.log(
    fs.readdirSync(dir)
      .filter((file) => file.includes("west-bengal"))
      .join("\n")
  );
}
