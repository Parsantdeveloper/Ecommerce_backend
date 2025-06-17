import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create new order from cart (updated for eSewa integration)
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      cartId,
      addressId,
      userId,
      orderType,
      paymentMethod = "COD", // Default to COD if not specified
    } = req.body;

    if (!cartId || !userId) {
      res.status(400).json({
        success: false,
        message: "Cart ID and User ID are required",
      });
      return;
    }

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: Number(cartId) },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({
        success: false,
        message: "Cart not found or empty",
      });
      return;
    }

    // Validate address if provided
    if (addressId) {
      const address = await prisma.address.findUnique({
        where: { id: Number(addressId) },
      });

      if (!address) {
        res.status(404).json({
          success: false,
          message: "Address not found",
        });
        return;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      // Create the order first
      const newOrder = await tx.order.create({
        data: {
          userId: Number(userId),
          totalPrice: cart.totalPrice,
          discountPercent: cart.discount,
          shippingCost: cart.shippingCost,
          spinReward: cart.spinReward,
          addressId: addressId ? Number(addressId) : null,
          status: "PENDING",
          orderType,
          message: cart.message,
          PaymentMethod: paymentMethod,
          PaymentStatus: paymentMethod === "ESEWA" ? "PENDING" : "PENDING",
          isThreeHourDelivery: orderType === "THREE_HOUR_DELIVERY",
        },
      });

      // Create order items
      const orderItems = await Promise.all(
        cart.items.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productVariantId: item.productVariantId ?? undefined,
              prductId: item.productId,
              quantity: item.quantity,
              pricePerItem: item.productVariant?.price || item.product.price,
            },
          })
        )
      );

      // Clear the cart
      await tx.cartItem.deleteMany({
        where: { cartId: Number(cartId) },
      });

      await tx.cart.update({
        where: { id: Number(cartId) },
        data: {
          totalPrice: 0,
          discount: 0,
          spinPlayed: false,
          spinReward: null,
        },
      });

      return { order: newOrder, orderItems };
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Create eSewa payment record
export const createEsewaPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { 
      orderId, 
      userId, 
      total_amount, 
      transaction_uuid, 
      product_code,
      transaction_code // Now matches your frontend
    } = req.body;

    console.log('Creating eSewa payment with data:', {
      orderId,
      userId,
      total_amount,
      transaction_uuid,
      product_code,
      transaction_code
    });

    if (
      !orderId ||
      !userId ||
      !total_amount ||
      !transaction_uuid ||
      !product_code
    ) {
      res.status(400).json({
        success: false,
        message: "All payment details are required",
      });
      return;
    }

    // Check if order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: Number(orderId),
        userId: Number(userId),
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found or doesn't belong to user",
      });
      return;
    }

    // Check if payment already exists for this transaction
    const existingPayment = await prisma.esewaPayment.findUnique({
      where: {
        transaction_uuid: transaction_uuid,
      },
    });

    if (existingPayment) {
      res.status(409).json({
        success: false,
        message: "Payment already recorded for this transaction",
        data: existingPayment,
      });
      return;
    }

    const esewaPayment = await prisma.$transaction(async (tx) => {
      // Create eSewa payment record
      const payment = await tx.esewaPayment.create({
        data: {
          orderId: Number(orderId),
          userId: Number(userId),
          total_amount: Number(total_amount),
          transaction_uuid,
          product_code,
          transaction_code: transaction_code || null,
        },
      });

      // Update order payment status
      await tx.order.update({
        where: { id: Number(orderId) },
        data: {
          PaymentStatus: "PAID",
          PaymentMethod: "ESEWA",
        },
      });

      return payment;
    });

    res.status(201).json({
      success: true,
      message: "eSewa payment recorded successfully",
      data: esewaPayment,
    });
  } catch (error) {
    console.error("Error creating eSewa payment:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        res.status(409).json({
          success: false,
          message: "Payment already exists for this order or transaction",
        });
        return;
      }
      
      if (error.message.includes('Foreign key constraint')) {
        res.status(400).json({
          success: false,
          message: "Invalid order or user reference",
        });
        return;
      }
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to record eSewa payment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get eSewa payments with filtering
export const getEsewaPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      userId,
      orderId,
      transaction_uuid,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = Number(userId);
    }

    if (orderId) {
      where.orderId = Number(orderId);
    }

    if (transaction_uuid) {
      where.transaction_uuid = transaction_uuid as string;
    }

    const [payments, totalCount] = await Promise.all([
      prisma.esewaPayment.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              address: true,
            },
          },
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: Number(limit),
      }),
      prisma.esewaPayment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get eSewa payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get recent eSewa payments
export const getRecentEsewaPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, limit = 5 } = req.query;

    const where: any = {};
    if (userId) {
      where.userId = Number(userId);
    }

    const payments = await prisma.esewaPayment.findMany({
      where,
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get recent eSewa payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get eSewa payment by ID
export const getEsewaPaymentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.esewaPayment.findUnique({
      where: { id: Number(paymentId) },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            address: true,
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "eSewa payment not found",
      });
      return;
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get eSewa payment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Other existing functions remain the same...
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      status,
      search,
      startDate,
      is3hrdelivery,
      orderType,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = Number(userId);
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }
    if (is3hrdelivery) {
      where.isThreeHourDelivery = is3hrdelivery === "true";
    }
    if (orderType) {
      where.orderType = orderType;
    }

    // Search functionality
    if (search) {
      where.OR = [
        {
          user: {
            name: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        },
        {
          id: isNaN(Number(search)) ? undefined : Number(search),
        },
      ].filter((condition) => condition.id !== undefined || condition.user);
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          address: true,
          esewaPayments: true, // Include eSewa payment info
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Keep all other existing functions unchanged...
export const getRecentOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, limit = 5 } = req.query;

    const where: any = {};
    if (userId) {
      where.userId = Number(userId);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        esewaPayments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get recent orders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        address: true,
        esewaPayments: true,
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get order",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getOrdersByStatusCounts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.query;

    const where: any = {};
    if (userId) {
      where.userId = Number(userId);
    }

    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where,
      _count: {
        status: true,
      },
    });

    const formattedCounts = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    // Ensure all statuses are included with 0 count if not present
    const allStatuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
    allStatuses.forEach((status) => {
      if (!formattedCounts[status]) {
        formattedCounts[status] = 0;
      }
    });

    const totalOrders = Object.values(formattedCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    res.json({
      success: true,
      data: {
        counts: formattedCounts,
        total: totalOrders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get order status counts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        esewaPayments: true,
      },
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: "Order status updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (order.user.role != "ADMIN" && order.userId !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You can only cancel your own orders",
      });
      return;
    }

    if (order.user.role != "ADMIN" && order.status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
      return;
    }

    if (order.user.role == "ADMIN" && order.status === "DELIVERED") {
      res.status(400).json({
        success: false,
        message: "Cannot cancel delivered orders",
      });
      return;
    }

    const cancelledOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: { status: "CANCELLED" },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        esewaPayments: true,
      },
    });

    res.json({
      success: true,
      data: cancelledOrder,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUserOrderHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId: Number(userId) };

    if (status) {
      where.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          address: true,
          esewaPayments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user order history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const changeFastDeliver = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const { id } = req.params;

    if (!id) {
      res.status(500).json({
        success: false,
        message: "orderId is required",
      });
      return;
    }
    const result = await prisma.order.update({
      where: { id: Number(id) },
      data: { isThreeHourDelivery: status === "true" },
    });
    if (result) {
      res.status(200).json({
        success: true,
        message: "Three hour delivery applied successfully",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Three hour delivery failed",
    });
    return;
  } catch (error) {}
  res.status(500).json({
    success: false,
    message: "error occured",
  });
};
