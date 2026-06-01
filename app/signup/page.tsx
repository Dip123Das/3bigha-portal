import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SignupRedirectPage() {
  redirect("/auth/register-role");
}
