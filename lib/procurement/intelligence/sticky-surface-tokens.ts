export type StickySurfaceLevel =
  | "primary"
  | "secondary"
  | "mobile"
  | "none";

export const stickySurfaceTokens: Record<StickySurfaceLevel, {
  className: string;
  offset: string;
  zIndex: string;
}> = {
  primary: {
    className: "sticky top-2 z-30",
    offset: "top-2",
    zIndex: "z-30",
  },
  secondary: {
    className: "sticky top-16 z-20",
    offset: "top-16",
    zIndex: "z-20",
  },
  mobile: {
    className: "sticky top-1 z-30",
    offset: "top-1",
    zIndex: "z-30",
  },
  none: {
    className: "",
    offset: "",
    zIndex: "",
  },
};

export function getStickySurfaceTokens(level: StickySurfaceLevel = "primary") {
  return stickySurfaceTokens[level] || stickySurfaceTokens.primary;
}
