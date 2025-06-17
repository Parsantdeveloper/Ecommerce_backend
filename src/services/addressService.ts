import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Address{
  street: string,
  city: string,
  state: string,
  zipCode: string,
  userId: number,
  phoneNumber?: string
}

// Create new address
export const createAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const {...data}: Address = req.body;

    // Validation
    if (!data.street || !data.city || !data.state || !data.zipCode || !data.userId) {
      res.status(400).json({
        success: false,
        message: 'All fields are required: street, city, state, zipCode, userId'
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(data.userId) }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const address = await prisma.address.create({
      data: {
        street: data.street.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: data.zipCode.trim(),
        phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
        userId: Number(data.userId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: address,
      message: 'Address created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all addresses with filtering
export const getAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      city,
      state,
      phoneNumber,
      search,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'asc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = Number(userId);
    }

    if (city) {
      where.city = {
        contains: city as string,
        mode: 'insensitive'
      };
    }

    if (state) {
      where.state = {
        contains: state as string,
        mode: 'insensitive'
      };
    }

    if (phoneNumber) {
      where.phoneNumber = {
        contains: phoneNumber as string,
        mode: 'insensitive'
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        {
          street: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          city: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          state: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          zipCode: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          phoneNumber: {
            contains: search as string,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [addresses, totalCount] = await Promise.all([
      prisma.address.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              order: true
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder
        },
        skip,
        take: Number(limit)
      }),
      prisma.address.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      success: true,
      data: {
        addresses,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get addresses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get address by ID
export const getAddressById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { addressId } = req.params;

    const address = await prisma.address.findUnique({
      where: { id: Number(addressId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true
          }
        },
        order: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'Address not found'
      });
      return;
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user's addresses
export const getUserAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { includeOrderCount = false } = req.query;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const addresses = await prisma.address.findMany({
      where: { userId: Number(userId) },
      include: {
        ...(includeOrderCount === 'true' && {
          _count: {
            select: {
              order: true
            }
          }
        })
      },
      orderBy: {
        id: 'desc'
      }
    });

    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user addresses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update address
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { addressId } = req.params;
    const { street, city, state, zipCode, phoneNumber } = req.body;

    // Check if address exists
    const existingAddress = await prisma.address.findUnique({
      where: { id: Number(addressId) }
    });

    if (!existingAddress) {
      res.status(404).json({
        success: false,
        message: 'Address not found'
      });
      return;
    }

    // Build update data
    const updateData: any = {};
    if (street !== undefined) updateData.street = street.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (zipCode !== undefined) updateData.zipCode = zipCode.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber ? phoneNumber.trim() : null;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    const updatedAddress = await prisma.address.update({
      where: { id: Number(addressId) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedAddress,
      message: 'Address updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete address
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { addressId } = req.params;
    const { forceDelete = false } = req.query;

    // Check if address exists
    const address = await prisma.address.findUnique({
      where: { id: Number(addressId) },
      include: {
        _count: {
          select: {
            order: true
          }
        }
      }
    });

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'Address not found'
      });
      return;
    }

    // Check if address is associated with orders
    if (address._count.order > 0 && !forceDelete) {
      res.status(400).json({
        success: false,
        message: `Cannot delete address. It is associated with ${address._count.order} order(s). Use forceDelete=true to override.`,
        associatedOrders: address._count.order
      });
      return;
    }

    // If force delete is true and there are orders, set their addressId to null
    if (forceDelete && address._count.order > 0) {
      await prisma.order.updateMany({
        where: { addressId: Number(addressId) },
        data: { addressId: null }
      });
    }

    await prisma.address.delete({
      where: { id: Number(addressId) }
    });

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Bulk create addresses
export const bulkCreateAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { addresses } = req.body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Addresses array is required and cannot be empty'
      });
      return;
    }

    // Validate each address
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      if (!addr.street || !addr.city || !addr.state || !addr.zipCode || !addr.userId) {
        res.status(400).json({
          success: false,
          message: `Address at index ${i} is missing required fields`
        });
        return;
      }
    }

    // Validate all users exist
    const userIds = [...new Set(addresses.map(addr => Number(addr.userId)))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true }
    });

    if (users.length !== userIds.length) {
      res.status(400).json({
        success: false,
        message: 'One or more users not found'
      });
      return;
    }

    const createdAddresses = await prisma.address.createMany({
      data: addresses.map(addr => ({
        street: addr.street.trim(),
        city: addr.city.trim(),
        state: addr.state.trim(),
        zipCode: addr.zipCode.trim(),
        phoneNumber: addr.phoneNumber ? addr.phoneNumber.trim() : null,
        userId: Number(addr.userId)
      }))
    });

    res.status(201).json({
      success: true,
      data: {
        count: createdAddresses.count,
        message: `${createdAddresses.count} addresses created successfully`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create addresses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get address statistics
export const getAddressStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    const where: any = {};
    if (userId) {
      where.userId = Number(userId);
    }

    const [
      totalAddresses,
      addressesByState,
      addressesByCity,
      addressesWithOrders,
      addressesWithPhoneNumbers
    ] = await Promise.all([
      prisma.address.count({ where }),
      prisma.address.groupBy({
        by: ['state'],
        where,
        _count: {
          state: true
        },
        orderBy: {
          _count: {
            state: 'desc'
          }
        }
      }),
      prisma.address.groupBy({
        by: ['city'],
        where,
        _count: {
          city: true
        },
        orderBy: {
          _count: {
            city: 'desc'
          }
        },
        take: 10
      }),
      prisma.address.count({
        where: {
          ...where,
          order: {
            some: {}
          }
        }
      }),
      prisma.address.count({
        where: {
          ...where,
          phoneNumber: {
            not: null
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalAddresses,
        addressesWithOrders,
        addressesWithoutOrders: totalAddresses - addressesWithOrders,
        addressesWithPhoneNumbers,
        addressesWithoutPhoneNumbers: totalAddresses - addressesWithPhoneNumbers,
        topStates: addressesByState.map(item => ({
          state: item.state,
          count: item._count.state
        })),
        topCities: addressesByCity.map(item => ({
          city: item.city,
          count: item._count.city
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get address statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};