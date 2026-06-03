import VendorVariationForm from "../VendorVariationForm";

export default function VendorMaterialVariationsPage() {
  return (
    <VendorVariationForm
      module="materials"
      title="Add Material Variation"
      subtitle="Add material sizes, grades, brands, units and packaging options your buyers commonly ask for."
      examples={[
        "TMT Bar 12mm · Fe500 · per kg",
        "PPC Cement · 50kg bag",
        "River Sand · 250 cft truck",
        "PVC Pipe · 4 inch · 6 metre",
      ]}
    />
  );
}
