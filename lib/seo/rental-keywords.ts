export const RENTAL_KEYWORDS = [
  "house rent", "bari rent", "room rent", "single room rent",
  "flat rent", "2bhk rent", "3bhk rent", "apartment rent",
  "shop rent", "dokan rent", "office rent", "commercial space rent",
  "godown rent", "warehouse rent", "land lease", "commercial land rent",
  "jcb rental", "jcb rent", "jcb bhara", "excavator rental",
  "poclain rental", "tractor rental", "dumper rental", "truck rental",
  "mini truck rental", "pickup van rental", "crane rent",
  "road roller rent", "concrete mixer rental", "mixer machine rent",
  "vibrator machine rent", "centering material rent", "shuttering rent",
  "shuttering plate rent", "scaffolding rent", "bamboo rent",
  "ladder rent", "generator rent", "welding machine rent",
  "drill machine rent", "tiles cutter rent", "water pump rent",
  "earth cutting machine rent", "construction equipment rental",
  "tools rental", "temporary shed rent", "labour shed rent",
];

export function getRentalKeywords(area: string) {
  const cleanArea = area.trim();

  return RENTAL_KEYWORDS.flatMap((word) => [
    `${word} in ${cleanArea}`,
    `${word} near me in ${cleanArea}`,
    `${word} price in ${cleanArea}`,
    `${word} rate in ${cleanArea}`,
    `${word} per day rent in ${cleanArea}`,
    `${word} hourly rent in ${cleanArea}`,
    `${word} monthly rent in ${cleanArea}`,
    `${word} booking in ${cleanArea}`,
    `best ${word} in ${cleanArea}`,
    `available ${word} in ${cleanArea}`,
    `post requirement for ${word} in ${cleanArea}`,
  ]);
}