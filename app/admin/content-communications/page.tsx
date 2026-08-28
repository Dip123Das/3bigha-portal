import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type QueryResult = { data: any[] | null; error: { message: string } | null };
const clean = (value: unknown) => String(value ?? "—").replaceAll("_", " ");

export default async function ContentCommunicationsCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/content-communications");
    return <main>Access denied</main>;
  }

  const [blogs, memberNotifications, vendorNotifications, operationsNotifications, pushDevices, whatsappPreferences] = (await Promise.all([
    access.admin.from("blog_posts").select("id,title,slug,status,author_id,published_at,created_at,updated_at").order("updated_at", { ascending: false }).limit(1000),
    access.admin.from("notifications").select("id,user_id,title,message,priority,is_read,created_at").order("created_at", { ascending: false }).limit(1000),
    access.admin.from("vendor_notifications").select("id,user_id,type,title,message,priority,is_read,whatsapp_status,whatsapp_sent,whatsapp_sent_at,created_at").order("created_at", { ascending: false }).limit(2000),
    access.admin.from("registration_operations_notifications").select("id,severity,title,status,last_detected_at,created_at").order("last_detected_at", { ascending: false }).limit(500),
    access.admin.from("user_push_tokens").select("id,user_id,platform,device_id,notification_enabled,last_seen_at,created_at,updated_at").order("last_seen_at", { ascending: false }).limit(2000),
    access.admin.from("vendor_whatsapp_preferences").select("user_id,auto_whatsapp_enabled,updated_at").order("updated_at", { ascending: false }).limit(1000),
  ])) as QueryResult[];

  const results = [blogs, memberNotifications, vendorNotifications, operationsNotifications, pushDevices, whatsappPreferences];
  const issues = results.flatMap((result) => result.error ? [result.error.message] : []);
  const blogRows = blogs.data || [];
  const memberRows = memberNotifications.data || [];
  const vendorRows = vendorNotifications.data || [];
  const operationRows = operationsNotifications.data || [];
  const deviceRows = pushDevices.data || [];
  const draftBlogs = blogRows.filter((row) => row.status === "draft");
  const publishedBlogs = blogRows.filter((row) => row.status === "published");
  const unread = [...memberRows, ...vendorRows].filter((row) => row.is_read !== true);
  const activePushDevices = deviceRows.filter((row) => row.notification_enabled === true);
  const whatsappSent = vendorRows.filter((row) => row.whatsapp_sent === true || row.whatsapp_status === "sent");
  const whatsappEnabled = (whatsappPreferences.data || []).filter((row) => row.auto_whatsapp_enabled === true);
  const openOperations = operationRows.filter((row) => row.status !== "resolved");
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Content & Communication Command Center</h1>
        <p>Read-only control over publishing, SEO, in-app alerts, mobile push readiness and WhatsApp delivery evidence.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue, index) => <p key={`${issue}-${index}`}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Blog drafts", draftBlogs.length, "Awaiting publication"],
          ["Published blogs", publishedBlogs.length, "Canonical blog records"],
          ["Unread alerts", unread.length, "Member and vendor notifications"],
          ["Active push devices", activePushDevices.length, "Notification-enabled tokens"],
          ["WhatsApp sent", whatsappSent.length, "Bounded vendor delivery evidence"],
          ["Open operational alerts", openOperations.length, "Registration operations"],
        ].map(([label, value, helper]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 28 }}>{value}</strong><span>{helper}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Editorial publishing</h2>
          {draftBlogs.slice(0, 12).map((post) => <p key={post.id}><strong>{post.title}</strong><br />Draft · updated {new Date(post.updated_at || post.created_at).toLocaleDateString("en-IN")}</p>)}
          {!draftBlogs.length ? <p>No draft blog in the bounded projection.</p> : null}
          <p>Blog authority supports draft and published states; scheduled publication and multi-step approval are not implemented.</p>
          <a href="/admin/blog">Open Blog Review</a>
        </article>

        <article style={panel}>
          <h2>SEO & homepage</h2>
          <p>Technical SEO, sitemap, robots, structured data and regional discovery are code-driven and accessible through the existing SEO Center.</p>
          <p>Homepage content and banners are implemented in application code and runtime projections; no canonical homepage CMS, content version, approval or rollback authority exists.</p>
          <a href="/admin/dashboard/seo">Open SEO Center</a>{" · "}<a href="/">Open Homepage</a>
        </article>

        <article style={panel}>
          <h2>In-app notification health</h2>
          <p><strong>{memberRows.length}</strong> member notifications and <strong>{vendorRows.length}</strong> vendor notifications appear in the bounded projection.</p>
          <p><strong>{openOperations.length}</strong> registration operations alerts remain unresolved.</p>
          <p>Workspace notifications generated by the 3BOS projection are stored in browser localStorage and are not a durable central audit authority.</p>
          <a href="/admin/verification-notifications">Open Registration Alerts</a>
        </article>

        <article style={panel}>
          <h2>Mobile push readiness</h2>
          <p><strong>{activePushDevices.length}</strong> active push devices across {new Set(activePushDevices.map((row) => row.user_id)).size} users.</p>
          <p>{[...new Set(activePushDevices.map((row) => clean(row.platform)))].join(" · ") || "No active platform recorded"}</p>
          <p>Operational Expo push delivery exists, but there is no central campaign scheduler, delivery-receipt ledger, retry workbench or administrator broadcast authority.</p>
        </article>

        <article style={panel}>
          <h2>WhatsApp coverage</h2>
          <p><strong>{whatsappEnabled.length}</strong> vendors have automatic WhatsApp preferences enabled.</p>
          <p>Vendor rank alerts use WhatsApp Cloud API while dispatch updates use Gupshup. These are separate operational send paths, not a unified campaign authority.</p>
          <p>No message will be sent from this center.</p>
        </article>

        <article style={panel}>
          <h2>Communication governance gaps</h2>
          <p><strong>Not centrally implemented:</strong> advertising inventory, campaigns, audience segments, content calendar, scheduling, approval chain, email delivery, SMS delivery, template registry, consent registry, unsubscribe governance, delivery audit and rollback.</p>
          <p>Existing operational routes remain authoritative. A future campaign system must not reuse operational notification tables as a marketing ledger.</p>
        </article>
      </section>
    </main>
  );
}
