import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
export const dynamic="force-dynamic"; export const runtime="nodejs";
const EVENTS=new Set(["login_success","logout","session_refresh","auth_method_changed","security_notice"]);
const METHODS=new Set(["google","email_magic_link","phone_otp","unknown"]);
const PLATFORMS=new Set(["web","android","ios"]);
export async function POST(request:Request){
 try{
  const admin=getSupabaseAdmin(),authorization=request.headers.get("authorization")||"",bearer=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
  const authResult=bearer?await admin.auth.getUser(bearer):await getSupabaseServerClient(await cookies()).auth.getUser();
  const authenticatedUser=authResult.data.user;
  if(authResult.error||!authenticatedUser)return NextResponse.json({error:"Authentication required."},{status:401,headers:{"Cache-Control":"no-store"}});
  const body=await request.json().catch(()=>({})),eventType=String(body?.eventType||""),authMethod=String(body?.authMethod||"unknown"),clientPlatform=String(body?.clientPlatform||"web");
  if(!EVENTS.has(eventType)||!METHODS.has(authMethod)||!PLATFORMS.has(clientPlatform))return NextResponse.json({error:"Unsupported security event."},{status:400,headers:{"Cache-Control":"no-store"}});
  const{error}=await admin.rpc("record_authenticated_security_event",{p_user_id:authenticatedUser.id,p_event_type:eventType,p_auth_method:authMethod,p_client_platform:clientPlatform,p_user_agent:(request.headers.get("user-agent")||"").slice(0,500)||null,p_metadata:{}});
  if(error){console.error("SECURITY_EVENT_RECORD_FAILED",error.message);return NextResponse.json({error:"Could not record security event."},{status:500,headers:{"Cache-Control":"no-store"}})}
  return NextResponse.json({recorded:true},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("SECURITY_EVENT_ROUTE_FAILED",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Could not record security event."},{status:500,headers:{"Cache-Control":"no-store"}})}
}
