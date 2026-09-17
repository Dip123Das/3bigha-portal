import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const pkg = JSON.parse(read("apps/mobile/package.json"));
const config = JSON.parse(read("apps/mobile/app.json"));
const eas = JSON.parse(read("apps/mobile/eas.json"));
const gradleVersions = read("apps/mobile/node_modules/react-native/gradle/libs.versions.toml");
const androidPermissions = new Set(config.expo.android.permissions ?? []);
const blockedAndroidPermissions = new Set(config.expo.android.blockedPermissions ?? []);

assert.equal(pkg.dependencies.expo, "~57.0.13");
assert.equal(config.expo.name, "3Bigha");
assert.equal(config.expo.android.package, "com.threebigha.mobile");
assert.equal(config.expo.android.versionCode, 1);
assert.equal(eas.cli.appVersionSource, "remote");
assert.equal(eas.build.production.autoIncrement, true);
assert.match(gradleVersions, /minSdk = "24"/);
assert.match(gradleVersions, /targetSdk = "36"/);
assert.match(gradleVersions, /compileSdk = "36"/);
assert.ok(androidPermissions.has("POST_NOTIFICATIONS"));
assert.ok(androidPermissions.has("CAMERA"));
assert.ok(androidPermissions.has("ACCESS_FINE_LOCATION"));
assert.ok(blockedAndroidPermissions.has("android.permission.RECORD_AUDIO"));

console.log("MOB-25 mobile parity and Play-readiness audit assertions passed.");
