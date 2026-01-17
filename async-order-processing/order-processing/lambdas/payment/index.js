import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: process.env.AWS_REGION, profile: ["shopdev"] });

export const handler = async (event) => {
  const order = JSON.parse(event.Records[0].body);
  console.log("Processing order:", order);
  const command = new StartExecutionCommand({
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    name: order.orderId, // idempotency
    input: JSON.stringify(order)
  });

  await sfn.send(command);

  return { status: "STEP_FUNCTION_STARTED" };
};
