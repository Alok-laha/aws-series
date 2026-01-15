exports.handler = async (event) => {
  console.log("Payment event:", JSON.stringify(event));

  if (Math.random() < 0.7) {
    return { status: "SUCCESS", orderId: event.orderId };
  }

  throw new Error("Payment failed");
};
