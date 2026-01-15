import Express from "express";
import orderRouter from "./order-routes.js";
import dotenv from "dotenv";
export const app = Express();
dotenv.config();
app.use(Express.json());

const PORT = process.env.PORT || 3000;

app.use("/api/order", orderRouter);
app.get("/", (req, res) => {
  res.send("Welcome to the Async Order Processing Service");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});