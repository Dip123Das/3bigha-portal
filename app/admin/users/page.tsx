import { redirect } from "next/navigation";
import MemberSidebarLiveSearch from "./MemberSidebarLiveSearch";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import styles from "./MemberAdministration.module.css";

export const dynamic = "force-dynamic";
type Params = Record<string,string|string[]|undefined>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||"":v||"";
const clean=(v:unknown)=>String(v||"—").replaceAll("_"," ");

function classify(role:string,requested:string){
  const v=`${role} ${requested}`.toLowerCase();
  if(v.includes("buyer")||v.includes("purchaser"))return"Buyer";
  if(["vendor","manufacturer","dealer","distributor","retailer","wholesaler","trader"].some(x=>v.includes(x)))return"Seller / Vendor";
  if(v.includes("investor"))return"Investor";
  if(v.includes("banker")||v.includes("lender"))return"Banker";
  if(v.includes("blogger")||v.includes("author"))return"Blogger";
  if(["contractor","painter","plumber","electrician","carpenter","mason","worker","professional","service","architect","engineer","surveyor","valuer"].some(x=>v.includes(x)))return"Professional / Service";
  if(v.includes("builder")||v.includes("property"))return"Builder / Property";
  if(["equipment","operator","driver","transport"].some(x=>v.includes(x)))return"Equipment / Transport";
  return"General Member";
}

export default async function AdminUsersPage({searchParams}:{searchParams?:Params}){
  const access=await requireMasterAdmin();
  if("error"in access){if(access.status===401)redirect("/login?next=/admin/users");return <main className={styles.page}>Access denied</main>}
  const{user,admin:supabase}=access;

  const[profilesRes,businessRes,statesRes,districtsRes,authUsersRes]=await Promise.all([
    supabase.from("profiles").select("id,email,full_name,role,requested_role,approval_status,account_status,account_status_reason,created_at,geo_state_id,geo_district_id").order("created_at",{ascending:false}),
    supabase.from("business_profiles").select("user_id,business_name,subscription_plan,subscription_status,subscription_expires_at,geo_state_id,geo_district_id"),
    supabase.from("geo_states").select("id,name").order("name"),
    supabase.from("geo_districts").select("id,state_id,name").order("name"),
    supabase.auth.admin.listUsers({page:1,perPage:1000}),
  ]);
  const loadError=profilesRes.error||businessRes.error||statesRes.error||districtsRes.error||authUsersRes.error;
  if(loadError)return <main className={styles.page}><h1>Member Administration</h1><pre>{loadError.message}</pre></main>;

  const businessByUser=new Map((businessRes.data||[]).map((r:any)=>[r.user_id,r]));
  const authByUser=new Map((authUsersRes.data.users||[]).map((r:any)=>[r.id,r]));
  const stateNames=new Map((statesRes.data||[]).map((r:any)=>[r.id,r.name]));
  const districtNames=new Map((districtsRes.data||[]).map((r:any)=>[r.id,r.name]));

  const all=(profilesRes.data||[]).map((profile:any)=>{
    const business:any=businessByUser.get(profile.id)||{};
    const authUser:any=authByUser.get(profile.id)||{};
    const complimentary=authUser.app_metadata?.complimentary_subscription||null;
    return{profile,business,authUser,complimentary,group:classify(profile.role||"",profile.requested_role||""),stateId:business.geo_state_id||profile.geo_state_id||"",districtId:business.geo_district_id||profile.geo_district_id||""};
  });

  const q=one(searchParams?.q).trim().toLowerCase(),identity=one(searchParams?.identity),role=one(searchParams?.role),approval=one(searchParams?.approval),account=one(searchParams?.account),plan=one(searchParams?.plan),state=one(searchParams?.state);
  const workspaceOptions=["overview","identity","business","geography","verification","subscription","timeline","controls"] as const;
  const requestedWorkspace=one(searchParams?.workspace);
  const activeWorkspace=workspaceOptions.includes(requestedWorkspace as (typeof workspaceOptions)[number])?requestedWorkspace:"overview";
  const filtered=all.filter(({profile,business,complimentary,group,stateId})=>{
    const effectivePlan=complimentary?.active?complimentary.plan:business.subscription_plan||"none";
    const hay=`${profile.full_name||""} ${profile.email||""} ${business.business_name||""} ${profile.role||""} ${profile.requested_role||""}`.toLowerCase();
    return(!q||hay.includes(q))&&(!identity||group===identity)&&(!role||profile.role===role||profile.requested_role===role)&&(!approval||profile.approval_status===approval)&&(!account||(profile.account_status||"active")===account)&&(!plan||effectivePlan===plan)&&(!state||stateId===state);
  });
  const selectedId=one(searchParams?.member)||filtered[0]?.profile.id||"";
  const selected=filtered.find(({profile})=>profile.id===selectedId)||filtered[0];
  const roles=Array.from(new Set(all.flatMap(({profile})=>[profile.role,profile.requested_role]).filter(Boolean))).sort();

  const active=all.filter(({profile})=>(profile.account_status||"active")==="active").length;
  const pending=all.filter(({profile})=>profile.approval_status==="pending").length;
  const restricted=all.length-active;
  const complimentaryCount=all.filter(({complimentary})=>complimentary?.active).length;
  const highest=all.filter(({business,complimentary})=>["gold_vendor","platinum_vendor"].includes(complimentary?.active?complimentary.plan:business.subscription_plan||"")).length;

  const success=one(searchParams?.success),error=one(searchParams?.error);
  const preserve=new URLSearchParams();
  for(const key of["q","identity","role","approval","account","plan","state"]){const value=one(searchParams?.[key]);if(value)preserve.set(key,value)}
  const workspaceHref=(workspace:string,memberId:string)=>{const params=new URLSearchParams(preserve);params.set("member",memberId);if(workspace!=="overview")params.set("workspace",workspace);return `/admin/users?${params.toString()}`};

  return <main className={styles.page}>
    <header className={styles.header}><div><h1>Member Administration</h1><p>Founder control centre for every registered member and identity.</p></div><div className={styles.headerActions}><a href="/admin/verification-reviews">Business proof reviews</a><a href="/admin/dashboard">Admin dashboard</a></div></header>
    {success?<div className={styles.notice}>{success}</div>:null}{error?<div className={styles.error}>{error}</div>:null}
        {/* A-3.7 — Founder Operating Centre 2.0 */}
    <section className={styles.summary}>
      <a href="/admin/users"><span>Total members</span><strong>{all.length}</strong><small>Show everyone</small></a>
      <a href="/admin/users?account=active"><span>Active</span><strong>{active}</strong><small>Filter active accounts</small></a>
      <a href="/admin/users?approval=pending"><span>Pending identity</span><strong>{pending}</strong><small>Needs founder review</small></a>
      <a href="/admin/users?account=deactivated"><span>Restricted</span><strong>{restricted}</strong><small>Review restricted accounts</small></a>
      <a href="/admin/users"><span>Complimentary</span><strong>{complimentaryCount}</strong><small>Review granted access</small></a>
      <a href="/admin/users?plan=platinum_vendor"><span>Gold / Platinum</span><strong>{highest}</strong><small>Highest current plans</small></a>
    </section>
    <form method="get" className={styles.filters}>{activeWorkspace!=="overview"?<input type="hidden" name="workspace" value={activeWorkspace}/>:null}
      <input className={styles.field} name="q" defaultValue={one(searchParams?.q)} placeholder="Search name, email, business or role"/>
      <select className={styles.field} name="identity" defaultValue={identity}><option value="">All member groups</option>{["Buyer","Seller / Vendor","Investor","Banker","Blogger","Professional / Service","Builder / Property","Equipment / Transport","General Member"].map(v=><option key={v}>{v}</option>)}</select>
      <select className={styles.field} name="role" defaultValue={role}><option value="">All exact roles</option>{roles.map(v=><option key={v} value={v}>{clean(v)}</option>)}</select>
      <select className={styles.field} name="approval" defaultValue={approval}><option value="">All approvals</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
      <select className={styles.field} name="account" defaultValue={account}><option value="">All account states</option><option value="active">Active</option><option value="deactivated">Suspended</option><option value="re_registration_required">Re-registration required</option><option value="permanently_blocked">Permanently blocked</option></select>
      <select className={styles.field} name="plan" defaultValue={plan}><option value="">All plans</option><option value="none">No plan</option><option value="free">Free</option><option value="basic_vendor">Basic</option><option value="silver_vendor">Silver</option><option value="gold_vendor">Gold</option><option value="platinum_vendor">Platinum</option><option value="enterprise">Legacy Enterprise</option><option value="lifetime">Legacy Lifetime</option></select>
      <select className={styles.field} name="state" defaultValue={state}><option value="">All states</option>{(statesRes.data||[]).map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button className={styles.filterButton}>Apply</button><a className={styles.clearLink} href="/admin/users">Clear</a>
    </form>

    <section className={styles.workspace}>
      <aside className={styles.memberList}>
        {/* A-3.8 — Member sidebar search */}
        {/* A-3.9 — Live member sidebar search */}
        <div className={styles.memberSearch}>
          <MemberSidebarLiveSearch />
        </div>
        <div className={styles.listHeader} data-member-search-count>{filtered.length} matching members</div>
        {filtered.map(({profile,business,group,complimentary,stateId,districtId})=>{const params=new URLSearchParams(preserve);params.set("member",profile.id);if(activeWorkspace!=="overview")params.set("workspace",activeWorkspace);const selectedNow=selected?.profile.id===profile.id;const planName=complimentary?.active?complimentary.plan:business.subscription_plan||"free";const accountState=profile.account_status||"active";const stateClass=accountState!=="active"?styles.memberStateBlocked:profile.approval_status==="pending"?styles.memberStatePending:styles.memberStateActive;return <a key={profile.id} href={`/admin/users?${params.toString()}`} data-member-search-item data-member-search-text={`${profile.full_name||""} ${profile.email||""} ${business.business_name||""} ${profile.role||""} ${profile.requested_role||""} ${group} ${districtNames.get(districtId)||""} ${stateNames.get(stateId)||""}`} className={`${styles.memberLink} ${selectedNow?styles.memberLinkActive:""}`}><span className={styles.avatar}>{(profile.full_name||business.business_name||"M").charAt(0).toUpperCase()}</span><span className={styles.memberCopy}><strong><i className={`${styles.memberState} ${stateClass}`}/>{profile.full_name||business.business_name||"Unnamed member"}</strong><small>{business.business_name||profile.email||"No business or email"}</small><small>{districtNames.get(districtId)||stateNames.get(stateId)||"Location not recorded"}</small></span><span className={styles.listMeta}><span>{group}</span><small>{clean(planName)}</small></span></a>})}
      </aside>

      {selected?(()=>{
        const{profile,business,authUser,complimentary,group,stateId,districtId}=selected;
        const accountStatus=profile.account_status||"active",isActive=accountStatus==="active",isPending=profile.approval_status==="pending";
        const effectivePlan=complimentary?.active?complimentary.plan:business.subscription_plan||"none";
        const effectiveStatus=complimentary?.active?"complimentary":business.subscription_status||"not paid";
        const checks=[Boolean(profile.full_name),Boolean(profile.email),Boolean(profile.role&&profile.role!=="unresolved"),Boolean(profile.approval_status==="approved"),Boolean(stateId),Boolean(districtId),Boolean(business.business_name),Boolean(effectivePlan&&effectivePlan!=="none")];
        const lastLogin=authUser?.last_sign_in_at||null;
        const emailVerified=Boolean(authUser?.email_confirmed_at);
        const phoneVerified=Boolean(authUser?.phone_confirmed_at);
        const authCreated=authUser?.created_at||profile.created_at||null;
        const readinessWeights=[
          [Boolean(profile.full_name),10],
          [Boolean(profile.email),10],
          [Boolean(profile.role&&profile.role!=="unresolved"),15],
          [profile.approval_status==="approved",20],
          [Boolean(stateId),8],
          [Boolean(districtId),7],
          [Boolean(business.business_name),15],
          [Boolean(effectivePlan&&effectivePlan!=="none"),5],
          [emailVerified,5],
          [phoneVerified,5],
        ];
        const readiness=readinessWeights.reduce((sum,[complete,weight])=>sum+(complete?Number(weight):0),0);
        const readinessItems=[
          ["Profile name",Boolean(profile.full_name),10],
          ["Email",Boolean(profile.email),10],
          ["Declared identity",Boolean(profile.role&&profile.role!=="unresolved"),15],
          ["Identity approved",profile.approval_status==="approved",20],
          ["State",Boolean(stateId),8],
          ["District",Boolean(districtId),7],
          ["Business name",Boolean(business.business_name),15],
          ["Subscription",Boolean(effectivePlan&&effectivePlan!=="none"),5],
          ["Email verified",emailVerified,5],
          ["Phone verified",phoneVerified,5],
        ];
        return <section className={styles.detail} data-workspace={activeWorkspace}>
          <header className={styles.detailHeader}><div className={styles.detailIdentity}><span className={styles.detailAvatar}>{(profile.full_name||business.business_name||"M").charAt(0).toUpperCase()}</span><div><h2>{profile.full_name||business.business_name||"Unnamed member"}</h2><p>{profile.email||"No email"} · {business.business_name||"No business name"} · {districtNames.get(districtId)||stateNames.get(stateId)||"Location not recorded"} · Joined {profile.created_at?new Date(profile.created_at).toLocaleDateString("en-IN"):"date unavailable"}</p><div className={styles.chips}><span className={styles.chip}>{group}</span><span className={styles.chip}>{clean(profile.role||"unresolved")}</span>{profile.requested_role?<span className={styles.chip}>Requested: {clean(profile.requested_role)}</span>:null}<span className={!isActive?styles.statusBlocked:isPending?styles.statusPending:styles.statusActive}>{!isActive?clean(accountStatus):isPending?"Identity pending":"Active"}</span></div></div></div><div className={styles.scoreCard}><span>Account readiness</span><strong>{readiness}%</strong><div className={styles.progress}><i style={{width:`${readiness}%`}}/></div><small>{profile.approval_status==="approved"?"Identity approved":"Identity needs review"} · {phoneVerified?"Phone verified":"Phone missing"}</small></div></header>
          {/* A-3.3 — Founder member operating centre */}
          {/* A-3.6 — Member navigation and workspace activation */}
          <nav className={styles.quickActions} aria-label="Founder quick actions">
            <a href={workspaceHref("controls",profile.id)} aria-current={activeWorkspace==="controls"?"page":undefined}>Manage account</a>
            <a href={workspaceHref("subscription",profile.id)} aria-current={activeWorkspace==="subscription"?"page":undefined}>Grant plan</a>
            <a href="/admin/verification-reviews">Review proofs</a>
            {profile.email?<a href={"mailto:"+profile.email}>Email member</a>:null}
            <a href="/admin/dashboard">Admin dashboard</a>
          </nav>
          {/* A-3.4 — Member 360 operating centre foundation */}
          {/* A-3.5 — Founder member workspace navigation */}
          <section className={styles.operatingCentre}>
            <div className={styles.operatingCentreHeader}>
              <div><span>Member 360°</span><h3>Founder member workspace</h3></div>
              <small>The selected workspace opens immediately below. Overview remains the complete default view.</small>
            </div>
            <nav className={styles.workspaceTabs} aria-label="Member operating workspaces">
              {[
                ["overview","Overview","Complete recorded member summary"],
                ["identity","Identity","Declared and requested identities"],
                ["business","Business","Account and business registration"],
                ["geography","LGD Geography","Recorded administrative location"],
                ["verification","Verification","Login, contact and readiness records"],
                ["subscription","Subscription","Plan, grant and expiry details"],
                ["timeline","Timeline","Recorded account milestones"],
                ["controls","Founder Controls","Approval, restriction and complimentary access"],
              ].map(([key,label,description])=><a key={key} href={workspaceHref(key,profile.id)} className={activeWorkspace===key?styles.workspaceTabActive:styles.workspaceTab} aria-current={activeWorkspace===key?"page":undefined} data-member-workspace={key}><strong>{label}</strong><span>{description}</span></a>)}
            </nav>
            <div className={styles.externalTools}>
              <a href="/admin/verification-reviews">Business proof reviews</a>
              <a href="/admin/dashboard/vendor-control">Marketplace administration</a>
              <a href="/admin/dashboard/support">Support centre</a>
              <a href={workspaceHref(activeWorkspace,profile.id)} data-member-action="refresh">Refresh selected workspace</a>
            </div>
          </section>
          <div className={styles.detailGrid}>
            <article id="identity-panel" data-workspace-panel="identity" className={`${styles.panel} ${styles.identityWorkspace}`}><h3>Identity</h3><div className={styles.kv}><span>Primary role</span><strong>{clean(profile.role)}</strong></div><div className={styles.kv}><span>Requested role</span><strong>{clean(profile.requested_role)}</strong></div><div className={styles.kv}><span>Approval</span><strong>{clean(profile.approval_status)}</strong></div><div className={styles.kv}><span>Member group</span><strong>{group}</strong></div></article>
            <article id="business-panel" data-workspace-panel="business" className={`${styles.panel} ${styles.businessWorkspace}`}><h3>Account & business</h3><div className={styles.kv}><span>Status</span><strong>{clean(accountStatus)}</strong></div><div className={styles.kv}><span>Status note</span><strong>{profile.account_status_reason||"No note"}</strong></div><div className={styles.kv}><span>Joined</span><strong>{profile.created_at?new Date(profile.created_at).toLocaleDateString("en-IN"):"—"}</strong></div></article>
            <article data-workspace-panel="subscription" className={`${styles.panel} ${styles.subscriptionWorkspace}`}><h3>Subscription</h3><div className={styles.kv}><span>Plan</span><strong>{clean(effectivePlan)}</strong></div><div className={styles.kv}><span>Status</span><strong>{clean(effectiveStatus)}</strong></div><div className={styles.kv}><span>Expiry</span><strong>{complimentary?.active?(complimentary.expires_at?new Date(complimentary.expires_at).toLocaleDateString("en-IN"):"Never"):business.subscription_expires_at?new Date(business.subscription_expires_at).toLocaleDateString("en-IN"):"Not recorded"}</strong></div><div className={styles.kv}><span>Granted by</span><strong>{complimentary?.active?complimentary.granted_by||"Admin ID not recorded":"Payment system / not recorded"}</strong></div><div className={styles.kv}><span>Grant reason</span><strong>{complimentary?.active?complimentary.reason||"Not recorded":"Not complimentary"}</strong></div></article>
            <article id="location-panel" data-workspace-panel="geography" className={`${styles.panel} ${styles.geographyWorkspace}`}><h3>LGD Geography</h3><div className={styles.kv}><span>Country</span><strong>India</strong></div><div className={styles.kv}><span>State</span><strong>{stateNames.get(stateId)||"Not recorded"}</strong></div><div className={styles.kv}><span>District</span><strong>{districtNames.get(districtId)||"Not recorded"}</strong></div></article>
            <article data-workspace-panel="verification" className={`${styles.panel} ${styles.verificationWorkspace}`}><h3>Login & verification</h3><div className={styles.kv}><span>Email verified</span><strong>{emailVerified?"Yes":"No"}</strong></div><div className={styles.kv}><span>Phone verified</span><strong>{phoneVerified?"Yes":"No"}</strong></div><div className={styles.kv}><span>Last login</span><strong>{lastLogin?new Date(lastLogin).toLocaleString("en-IN"):"No login recorded"}</strong></div><div className={styles.kv}><span>Auth account created</span><strong>{authCreated?new Date(authCreated).toLocaleString("en-IN"):"Not recorded"}</strong></div></article>
            <article data-workspace-panel="verification" className={`${styles.panel} ${styles.panelWide} ${styles.verificationWorkspace}`}><h3>Readiness breakdown</h3><div className={styles.readinessGrid}>{readinessItems.map(([label,complete,weight])=><div key={String(label)} className={complete?styles.readinessComplete:styles.readinessMissing}><span>{complete?"✓":"!"}</span><strong>{label}</strong><small>{complete?`Recorded · ${weight}%`:`Missing · ${weight}%`}</small></div>)}</div></article>
            <article data-workspace-panel="timeline" className={`${styles.panel} ${styles.panelWide} ${styles.timelineWorkspace}`}><h3>Member timeline</h3><div className={styles.timeline}><div><i/><span>Account created {profile.created_at?new Date(profile.created_at).toLocaleString("en-IN"):"date unavailable"}</span></div><div><i/><span>Identity status: {clean(profile.approval_status)}</span></div>{complimentary?.active?<div><i/><span>Complimentary {clean(complimentary.plan)} granted {complimentary.granted_at?new Date(complimentary.granted_at).toLocaleString("en-IN"):""} · Reason: {complimentary.reason||"Not recorded"}</span></div>:null}</div></article>
            <article id="founder-controls" data-workspace-panel="controls" className={`${styles.panel} ${styles.panelFull} ${styles.controlsWorkspace}`}><h3>Founder controls</h3><div className={styles.actions}>
              {isPending?<div className={styles.inlineForm}><form action="/api/admin/approve-user" method="post"><input type="hidden" name="user_id" value={profile.id}/><input type="hidden" name="role" value={profile.requested_role||""}/><button className={styles.approve}>Approve identity</button></form><form action="/api/admin/reject-user" method="post" className={styles.inlineForm}><input type="hidden" name="user_id" value={profile.id}/><input name="reason" placeholder="Rejection reason" required/><button className={styles.reject}>Reject</button></form></div>:null}
              {profile.id!==user.id&&profile.role!=="master_admin"?<form action="/api/admin/account-status" method="post" className={styles.inlineForm}><input type="hidden" name="user_id" value={profile.id}/><input type="hidden" name="action" value={isActive?"deactivate":"activate"}/>{isActive?<><select name="restriction_mode" defaultValue="suspend"><option value="suspend">Temporary suspension</option><option value="re_register">Require re-registration</option><option value="permanent">Permanent block</option></select><select name="reason_code" defaultValue="other"><option value="policy_violation">Policy violation</option><option value="suspicious_activity">Suspicious activity</option><option value="verification_failed">Verification failed</option><option value="payment_issue">Payment issue</option><option value="duplicate_account">Duplicate account</option><option value="other">Other</option></select><input name="custom_reason" placeholder="Internal reason" required/></>:<input name="reason" placeholder="Reactivation note"/>}<button className={isActive?styles.danger:styles.approve}>{isActive?"Restrict":"Reactivate"}</button></form>:null}
              {profile.id!==user.id&&profile.role!=="master_admin"?<div id="subscription-control" className={styles.grantBox}><strong>Grant complimentary subscription</strong><form action="/api/admin/member-subscription" method="post" className={styles.inlineForm}><input type="hidden" name="user_id" value={profile.id}/>{/* A-3.10 — Canonical subscription plans and safe admin return */}{/* A-3.11 — Canonical 3Bigha subscription catalogue */}<select name="plan" defaultValue="platinum_vendor" aria-label="Complimentary subscription plan"><option value="basic_vendor">Basic — ₹299/month</option><option value="silver_vendor">Silver — ₹499/month</option><option value="gold_vendor">Gold — ₹999/month</option><option value="platinum_vendor">Platinum — ₹1,999/month</option></select><input name="reason" placeholder="Internal reason" required/><input name="expires_on" type="date"/><button className={styles.approve}>Grant without payment</button></form></div>:null}
            </div></article>
          </div>
        </section>
      })():<div className={styles.empty}>No members match the selected filters.</div>}
    </section>
  </main>;
}
