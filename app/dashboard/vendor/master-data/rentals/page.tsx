import VendorVariationForm from "../VendorVariationForm";

export default function VendorRentalVariationsPage() {
  return (
    <VendorVariationForm
      module="rentals"
      title="Add Rental Variation"
      subtitle="Add machine, equipment, capacity, rental unit and operator options in simple local language."
      examples={[
        "JCB with operator · daily rent",
        "Concrete mixer machine · per day",
        "Scaffolding · per sq ft",
        "Tractor trolley · per trip",
      ]}
    />
  );
}
