export type PwdBoqMappedItem = {
  category:
    | "earthwork"
    | "concrete"
    | "rcc"
    | "masonry"
    | "plaster"
    | "flooring"
    | "painting"
    | "doors_windows"
    | "electrical"
    | "plumbing";

  pwdCode: string;
  pwdSection: string;
  pwdItemName: string;
  unit: string;
  source: "WB_PWD_BUILDING_2015" | "WB_PWD_SANITARY_2017" | "WB_PWD_ELECTRICAL_2017";
  priceTodayKeys: string[];
  note: string;
};

export const PWD_BOQ_ITEM_MASTER: PwdBoqMappedItem[] = [
  {
    category: "earthwork",
    pwdCode: "PWD-BLDG-EARTHWORK-BASE",
    pwdSection: "Earthwork",
    pwdItemName: "Earthwork in excavation for foundation and trenches",
    unit: "cum",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["labour", "earthwork"],
    note: "Mapped to building works SOR earthwork chapter. Exact sub-item to be selected after drawing depth and soil condition.",
  },
  {
    category: "concrete",
    pwdCode: "PWD-BLDG-PCC-BASE",
    pwdSection: "Plain Cement Concrete",
    pwdItemName: "PCC in foundation and plinth",
    unit: "cum",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["cement", "sand", "aggregate"],
    note: "Mapped to PCC/concrete base items.",
  },
  {
    category: "rcc",
    pwdCode: "PWD-BLDG-RCC-BASE",
    pwdSection: "RCC",
    pwdItemName: "Reinforced cement concrete structural work",
    unit: "cum",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["cement", "tmt", "sand", "aggregate"],
    note: "Exact M20/M25/M30 item depends on structural design and SOR item extraction.",
  },
  {
    category: "masonry",
    pwdCode: "PWD-BLDG-BRICKWORK-BASE",
    pwdSection: "Brickwork",
    pwdItemName: "Brickwork / blockwork in walling",
    unit: "cum",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["bricks", "cement", "sand"],
    note: "Wall thickness and brick/block type must be finalized from drawings.",
  },
  {
    category: "plaster",
    pwdCode: "PWD-BLDG-PLASTER-BASE",
    pwdSection: "Plaster",
    pwdItemName: "Internal and external cement plaster",
    unit: "sqm",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["cement", "sand"],
    note: "Thickness and finish vary by wall type and location.",
  },
  {
    category: "flooring",
    pwdCode: "PWD-BLDG-FLOORING-BASE",
    pwdSection: "Flooring",
    pwdItemName: "Flooring / tile work",
    unit: "sqm",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["tiles", "cement", "sand"],
    note: "Tile grade and size should be selected before final costing.",
  },
  {
    category: "painting",
    pwdCode: "PWD-BLDG-PAINTING-BASE",
    pwdSection: "Painting",
    pwdItemName: "Painting and finishing works",
    unit: "sqm",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["paint", "primer", "putty"],
    note: "Paint system depends on internal/external surface and brand.",
  },
  {
    category: "doors_windows",
    pwdCode: "PWD-BLDG-DOOR-WINDOW-BASE",
    pwdSection: "Doors & Windows",
    pwdItemName: "Door, window and opening works",
    unit: "sqm",
    source: "WB_PWD_BUILDING_2015",
    priceTodayKeys: ["door", "window", "aluminium", "glass"],
    note: "Exact rate depends on material: wood, steel, aluminium, UPVC, glass.",
  },
  {
    category: "electrical",
    pwdCode: "PWD-ELEC-WIRING-POINT-2017",
    pwdSection: "Electrical",
    pwdItemName: "Internal electrical wiring point and fittings",
    unit: "point",
    source: "WB_PWD_ELECTRICAL_2017",
    priceTodayKeys: ["wire", "switch", "mcb", "conduit"],
    note: "Mapped to WB PWD Electrical Works Volume-I wiring, DB and fitting sections.",
  },
  {
    category: "plumbing",
    pwdCode: "PWD-SAN-PLUMBING-POINT-2017",
    pwdSection: "Sanitary & Plumbing",
    pwdItemName: "Water supply, sanitary and drainage point",
    unit: "point",
    source: "WB_PWD_SANITARY_2017",
    priceTodayKeys: ["pipe", "cpvc", "gi pipe", "sanitary"],
    note: "Mapped to WB PWD Sanitary & Plumbing Volume-II pipe, fittings and sanitary sections.",
  },
];

export function findPwdBoqMapping(category: string) {
  return PWD_BOQ_ITEM_MASTER.find((item) => item.category === category);
}
