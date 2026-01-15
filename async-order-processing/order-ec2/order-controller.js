import {publishOrder} from './sql-publisher.js';
export async function placeOrder(order) {
    try {
        await publishOrder(order);
        return { id: order.id, status: "placed" };
    } catch (error) {
        return { id: order.id, status: "failed", reason: error.message };
    }
};