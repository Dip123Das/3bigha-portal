import type { SeoModule } from "@/lib/geo/india-geo";

export type SeoCategory = {
  slug: string;
  label: string;
  aliases: string[];
};

export const seoCategoryMap: Record<SeoModule, SeoCategory[]> = {
  property: [
    { slug: "land", label: "Land", aliases: ["jomi", "jamin", "plot", "bastu-jomi"] },
    { slug: "residential-plot", label: "Residential Plot", aliases: ["bastu land", "house plot"] },
    { slug: "commercial-land", label: "Commercial Land", aliases: ["business land", "market land"] },
    { slug: "flat", label: "Flat", aliases: ["apartment", "2bhk", "3bhk"] },
    { slug: "house", label: "House", aliases: ["bari", "home", "duplex"] },
    { slug: "shop", label: "Shop", aliases: ["dokan", "commercial shop"] },
    { slug: "godown", label: "Godown", aliases: ["warehouse", "storage"] },
  ],

  materials: [
    { slug: "cement", label: "Cement", aliases: ["opc cement", "ppc cement", "cement dealer"] },
    { slug: "rod", label: "Rod / TMT Bar", aliases: ["tmt", "saria", "sariya", "steel rod"] },
    { slug: "balu", label: "Sand / Balu", aliases: ["sand", "river sand", "construction sand"] },
    { slug: "pathor", label: "Stone / Pathor", aliases: ["stone chips", "gitti", "aggregate", "chips"] },
    { slug: "brick", label: "Brick", aliases: ["it", "eet", "red brick", "fly ash brick"] },
    { slug: "tiles", label: "Tiles", aliases: ["floor tiles", "wall tiles", "bathroom tiles"] },
    { slug: "marble", label: "Marble", aliases: ["granite", "stone slab"] },
    { slug: "door", label: "Door / Dorja", aliases: ["dorja", "kather dorja", "wooden door"] },
    { slug: "window", label: "Window / Janla", aliases: ["janla", "aluminium janla", "sliding window"] },
    { slug: "grill", label: "Grill", aliases: ["iron grill", "gate", "railing"] },
    { slug: "paint", label: "Paint", aliases: ["wall paint", "primer", "putty"] },
    { slug: "plumbing", label: "Plumbing Materials", aliases: ["pipe", "tap", "tep kol", "cpvc pipe"] },
    { slug: "sanitary", label: "Sanitary", aliases: ["commode", "basin", "bathroom fitting"] },
    { slug: "electrical", label: "Electrical Materials", aliases: ["wire", "electric tar", "switch", "mcb"] },
    { slug: "roofing", label: "Roofing Materials", aliases: ["tin", "roofing sheet", "tata tin"] },
    { slug: "false-ceiling", label: "False Ceiling", aliases: ["gypsum board", "pop", "pvc ceiling"] },
    { slug: "glass", label: "Glass", aliases: ["toughened glass", "mirror", "window glass"] },
    { slug: "chimney", label: "Kitchen Chimney", aliases: ["chimney", "kitchen chimney", "hob"] },
    { slug: "kitchen-appliances", label: "Kitchen Appliances", aliases: ["gas oven", "cooktop", "modular kitchen"] },
    { slug: "water-pump", label: "Water Pump", aliases: ["submersible pump", "motor pump", "pump"] },
  ],

  services: [
    { slug: "contractor", label: "Contractor", aliases: ["building contractor", "civil contractor"] },
    { slug: "rajmistri", label: "Rajmistri / Mason", aliases: ["mason", "mistri", "masonry"] },
    { slug: "plumber", label: "Plumber", aliases: ["tep kol mistri", "pipe mistri"] },
    { slug: "electrician", label: "Electrician", aliases: ["electric mistri", "wiring mistri"] },
    { slug: "painter", label: "Painter", aliases: ["paint mistri", "wall painter"] },
    { slug: "carpenter", label: "Carpenter", aliases: ["kath mistri", "door fitting"] },
    { slug: "tiles-mistri", label: "Tiles Mistri", aliases: ["tile fitting", "tiles worker"] },
    { slug: "grill-mistri", label: "Grill Mistri", aliases: ["welder", "fabricator"] },
    { slug: "false-ceiling", label: "False Ceiling Service", aliases: ["pop mistri", "gypsum ceiling"] },
    { slug: "waterproofing", label: "Waterproofing", aliases: ["roof repair", "leakage repair"] },
    { slug: "borewell", label: "Borewell Service", aliases: ["submersible repair", "pump mechanic"] },
    { slug: "architect", label: "Architect", aliases: ["house plan", "building planner"] },
  ],

  rentals: [
    { slug: "house-rent", label: "House Rent", aliases: ["bari rent", "room rent"] },
    { slug: "flat-rent", label: "Flat Rent", aliases: ["2bhk rent", "3bhk rent"] },
    { slug: "shop-rent", label: "Shop Rent", aliases: ["dokan rent", "commercial rent"] },
    { slug: "godown-rent", label: "Godown Rent", aliases: ["warehouse rent", "storage rent"] },
    { slug: "jcb-rental", label: "JCB Rental", aliases: ["jcb rent", "jcb bhara"] },
    { slug: "excavator-rental", label: "Excavator Rental", aliases: ["poclain rent", "earth cutting"] },
    { slug: "mixer-machine-rent", label: "Mixer Machine Rent", aliases: ["concrete mixer rental"] },
    { slug: "shuttering-rent", label: "Shuttering Rent", aliases: ["centering material rent"] },
    { slug: "scaffolding-rent", label: "Scaffolding Rent", aliases: ["bamboo rent", "ladder rent"] },
    { slug: "generator-rent", label: "Generator Rent", aliases: ["power generator rent"] },
  ],
};

export function getSeoCategories(module: SeoModule) {
  return seoCategoryMap[module] || [];
}

export function getSeoCategory(module: SeoModule, slug: string) {
  return getSeoCategories(module).find((item) => item.slug === slug);
}