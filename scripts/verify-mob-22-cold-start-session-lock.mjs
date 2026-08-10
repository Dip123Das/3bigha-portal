import fs from "node:fs";

const auth = fs.readFileSync("apps/mobile/src/features/auth/AuthProvider.tsx", "utf8");
const provider = fs.readFileSync("apps/mobile/src/features/privacy/DeviceReauthenticationProvider.tsx", "utf8");
const app = JSON.parse(fs.readFileSync("apps/mobile/app.json", "utf8"));

const requiredAuth = [
  "initialSessionRestored: boolean | null",
  "useState<boolean | null>(supabase ? null : false)",
  "setInitialSessionRestored(Boolean(data.session))",
];
for (const marker of requiredAuth) {
  if (!auth.includes(marker)) throw new Error(`MOB-22 missing restoration boundary: ${marker}`);
}

const requiredProvider = [
  "coldStartHandled = useRef(false)",
  "const [deviceReady, setDeviceReady] = useState(false)",
  "if (!ready || initialSessionRestored === null || coldStartHandled.current) return",
  "if (session && initialSessionRestored)",
  "void authenticateReturningPerson()",
];
for (const marker of requiredProvider) {
  if (!provider.includes(marker)) throw new Error(`MOB-22 missing cold-start lock: ${marker}`);
}

if (app.expo?.extra?.mobSprint !== "MOB-22") throw new Error("MOB-22 app metadata is not current");
if (/AsyncStorage|SecureStore|fetch\(|console\./.test(provider)) {
  throw new Error("MOB-22 must not persist, transmit or log cold-start verification state");
}

console.log("MOB-22 cold-start session lock assertions passed.");
