import {prisma} from "../utils/prisma"
import { Request, Response } from 'express';
// ========================
// SPIN REWARD CRUD APIs
// ========================

// Get all spin rewards
export const getAllSpins = async (req: Request, res: Response) => {
  try {
    const spins = await prisma.spin.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: spins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spin rewards',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get active spin rewards only
export const getActiveSpins = async (req: Request, res: Response) => {
  try {
    const spins = await prisma.spin.findMany({
      where: { isActive: true },
      orderBy: { probability: 'desc' }
    });
    
    res.json({
      success: true,
      data: spins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active spin rewards',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get spin reward by ID
export const getSpinById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const spin = await prisma.spin.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!spin) {
      res.status(404).json({
        success: false,
        message: 'Spin reward not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: spin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spin reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new spin reward
export const createSpin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, value, probability, isActive = true } = req.body;

    // Validate required fields
    if (!title || !type || !value || probability === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: title, type, value, probability'
      });
      return;
    }

    // Validate probability range
    if (probability < 0 || probability > 1) {
      res.status(400).json({
        success: false,
        message: 'Probability must be between 0 and 1'
      });
      return;
    }

    // Get total probability of existing active spins
    const totalActiveProbability = await prisma.spin.aggregate({
      _sum: {
        probability: true
      },
      where: {
        isActive: true
      }
    });

    const currentTotal = totalActiveProbability._sum.probability ?? 0;

    if (currentTotal + probability > 1) {
      res.status(400).json({
        success: false,
        message: `Adding this spin would exceed the total allowed probability of 100%. Current total: ${(currentTotal * 100).toFixed(2)}%, proposed: ${(probability * 100).toFixed(2)}%.`
      });
      return;
    }

    const spin = await prisma.spin.create({
      data: {
        title,
        type,
        value,
        probability,
        isActive
      }
    });

    res.status(201).json({
      success: true,
      data: spin,
      message: 'Spin reward created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create spin reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


// Update spin reward
export const updateSpin = async (req: Request, res: Response): Promise<void>=> {
  try {
    const { id } = req.params;
    const { title, type, value, probability, isActive } = req.body;
    
    // Check if spin exists
    const existingSpin = await prisma.spin.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingSpin) {
       res.status(404).json({
        success: false,
        message: 'Spin reward not found'
      });
      return;
    }
    
    // Validate probability if provided
    if (probability !== undefined && (probability < 0 || probability > 1)) {
       res.status(400).json({
        success: false,
        message: 'Probability must be between 0 and 1'
      });
      return;
    }
    
    const updatedSpin = await prisma.spin.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(value && { value }),
        ...(probability !== undefined && { probability }),
        ...(isActive !== undefined && { isActive })
      }
    });
    
    res.json({
      success: true,
      data: updatedSpin,
      message: 'Spin reward updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update spin reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete spin reward
export const deleteSpin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if spin exists
    const existingSpin = await prisma.spin.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingSpin) {
       res.status(404).json({
        success: false,
        message: 'Spin reward not found'
      });
      return;
    }
    
    await prisma.spin.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({
      success: true,
      message: 'Spin reward deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete spin reward',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Play spin (when cart total >= 1500)
export const playSpin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId } = req.body;
    
    // Get cart with total calculation
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!cart) {
       res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
      return;
    }
    
    // Check if spin already played
    if (cart.spinPlayed) {
       res.status(400).json({
        success: false,
        message: 'Spin already played for this cart'
      });
      return;
    }
    
    // Check if cart total is >= 1500
    if (cart.totalPrice < 1500) {
       res.status(400).json({
        success: false,
        message: 'Cart total must be at least 1500 to play spin'
      });
      return;
    }
    
    // Get active spins
    const activeSpins = await prisma.spin.findMany({
      where: { isActive: true }
    });
    
    if (activeSpins.length === 0) {
       res.status(400).json({
        success: false,
        message: 'No active spin rewards available'
      });
      return;
    }
    
    // Spin logic - weighted random selection
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedSpin = null;
    
    for (const spin of activeSpins) {
      cumulativeProbability += spin.probability;
      if (random <= cumulativeProbability) {
        selectedSpin = spin;
        break;
      }
    }
    
    // Fallback to last spin if none selected
    if (!selectedSpin) {
      selectedSpin = activeSpins[activeSpins.length - 1];
    }
    
    // Update cart with spin result
    let updatedCart = cart;
    let shippingCost = cart.shippingCost;
    let discount = cart.discount;
    
    switch (selectedSpin.type) {
      case 'DISCOUNT':
        discount = parseFloat(selectedSpin.value);
        break;
      case 'FREE_DELIVERY':
        shippingCost = 0;
        break;
      case 'CASHBACK':
       cart.totalPrice=cart.totalPrice-Number(selectedSpin.value);
       break;
      case 'GIFT':
      case 'MESSAGE':
        // No cart modifications needed
        break;
    }
    
    updatedCart = await prisma.cart.update({
      where: { id: cartId },
      data: {
        spinPlayed: true,
        spinReward: `${selectedSpin.type}:${selectedSpin.value}`,
        shippingCost,
        discount
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        cart: updatedCart,
        reward: selectedSpin
      },
      message: `Congratulations! You won: ${selectedSpin.title}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to play spin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ========================
// CART CRUD APIs
// ========================

// Get cart by user ID or create new one
export const getOrCreateCart = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    let cart = await prisma.cart.findUnique({
      where: { userId: userId ? parseInt(userId) : undefined },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true
          }
        },
        user:{
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
                phoneNumber: true
            }
        }
      }
    });
    
    // Create new cart if doesn't exist
    if (!cart) {
    const  cart = await prisma.cart.create({
        data: {
          userId: userId ? parseInt(userId) : null
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true
            }
          },
          user: true
        }
      });
    }
    
     
     
    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get or create cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId, productId, quantity = 1, productVariantId} = req.body;
    
    if (!cartId || !productId) {
       res.status(400).json({
        success: false,
        message: 'Cart ID and Product ID are required'
      });
      return;
    }
    
    // Check if cart exists
    const cart = await prisma.cart.findUnique({
      where: { id: Number(cartId) }
    });
    
    if (!cart) {
       res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
      return;
    }
    
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });
    
    if (!product) {
       res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }
    
    // If productVariantId is provided, check if it exists
    if (productVariantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: Number(productVariantId) }
      });
      
      if (!variant) {
        res.status(404).json({
          success: false,
          message: 'Product variant not found'
        });
        return;
      }
    }
    
    // Check if item already exists in cart (same product and variant combination)
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: Number(cartId),
        productId: Number(productId),
        productVariantId: productVariantId ? Number(productVariantId) : null
      }
    });
    
    let cartItem;
    
    if (existingItem) {
      // Update quantity if item exists
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity
        },
        include: {
          product: true,
          productVariant: true
        }
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: Number(cartId),
          productId: Number(productId),
          quantity,
          productVariantId: productVariantId ? Number(productVariantId) : null
        },
        include: {
          product: true,
          productVariant: true
        }
      });
    }
    
    // Update cart total
    await updateCartTotal(cartId);
    
    res.status(201).json({
      success: true,
      data: cartItem,
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 0) {
       res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
      return;
    }
    
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: parseInt(itemId) }
    });
    
    if (!cartItem) {
       res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
        return;
    }
    
    if (quantity === 0) {
      // Remove item if quantity is 0
      await prisma.cartItem.delete({
        where: { id: parseInt(itemId) }
      });
      
      await updateCartTotal(cartItem.cartId);
      
       res.json({
        success: true,
        message: 'Item removed from cart'
      });
        return;
    }
    
    const updatedItem = await prisma.cartItem.update({
      where: { id: parseInt(itemId) },
      data: { quantity },
      include: {
        product: true,
        productVariant: true
      }
    });
    
    // Update cart total
    await updateCartTotal(cartItem.cartId);
    
    res.json({
      success: true,
      data: updatedItem,
      message: 'Cart item updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: parseInt(itemId) }
    });
    
    if (!cartItem) {
       res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
        return;
    }
    
    await prisma.cartItem.delete({
      where: { id: parseInt(itemId) }
    });
    
    // Update cart total
    await updateCartTotal(cartItem.cartId);
    
    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Clear entire cart
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId } = req.params;
    
    const cart = await prisma.cart.findUnique({
      where: { id: parseInt(cartId) }
    });
    
    if (!cart) {
       res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
        return;
    }
    
    await prisma.cartItem.deleteMany({
      where: { cartId: parseInt(cartId) }
    });
    
    await prisma.cart.update({
      where: { id: parseInt(cartId) },
      data: {
        totalPrice: 0,
        spinPlayed: false,
        spinReward: null,
        shippingCost: 100,
        discount: 0
      }
    });
    
    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get cart summary (total, items count, spin eligibility)
export const getCartSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId } = req.params;
    
    const cart = await prisma.cart.findUnique({
      where: { id: parseInt(cartId) },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true
          }
        }
      }
    });
    
    if (!cart) {
       res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
        return;
    }
    console.log(cart.totalPrice,"total price");
    console.log("cart ",cart)
    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.totalPrice;
    const finalTotal = subtotal - cart.discount + cart.shippingCost;
    const spinEligible = subtotal >= 1500 && !cart.spinPlayed;
    
    res.json({
      success: true,
      data: {
        cartId: cart.id,
        itemsCount,
        subtotal,
        discount: cart.discount,
        shippingCost: cart.shippingCost,
        finalTotal,
        spinEligible,
        spinPlayed: cart.spinPlayed,
        spinReward: cart.spinReward
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get cart summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ========================
// HELPER FUNCTIONS
// ========================

// Helper function to update cart total
const updateCartTotal = async (cartId: number) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: { 
      product: true,
      productVariant: true
    }
  });
  
  const totalPrice = cartItems.reduce((sum, item) => {
    // Use variant price if available, otherwise use product price
    const price = item.productVariant?.price || item.product.totalPrice;
    return sum + (price * item.quantity);
  }, 0);
  
  await prisma.cart.update({
    where: { id: cartId },
    data: { totalPrice }
  });
};

export const updateCartMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId } = req.params;
    const { message } = req.body;
    
    const cart = await prisma.cart.findUnique({
      where: { id: parseInt(cartId) }
    });
    
    if (!cart) {
      res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
      return;
    }
    
    const updatedCart = await prisma.cart.update({
      where: { id: parseInt(cartId) },
      data: { message: message || null }
    });
    
    res.json({
      success: true,
      data: updatedCart,
      message: 'Cart message updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update cart message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Ultra-optimized bulk add that handles large datasets
export const bulkAddToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId, items, message } = req.body;
    
    // Same validation as before...
    if (!cartId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Cart ID and items array are required'
      });
      return;
    }

    // Validate each item structure
    const invalidItems = items.filter(item => 
      !item.productId || 
      !item.quantity || 
      item.quantity <= 0 ||
      typeof item.productId !== 'number' ||
      typeof item.quantity !== 'number'
    );

    if (invalidItems.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Each item must have valid productId and quantity (greater than 0)',
        invalidItems
      });
      return;
    }

    // Check if cart exists
    const cart = await prisma.cart.findUnique({
      where: { id: Number(cartId) }
    });

    if (!cart) {
      res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
      return;
    }

    // Validate products and variants (same as before)
    const productIds = [...new Set(items.map(item => Number(item.productId)))];
    const variantIds = [...new Set(
      items
        .filter(item => item.productVariantId)
        .map(item => Number(item.productVariantId))
    )];

    const [products, variants, existingCartItems] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } }
      }),
      variantIds.length > 0 ? prisma.productVariant.findMany({
        where: { id: { in: variantIds } }
      }) : Promise.resolve([]),
      prisma.cartItem.findMany({
        where: { cartId: Number(cartId) }
      })
    ]);

    const foundProductIds = products.map(p => p.id);
    const missingProductIds = productIds.filter(id => !foundProductIds.includes(id));

    if (missingProductIds.length > 0) {
      res.status(404).json({
        success: false,
        message: 'Some products not found',
        missingProductIds
      });
      return;
    }

    if (variantIds.length > 0) {
      const foundVariantIds = variants.map(v => v.id);
      const missingVariantIds = variantIds.filter(id => !foundVariantIds.includes(id));

      if (missingVariantIds.length > 0) {
        res.status(404).json({
          success: false,
          message: 'Some product variants not found',
          missingVariantIds
        });
        return;
      }
    }

    // Process items for bulk operations
    const itemsToCreate = [];
    const itemsToUpdate = [];
    const existingItemMap = new Map();

    // Create a map for faster lookup
    existingCartItems.forEach(item => {
      const key = `${item.productId}-${item.productVariantId}`;
      existingItemMap.set(key, item);
    });

    for (const item of items) {
      const { productId, quantity, productVariantId } = item;
      const key = `${productId}-${productVariantId || null}`;
      const existingItem = existingItemMap.get(key);

      if (existingItem) {
        itemsToUpdate.push({
          id: existingItem.id,
          newQuantity: existingItem.quantity + Number(quantity)
        });
      } else {
        itemsToCreate.push({
          cartId: Number(cartId),
          productId: Number(productId),
          quantity: Number(quantity),
          productVariantId: productVariantId ? Number(productVariantId) : null
        });
      }
    }

    // Execute operations WITHOUT transaction for very large datasets
    let addedCount = 0;
    let updatedCount = 0;

    try {
      // Bulk create new items
      if (itemsToCreate.length > 0) {
        const createResult = await prisma.cartItem.createMany({
          data: itemsToCreate,
          skipDuplicates: true
        });
        addedCount = createResult.count;
      }

      // Bulk update existing items (in batches if many)
      if (itemsToUpdate.length > 0) {
        const batchSize = 10; // Process 10 updates at a time
        for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
          const batch = itemsToUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(updateItem =>
              prisma.cartItem.update({
                where: { id: updateItem.id },
                data: { quantity: updateItem.newQuantity }
              })
            )
          );
          updatedCount += batch.length;
        }
      }

      // Update cart message separately if provided
      if (message !== undefined) {
        await prisma.cart.update({
          where: { id: Number(cartId) },
          data: { message: message || null }
        });
      }

      // Update cart total
      await updateCartTotal(Number(cartId));

      res.status(201).json({
        success: true,
        message: 'Items added to cart successfully',
        data: {
          summary: {
            totalItemsAdded: addedCount,
            totalItemsUpdated: updatedCount,
            totalItemsProcessed: addedCount + updatedCount
          }
        }
      });

    } catch (error) {
      // If any operation fails, we might have partial success
      // You could implement rollback logic here if needed
      throw error;
    }

  } catch (error) {
    console.error('Error in optimized bulk add to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add items to cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Batch processing version for VERY large datasets (100+ items)
export const bulkAddToCartBatched = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartId, items, message, batchSize = 20 } = req.body;
    
    // Validation (same as before)...
    if (!cartId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Cart ID and items array are required'
      });
      return;
    }

    let totalAdded = 0;
    let totalUpdated = 0;
    const batches = [];
    
    // Split items into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      const response = await fetch('/api/cart/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          items: batch,
          message: message // Only set message on first batch
        })
      });

      const result = await response.json();
      if (result.success) {
        totalAdded += result.data.summary.totalItemsAdded;
        totalUpdated += result.data.summary.totalItemsUpdated;
      }
    }

    res.status(201).json({
      success: true,
      message: `Processed ${batches.length} batches successfully`,
      data: {
        summary: {
          totalItemsAdded: totalAdded,
          totalItemsUpdated: totalUpdated,
          totalBatches: batches.length
        }
      }
    });

  } catch (error) {
    console.error('Error in batched bulk add:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batched items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};