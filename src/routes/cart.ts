import { Router } from 'express';
import {
  getAllSpins,
  getActiveSpins,
  getSpinById,
  createSpin,
  updateSpin,
  deleteSpin,
  playSpin,
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  updateCartMessage,
  bulkAddToCart
} from '../services/cartService';

const router = Router();



router.get('/spins', getAllSpins);

router.get('/spins/active', getActiveSpins);

router.get('/spins/:id', getSpinById);

router.post('/spins', createSpin);

router.put('/spins/:id', updateSpin);

router.delete('/spins/:id', deleteSpin);

router.post('/spins/play', playSpin);



router.get('/carts/user/:userId', getOrCreateCart);


router.post('/carts/items', addToCart);

router.put('/carts/items/:itemId', updateCartItem);

router.delete('/carts/items/:itemId', removeFromCart);

router.delete('/carts/:cartId/clear', clearCart);

router.get('/carts/:cartId/summary', getCartSummary);
router.put("/cart/message/:id",updateCartMessage)
router.post("/bulk",bulkAddToCart)

export default router;
