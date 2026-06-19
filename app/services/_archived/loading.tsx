import { Container } from "@/components/layout/Container";
import { SectionSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Container>
      <div style={{ paddingTop: 18, paddingBottom: 32 }}>
        <SectionSkeleton cards={5} />
      </div>
    </Container>
  );
}
