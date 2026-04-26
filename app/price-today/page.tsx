import PriceTodayClient from "./PriceTodayClient";

export const metadata = {
  title: "Price Today | 3bigha",
  description:
    "Check today’s construction material prices, property price trends, service rates, rental rates, discounts and offers on 3bigha.",
};

export default function PriceTodayPage() {
  return <PriceTodayClient />;
}