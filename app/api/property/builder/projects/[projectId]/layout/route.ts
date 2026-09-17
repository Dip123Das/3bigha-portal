import { NextRequest,NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean=(v:unknown)=>String(v??"").trim();
const fail=(message:string,status:number,code:string)=>NextResponse.json({ok:false,error:{message,code}},{status});
async function owned(projectId:string){
 const session=getSupabaseServerClient(await cookies());const {data:{user}}=await session.auth.getUser();
 if(!user)return {response:fail("Authentication required.",401,"UNAUTHORIZED")};
 if(!UUID.test(projectId))return {response:fail("Invalid project ID.",400,"PROJECT_ID_INVALID")};
 const admin=getSupabaseAdmin();const project=await admin.from("builder_projects").select("id,name,slug,builder_profiles!inner(owner_user_id)").eq("id",projectId).eq("builder_profiles.owner_user_id",user.id).maybeSingle();
 if(project.error||!project.data)return {response:fail("Project not found or you do not own it.",403,"PROJECT_FORBIDDEN")};
 return {admin,user,project:project.data};
}
export async function GET(_r:NextRequest,{params}:{params:{projectId:string}}){
 const context=await owned(clean(params.projectId));if(context.response)return context.response;const {admin,project}=context;
 const [units,layouts]=await Promise.all([
  admin.from("builder_inventory_units").select("id,unit_code,title,unit_kind,status,tower,block,floor_no").eq("project_id",project.id).order("unit_code"),
  admin.from("property_project_layouts").select("id,version,name,status,canvas_width,canvas_height,published_at,updated_at").eq("project_id",project.id).order("version",{ascending:false})
 ]);
 if(units.error||layouts.error)return fail("Layout workspace could not be loaded.",500,"LAYOUT_LOOKUP_FAILED");
 const layoutRows=layouts.data??[];const ids=layoutRows.map(x=>x.id);let placements:any[]=[];
 if(ids.length){const result=await admin.from("property_project_layout_units").select("layout_id,unit_id,position_x,position_y,width,height,rotation,label_override").in("layout_id",ids);if(result.error)return fail("Layout placements could not be loaded.",500,"PLACEMENTS_LOOKUP_FAILED");placements=result.data??[];}
 return NextResponse.json({ok:true,data:{project,units:units.data??[],layouts:layoutRows.map(layout=>({...layout,placements:placements.filter(p=>p.layout_id===layout.id)}))}},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest,{params}:{params:{projectId:string}}){
 const projectId=clean(params.projectId),context=await owned(projectId);if(context.response)return context.response;const {admin,user}=context;const body=await request.json().catch(()=>null);
 const width=Number(body?.canvasWidth),height=Number(body?.canvasHeight),placements=Array.isArray(body?.placements)?body.placements:[];
 if(!Number.isInteger(width)||width<320||width>4000||!Number.isInteger(height)||height<240||height>4000)return fail("Canvas dimensions are invalid.",400,"CANVAS_INVALID");
 if(placements.some((p:any)=>!UUID.test(clean(p?.unitId))||![p?.x,p?.y,p?.width,p?.height,p?.rotation??0].every(Number.isFinite)))return fail("One or more unit placements are invalid.",400,"PLACEMENT_INVALID");
 if(new Set(placements.map((p:any)=>clean(p.unitId))).size!==placements.length)return fail("A unit can appear only once in a layout.",400,"PLACEMENT_DUPLICATE");
 const result=await admin.rpc("save_property_project_layout_authoritative",{target_owner_user_id:user.id,target_project_id:projectId,target_layout_id:UUID.test(clean(body?.layoutId))?clean(body.layoutId):null,target_name:clean(body?.name)||"Main project layout",target_canvas_width:width,target_canvas_height:height,target_placements:placements});
 if(result.error)return fail(result.error.message,400,"LAYOUT_SAVE_FAILED");return NextResponse.json({ok:true,data:result.data},{headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(request:NextRequest,{params}:{params:{projectId:string}}){
 const projectId=clean(params.projectId),context=await owned(projectId);if(context.response)return context.response;const {admin,user}=context;const body=await request.json().catch(()=>null),layoutId=clean(body?.layoutId);
 if(!UUID.test(layoutId))return fail("A valid draft layout is required.",400,"LAYOUT_ID_INVALID");
 const result=await admin.rpc("publish_property_project_layout_authoritative",{target_owner_user_id:user.id,target_project_id:projectId,target_layout_id:layoutId});
 if(result.error)return fail(result.error.message,400,"LAYOUT_PUBLISH_FAILED");return NextResponse.json({ok:true,data:result.data},{headers:{"Cache-Control":"no-store"}});
}
