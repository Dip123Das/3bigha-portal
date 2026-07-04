# National Geography Coordinate Pipeline

This directory contains the coordinate ETL pipeline.

Structure:

raw/
  Original source datasets.

normalized/
  Source data normalized to a common schema.

import/
  Final import-ready JSON batches.

Pipeline:

1. Acquire authoritative coordinate data.
2. Normalize fields.
3. Match records to LGD hierarchy.
4. Produce import JSON.
5. Validate coverage.
6. Import using:
   scripts/geography/import-geo-entity-coordinates.mjs
