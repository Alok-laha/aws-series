import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "ap-south-1" });

export async function publishOrder(order) {
  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.ORDER_QUEUE_URL,
        MessageBody: JSON.stringify(order),
        MessageGroupId: order.id // FIFO
      })
    );
  } catch (error) {
    console.error("Error publishing order to SQS:", error);
    throw error;
  }
}
