import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "ap-south-1", profile: ["shopdev"] });

export async function publishOrder(order) {
  const orderQueueURL = process.env.ORDER_QUEUE_URL;
  if (!orderQueueURL) {
    throw new Error("ORDER_QUEUE_URL environment variable is not set");
  }

  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: orderQueueURL,
        MessageBody: JSON.stringify(order),
        MessageGroupId: order.id // FIFO
      })
    );
  } catch (error) {
    console.error("Error publishing order to SQS:", error);
    throw error;
  }
}
