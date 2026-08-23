export type TrustedPublicationModule =
  | "property"
  | "builder_project"
  | "materials"
  | "rentals"
  | "services";

export type TrustedPublicationResult = {
  ok: boolean;
  requiredCaptures: number;
  completedCaptures: number;
  message: string | null;
};

const REQUIRED_CAPTURES: Record<
  TrustedPublicationModule,
  number
> = {
  property: 2,
  builder_project: 2,
  materials: 1,
  rentals: 1,
  services: 1,
};

export async function validateTrustedPublication(
  module: TrustedPublicationModule,
  completedCaptures: number,
): Promise<TrustedPublicationResult> {
  const requiredCaptures =
    REQUIRED_CAPTURES[module];

  if (completedCaptures < requiredCaptures) {
    return {
      ok: false,
      requiredCaptures,
      completedCaptures,
      message:
        `Complete ${requiredCaptures} mandatory live GPS capture(s) before publishing.`,
    };
  }

  return {
    ok: true,
    requiredCaptures,
    completedCaptures,
    message: null,
  };
}