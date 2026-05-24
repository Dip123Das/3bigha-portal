export type DrawingRoomParseResult = {
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  staircases: number;
  lifts: number;
  balconies: number;
  parkingAreas: number;
  detectedLabels: string[];
};

function countAny(text: string, words: string[]) {
  return words.reduce((count, word) => {
    const matches = text.match(new RegExp(word, "gi"));
    return count + (matches?.length ?? 0);
  }, 0);
}

export function parseDrawingRoomsFromText(
  extractedText: string,
): DrawingRoomParseResult {
  const text = extractedText.toLowerCase();

  const bedrooms = countAny(text, ["bedroom", "bed room", "master bed"]);
  const bathrooms = countAny(text, ["toilet", "bath", "bathroom", "wc"]);
  const kitchens = countAny(text, ["kitchen"]);
  const livingRooms = countAny(text, ["living", "drawing", "dining"]);
  const staircases = countAny(text, ["stair", "staircase"]);
  const lifts = countAny(text, ["lift", "elevator"]);
  const balconies = countAny(text, ["balcony"]);
  const parkingAreas = countAny(text, ["parking", "garage"]);

  return {
    bedrooms,
    bathrooms,
    kitchens,
    livingRooms,
    staircases,
    lifts,
    balconies,
    parkingAreas,
    detectedLabels: [
      bedrooms ? "Bedroom" : "",
      bathrooms ? "Bathroom/Toilet" : "",
      kitchens ? "Kitchen" : "",
      livingRooms ? "Living/Dining" : "",
      staircases ? "Staircase" : "",
      lifts ? "Lift" : "",
      balconies ? "Balcony" : "",
      parkingAreas ? "Parking" : "",
    ].filter(Boolean),
  };
}
