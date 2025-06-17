import {prisma} from "../utils/prisma"
import { hashPassword,comparePassword } from "../utils/bcrypt";
import { Role } from "@prisma/client";
import { transporter, createPasswordResetEmail } from "../config/email";



export const getUserById=async(id:string)=>{
    const userId=+id;
    if(id){
        const user=await prisma.user.findUnique({where:{id:userId},select:{
            id:true,
            name:true,
            email:true,
            address:true,
            phoneNumber:true,
            image:true,
            role:true


        }});
        if(!user){
            throw new Error("User not found");
        }
        return {user};
    }
}

  export const deleteUser=async(id:string)=>{
    const userID=+id;
    if(id){
        const user=await prisma.user.delete({where:{id:userID}});
        if(!user){
            throw new Error("User not found");
        }
        return {user};
    }
  }

  export const updateUser=async(id:string,name?:string , image?:string,role?:string,phoneNumber?:string)=>{
   const userID=+id;
   console.log(role+"role");
   const validRoles = Object.values(Role);
    const isValidRole = validRoles.includes(role as Role);
    if (!isValidRole) {
console.error(`Invalid role: ${role}`);  }
   if(id){
    const user=await prisma.user.update({where:{id:userID},data:{
        name,
        image,
        phoneNumber,
        role: isValidRole ? role as Role : undefined
        }})
        if(!user){
            throw new Error("User not found");
        }
        return {user};
   }
  }
  
  export const getAllUsers=async()=>{
    const users=await prisma.user.findMany({select:{
        id:true,
        name:true,
        email:true,
        address:true,
        phoneNumber:true,
        image:true,
        role:true
    }});
    if(!users){
        throw new Error("Users not found");
    }
    return {users};
  }

  export const changePassword=async(id:string,oldPassword:string,newPassword:string)=>{
    const userId=+id;
    if(id){
        const user = await prisma.user.findUnique({where:{id:userId}});
        if(!user){
            throw new Error("User not found");
        }
        const isMatch = await comparePassword(oldPassword,user.password);
        if(!isMatch){
            throw new Error("Invalid password");
        }
        const hash=await hashPassword(newPassword);

        const updatedUser=await prisma.user.update({where:{id:userId}, data:{
            password:hash
        }})
        if(!updatedUser){
            throw new Error("User not found");
        }
        return {user:updatedUser};
    }
  }

// Generate 6-digit reset code
const generateResetCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Forget Password - Send reset code via email
export const forgetPassword = async (email: string) => {
  if (!email) {
    throw new Error("Email is required");
  }

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("User with this email does not exist");
  }

  // Generate reset code and set expiry (2 minutes from now)
  const resetCode = generateResetCode();
  const resetCodeExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  // Update user with reset code and expiry
  await prisma.user.update({
    where: { email },
    data: {
      resetCode,
      resetCodeExpires,
    },
  });

  // Send email with reset code
  try {
    const emailOptions = createPasswordResetEmail(resetCode, email);
    await transporter.sendMail(emailOptions);
    
    return {
      message: "Password reset code sent to your email",
      email: email,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send reset code email");
  }
};

// Verify Reset Code
export const verifyResetCode = async (email: string, resetCode: string) => {
  if (!email || !resetCode) {
    throw new Error("Email and reset code are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.resetCode || !user.resetCodeExpires) {
    throw new Error("No reset code found for this user");
  }

  // Check if reset code has expired
  if (new Date() > user.resetCodeExpires) {
    // Clear expired reset code
    await prisma.user.update({
      where: { email },
      data: {
        resetCode: null,
        resetCodeExpires: null,
      },
    });
    throw new Error("Reset code has expired. Please request a new one");
  }

  // Check if reset code matches
  if (user.resetCode !== resetCode) {
    throw new Error("Invalid reset code");
  }

  return {
    message: "Reset code verified successfully",
    email: email,
  };
};

// Reset Password using reset code
export const resetPassword = async (
  email: string,
  resetCode: string,
  newPassword: string
) => {
  if (!email || !resetCode || !newPassword) {
    throw new Error("Email, reset code, and new password are required");
  }

  // Verify reset code first
  await verifyResetCode(email, resetCode);

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update user password and clear reset code
  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      resetCode: null,
      resetCodeExpires: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return {
    message: "Password reset successfully",
    user: updatedUser,
  };
};

// Clean up expired reset codes (utility function)
export const cleanupExpiredResetCodes = async () => {
  const now = new Date();
  
  const result = await prisma.user.updateMany({
    where: {
      resetCodeExpires: {
        lt: now,
      },
    },
    data: {
      resetCode: null,
      resetCodeExpires: null,
    },
  });

  console.log(`Cleaned up ${result.count} expired reset codes`);
  return result;
};

export const getAll = async (search: string, page: number, limit: number, role: string, startsWith: string) => {
    const whereClause: any = {};

    if (search) {
        console.log("searching for:", search);
        whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }

    if (role) {
        whereClause.role = role;
    }

    if (startsWith) {
        // Add startsWith condition on name field
        whereClause.name = { startsWith, mode: "insensitive" };
    }

    const users = await prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            address: true,
            phoneNumber: true,
            image: true,
            role: true,
        }
    });

    return { users };
};


export const dashboardInfo = async()=>{
    const totalUsers = await prisma.user.count();
    const totalOrders = await prisma.order.count();
    const totalProducts = await prisma.product.count();
    const totalCategories = await prisma.category.count();
    const totalRevenue = await prisma.order.aggregate({
        _sum: {
            totalPrice: true,
        },
    });
    return {
        totalUsers,
        totalOrders,
        totalProducts,
        totalCategories,
        totalRevenue: totalRevenue._sum.totalPrice || 0, // Handle case where no orders exist
    };
}