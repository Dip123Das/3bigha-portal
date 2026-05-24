export type DrawingOcrResult = {
  extractedText: string;
  detectedKeywords: string[];
  confidence: number;
  notes: string[];
};

const KNOWN_DRAWING_KEYWORDS = [
  "bedroom",
  "bed room",
  "toilet",
  "bath",
  "bathroom",
  "kitchen",
  "living",
  "drawing",
  "dining",
  "stair",
  "staircase",
  "lift",
  "lobby",
  "balcony",
  "parking",
  "column",
  "beam",
  "slab",
  "wall",
  "floor",
  "plinth",
  "terrace",
];

export async function extractDrawingTextFromFile(
  file: File,
): Promise<DrawingOcrResult> {
  const name = file.name.toLowerCase();

  const detectedKeywords = KNOWN_DRAWING_KEYWORDS.filter((keyword) =>
    name.includes(keyword.replace(/\s+/g, "")) || name.includes(keyword),
  );

  return {
    extractedText: [
      file.name,
      detectedKeywords.join(" "),
    ]
      .join(" ")
      .trim(),

    detectedKeywords,

    confidence:
      detectedKeywords.length > 2
        ? 72
        : detectedKeywords.length > 0
        ? 58
        : 42,

    notes: [
      "OCR foundation is active.",
      "Current version reads filename and drawing metadata safely.",
      "Deep PDF/image text extraction will be connected later with OCR service.",
      "This avoids heavy build impact and keeps the calculator fast.",
    ],
  };
}
