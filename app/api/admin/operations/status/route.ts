import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireMasterAdmin(req: Request) {
  const supabase = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return { error: "Unauthorized" };

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return { error: "Invalid user" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "master_admin") {
    return { error: "Master admin required" };
  }

  return { error: null };
}

function run(cmd: string) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 8000,
    }).trim();
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  const auth = await requireMasterAdmin(req);

  if (auth.error) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  const pm2Raw = run("pm2 jlist");
  let pm2: any[] = [];

  try {
    pm2 = pm2Raw ? JSON.parse(pm2Raw).map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status,
      restarts: p.pm2_env?.restart_time,
      memory: p.monit?.memory,
      cpu: p.monit?.cpu,
      uptime: p.pm2_env?.pm_uptime,
    })) : [];
  } catch {
    pm2 = [];
  }

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    server: {
      hostname: run("hostname"),
      uptime: run("uptime -p"),
      disk: run("df -h / | awk 'NR==2 {print $3\" used of \"$2\" (\"$5\")\"}'"),
      memory: run("free -h | awk '/Mem:/ {print $3\" used of \"$2}'"),
      load: run("awk '{print $1\", \"$2\", \"$3}' /proc/loadavg"),
    },
    services: {
      nginx: run("systemctl is-active nginx"),
      fail2ban: run("systemctl is-active fail2ban"),
    },
    git: {
      branch: run("git rev-parse --abbrev-ref HEAD"),
      commit: run("git rev-parse --short HEAD"),
      message: run("git log -1 --pretty=%s"),
    },
    pm2,
    deployHistory: run("tail -20 deployment-history.log 2>/dev/null")
      .split("\n")
      .filter(Boolean),
    healthLog: run("tail -20 /var/log/3bigha-monitor/healthcheck.log 2>/dev/null")
      .split("\n")
      .filter(Boolean),
  });
}
