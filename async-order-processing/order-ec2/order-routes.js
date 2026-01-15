import { Router } from 'express';
import { placeOrder } from './order-controller.js';

const router = Router();

router.post('/', async (req, res) => {
  const order = req.body;
  const result = await placeOrder(order);
  return res.json(result);
});

export default router;