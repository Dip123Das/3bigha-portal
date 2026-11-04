import TurnkeyPackageDetailsClient from "./TurnkeyPackageDetailsClient";

export default async function TurnkeyPackageDetailsPage({
  params,
}: {
  params: Promise<{ packageID: string }>;
}) {
  const { packageID } = await params;
  return <TurnkeyPackageDetailsClient packageID={packageID} />;
}
