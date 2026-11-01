declare module "react-native-razorpay" {
  type CheckoutOptions = {
    key: string;
    order_id: string;
    amount: string;
    currency: "INR";
    name: string;
    description: string;
    theme?: { color?: string };
  };

  type CheckoutSuccess = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<CheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
