import {prisma} from '../utils/prisma';
import { destroy } from '../config/multer';
export interface CreateFeaturedInput {
    title  :  string
  description: string
  imageUrl:{
    url: string
    public_id: string
  }
  linkUrl :string
  category: string
}

export interface UpdateFeaturedInput {
  id: number
  title?: string
  description?: string
  linkUrl?: string
  category?: string
}

export const createFeatured = async(input:CreateFeaturedInput)=>{
   if(!input.title || !input.description || !input.imageUrl || !input.linkUrl || !input.category) {
    return {
        success: false,
        message: 'All fields are required'
    }
   }
   try {
    const featured=await prisma.featuredIN.create({
        data:{
            ...input
        }
    })
    if(featured) {
        return {
            success: true,
            message: 'Featured created successfully',
            data: featured
        }
    }
   } catch (error) {
    return{
        success: false,
        message: 'An error occurred while creating the featured',
        error: error instanceof Error ? error.message : 'Unknown error'
    }
   } 
}

export const getFeatured=async()=>{
    try {
        const featured = await prisma.featuredIN.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        return {
            success: true,
            data: featured
        };
    } catch (error) {
        return {
            success: false,
            message: 'An error occurred while fetching featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export const deleteFeatured = async(id: number) => {
    try {

        const featured = await prisma.featuredIN.findUnique({
            where: { id }
        });
        if (!featured) {
            return {
                success: false,
                message: 'Featured not found'
            };
        }
        const image:any= featured.imageUrl;
         if(image.public_id) {
            await destroy(image.public_id);
            
         }else{
            console.log('No image to delete',image.public_id);
         }

        const deletedFeatured = await prisma.featuredIN.delete({
            where: { id }
        });
        return {
            success: true,
            message: 'Featured deleted successfully',
            data: deletedFeatured
        };
    } catch (error) {
        return {
            success: false,
            message: 'An error occurred while deleting the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export const getFeaturedById = async(id: number) => {
    try {
        const featured = await prisma.featuredIN.findUnique({
            where: { id }
        });
        if (!featured) {
            return {
                success: false,
                message: 'Featured not found'
            };
        }
        return {
            success: true,
            data: featured
        };
    } catch (error) {
        return {
            success: false,
            message: 'An error occurred while fetching the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export const updateFeatured = async(input: UpdateFeaturedInput) => {
    const { id, ...data } = input;
    if (!id || Object.keys(data).length === 0) {
        return {
            success: false,
            message: 'ID and at least one field to update are required'
        };
    }
    try {
        console.log("debug last")
        const updatedFeatured = await prisma.featuredIN.update({
            where: { id },
            data
        });
        return {
            success: true,
            message: 'Featured updated successfully',
            data: updatedFeatured
        };
    } catch (error) {
        return {
            success: false,
            message: 'An error occurred while updating the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}