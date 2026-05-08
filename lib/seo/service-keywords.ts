export const SERVICE_KEYWORDS = [
  "contractor", "building contractor", "civil contractor",
  "house construction contractor", "turnkey contractor",
  "rajmistri", "mistri", "mason", "masonry work",
  "labour", "labour contractor", "construction labour",
  "architect", "engineer", "civil engineer", "house plan",
  "building planner", "3d elevation", "interior designer",
  "plumber", "tep kol mistri", "pipe mistri", "sanitary mistri",
  "electrician", "electric mistri", "wiring mistri",
  "painter", "paint mistri", "wall putty mistri",
  "tiles mistri", "marble mistri", "granite fitting",
  "carpenter", "kath mistri", "door fitting", "window fitting",
  "aluminium mistri", "grill mistri", "welder", "fabricator",
  "gate maker", "shutter mistri", "false ceiling mistri",
  "pop mistri", "gypsum ceiling", "pvc ceiling",
  "waterproofing contractor", "roof repair", "roof casting",
  "centering mistri", "shuttering mistri", "rcc work",
  "boundary wall contractor", "renovation contractor",
  "home repair", "bathroom renovation", "kitchen renovation",
  "modular kitchen service", "chimney installation", "chimney repair",
  "borewell service", "submersible repair", "pump mechanic",
  "solar installer", "cctv installation", "lift installation",
  "land surveyor", "mutation consultant", "property legal consultant",
  "vastu consultant", "piling contractor", "soil testing",
];

export function getServiceKeywords(area: string) {
  const cleanArea = area.trim();

  return SERVICE_KEYWORDS.flatMap((word) => [
    `${word} in ${cleanArea}`,
    `${word} near me in ${cleanArea}`,
    `${word} service in ${cleanArea}`,
    `${word} contact number in ${cleanArea}`,
    `${word} price in ${cleanArea}`,
    `${word} rate in ${cleanArea}`,
    `${word} repair in ${cleanArea}`,
    `${word} contractor in ${cleanArea}`,
    `best ${word} in ${cleanArea}`,
    `hire ${word} in ${cleanArea}`,
    `book ${word} in ${cleanArea}`,
    `post requirement for ${word} in ${cleanArea}`,
  ]);
}