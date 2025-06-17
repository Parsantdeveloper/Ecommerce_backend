import express from "express";
import {
  createOrder,
  getOrders,
  getRecentOrders,
  getOrderById,
  getOrdersByStatusCounts,
  updateOrderStatus,
  cancelOrder,
  getUserOrderHistory,
  changeFastDeliver,
  // New eSewa payment functions
  createEsewaPayment,
  getEsewaPayments,
  getRecentEsewaPayments,
  getEsewaPaymentById,
} from "../services/orderService";

const router = express.Router();

// Order routes
router.post("/", createOrder);
router.get("/", getOrders);
router.get("/recent", getRecentOrders);
router.get("/status-counts", getOrdersByStatusCounts);
router.get("/:orderId", getOrderById);
router.put("/:orderId/status", updateOrderStatus);
router.put("/:orderId/cancel", cancelOrder);
router.get("/user/:userId", getUserOrderHistory);
router.get("/user/:userId/recent", (req, res) => {
  req.query.userId = req.params.userId;
  getRecentOrders(req, res);
});
router.get("/user/:userId/status-counts", (req, res) => {
  req.query.userId = req.params.userId;
  getOrdersByStatusCounts(req, res);
});
router.put("/order/:id", changeFastDeliver);

// eSewa payment routes
router.post("/esewa/payment", createEsewaPayment);
router.get("/esewa/payments", getEsewaPayments);
router.get("/esewa/payments/recent", getRecentEsewaPayments);
router.get("/esewa/payment/:paymentId", getEsewaPaymentById);

// User specific eSewa payment routes
router.get("/user/:userId/esewa/payments", (req, res) => {
  req.query.userId = req.params.userId;
  getEsewaPayments(req, res);
});

router.get("/user/:userId/esewa/payments/recent", (req, res) => {
  req.query.userId = req.params.userId;
  getRecentEsewaPayments(req, res);
});

export default router;
