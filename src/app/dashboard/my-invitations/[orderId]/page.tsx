import { OrderProductionClient } from "./order-production-client";

export default function OrderProductionPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <OrderProductionClient params={params} />;
}
