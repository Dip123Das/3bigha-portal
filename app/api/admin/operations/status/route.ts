import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const supabase = auth.admin;

  async function count(table: string) {
    const { count } = await supabase
      .from(table)
      .select("*", { head: true, count: "exact" });

    return count || 0;
  }

  const [
    users,
    vendors,
    properties,
    materials,
    servicesCount,
    rentals,
    rfqs,
    tickets,
  ] = await Promise.all([
    count("profiles"),
    count("business_profiles"),
    count("property_listings"),
    count("material_listings"),
    count("service_listings"),
    count("rental_listings"),
    count("rfqs"),
    count("support_tickets"),
  ]);

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
    marketplace: {
      users,
      vendors,
      properties,
      materials,
      services: servicesCount,
      rentals,
      rfqs,
      tickets,
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
