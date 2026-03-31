// app/admin/property/page.tsx
"use client";

import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

export default function AdminPropertyHomePage() {
  return (
    <Container>
      <SectionHeader
        title="Property Admin"
        subtitle="Manage listings, inventory, and previews from one place."
      />

      {/* Your Grid component doesn't support cols prop.
          So we use it as a simple wrapper and control columns via a div. */}
      <Grid>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Listings */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Listings</div>
                  <div className="mt-1 text-sm opacity-80">
                    Create, edit, and publish property listings. Publish readiness is enforced.
                  </div>
                </div>
                <Badge>Working</Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href="/admin/property/listings" className="inline-block">
                  <ActionButton>Open Listings</ActionButton>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Inventory */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Inventory</div>
                  <div className="mt-1 text-sm opacity-80">
                    Manage unit availability transitions and bulk actions.
                  </div>
                </div>
                <Badge>Working</Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href="/admin/property/inventory" className="inline-block">
                  <ActionButton>Open Inventory</ActionButton>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Preview */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Preview</div>
                  <div className="mt-1 text-sm opacity-80">
                    Preview listing details via UUID load, with inventory summary + filtered links.
                  </div>
                </div>
                <Badge>Working</Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href="/admin/property/preview" className="inline-block">
                  <ActionButton>Open Preview</ActionButton>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </Grid>

      <div className="mt-6 text-sm opacity-70">
        Tip: We can add optional counters here later (draft/pending/published, available/reserved/sold)
        without touching Listings/Inventory pages.
      </div>
    </Container>
  );
}
