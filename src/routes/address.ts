import express from 'express';
import {
  createAddress,
  getAddresses,
  getAddressById,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  bulkCreateAddresses,
  getAddressStats
} from '../services/addressService'; 

const router = express.Router();

router.post('/', createAddress);


router.get('/', getAddresses);

router.get('/stats', getAddressStats);


router.post('/bulk', bulkCreateAddresses);


router.get('/:addressId', getAddressById);


router.put('/:addressId', updateAddress);


router.delete('/:addressId', deleteAddress);


router.get('/user/:userId', getUserAddresses);

export default router;
