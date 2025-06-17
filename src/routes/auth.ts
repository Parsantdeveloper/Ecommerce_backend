import { log } from "console";
import { upload } from "../config/multer";
import {getUserById,deleteUser, updateUser,changePassword,getAll,dashboardInfo,forgetPassword,
  verifyResetCode,
  resetPassword,
  cleanupExpiredResetCodes} from "../services/authService";
  import {prisma}from "../utils/prisma"
import express,{NextFunction, Request,Response} from "express";
import { hashPassword,comparePassword } from "../utils/bcrypt";
import { generateAccessToken,generateRefreshToken } from "../utils/token";
import jwt, { JwtPayload } from 'jsonwebtoken';
import cookieParser from "cookie-parser";
import { promises } from "dns";
const router = express.Router();

router.use(cookieParser());

export const verifyAccessToken = (req:Request, res:Response, next:NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
   (req as any).user = payload;
    next();
  } catch {
    return res.sendStatus(401);
  }
};

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.sendStatus(401);
    return;
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as JwtPayload & { id: number };
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    console.log(user)
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    
    if (user.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied: Admins only" });
      return;
    }
    
    next();
  } catch {
    res.sendStatus(401);
    return;
  }
};
router.post("/register", async (req:Request, res:Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name){
     res.status(400).json({ message: "Missing fields" });
      return;
    }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser){
    res.status(400).json({ message: "User already exists" });
    return
  }

  const hashed = await hashPassword(password);
  const newUser = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  const accessToken = generateAccessToken(newUser.id);
  const refreshToken = generateRefreshToken(newUser.id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: newUser, accessToken });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    res.status(401).json({ message: "Invalid password" });
    return;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Exclude password and other sensitive fields
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({ 
    user: userWithoutPassword, 
    accessToken 
  });
});

router.get("/isAdmin",verifyAdmin,(req:Request,res:Response)=>{
  res.status(200).json({
     isAdmin:true
  })
})

router.post("/refresh", (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  console.log(token)
  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as JwtPayload & { id: number };

    const newAccessToken = generateAccessToken(payload.id);
    const newRefreshToken = generateRefreshToken(payload.id);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});


router.get("/user/:id",async(req:Request,res:Response)=>{
    const {id}=req.params;
    console.log(id);
    try {
       if(id){
        const result=await getUserById(id);
        if(!result){
            res.status(400).json({message:"User not found"});
        }
        res.status(200).json({message:"User found successfully",user:result});
       }

    } catch (error) {
        res.status(400).json({ error: error,message:"User not found" });
    }
})

router.delete("/user/:id",async(req:Request,res:Response)=>{
    const {id}=req.params;

    try {
        if(id){
         const result=await deleteUser(id);

            if(!result){
                res.status(400).json({message:"failed to delete user"});
            }
            res.status(200).json({message:"User deleted successfully",user:result});
        }
    } catch (error) {
        res.status(400).json({ error: error,message:"User not found" });
    }
})

router.put("/user/:id", upload.single("image"), async(req:Request,res:Response)=>{
    const {id}=req.params;
    const {name}=req.body;
    const {phoneNumber}=req.body;
    const image = req.file?.path;
    const role =String(req.body.role) ;
    try {
         if(id){
            const result = await updateUser(id,name,image,role,phoneNumber);
            if(!result){
                res.status(400).json({message:"failed to update user"});
            }
            res.status(200).json({message:"User updated successfully",user:result});
         }
    } catch (error) {
        res.status(400).json({ error: error,message:"User not found" });
        
    }
})

router.put("/user/:id/change-password",async(req:Request,res:Response)=>{
    const {id}=req.params;
    const {oldPassword,newPassword}=req.body;

    console.log(oldPassword,newPassword);
    try {
        if(id){
            const result = await changePassword(id,oldPassword,newPassword);
            if(!result){
                res.status(400).json({message:"failed to update password"});
            }
            res.status(200).json({message:"User password updated successfully",user:result});
        }
    } catch (error) {
        res.status(400).json({ error: error,message:"incorrect oldpassword" });
    }
})

router.get("/", async (req: Request, res: Response):Promise<any> => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string || "";
        const role = req.query.role as string || "";
        const startsWith = req.query.startsWith as string || "";

        const result = await getAll(search, page, limit, role, startsWith);
        
        if (!result) {
        return res.status(400).json({ message: "Users not found" });
        
        }

        res.status(200).json({ message: "Users found successfully", users: result });
    } catch (error) {
        res.status(400).json({ error, message: "Users not found" });
    }
});


router.get("/dashboard",async(req:Request,res:Response)=>{
    try {
        const result = await dashboardInfo();
        if(!result){
            res.status(400).json({message:"Dashboard info not found"});
        }
        res.status(200).json({message:"Dashboard info found successfully",info:result});
    } catch (error) {
        res.status(400).json({ error: error,message:"Dashboard info not found" });
    }
})
router.post("/forget-password", async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (!email) {
       res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
      return;
    }

    const result = await forgetPassword(email);
    res.status(200).json({
      success: true,
      message: result.message,
      email: result.email,
    });
  } catch (error: any) {
    console.error("Forget password error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      message: "Failed to send reset code",
    });
  }
});

// Verify Reset Code
router.post("/verify-reset-code", async (req: Request, res: Response) => {
  const { email, resetCode } = req.body;

  try {
    if (!email || !resetCode) {
       res.status(400).json({
        success: false,
        message: "Email and reset code are required",
      });
      return;
    }

    const result = await verifyResetCode(email, resetCode);
    res.status(200).json({
      success: true,
      message: result.message,
      email: result.email,
    });
  } catch (error: any) {
    console.error("Verify reset code error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      message: "Invalid or expired reset code",
    });
  }
});

// Reset Password using reset code
router.post("/reset-password", async (req: Request, res: Response) => {
  const { email, resetCode, newPassword } = req.body;

  try {
    if (!email || !resetCode || !newPassword) {
       res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
       res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    const result = await resetPassword(email, resetCode, newPassword);
    res.status(200).json({
      success: true,
      message: result.message,
      user: result.user,
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      message: "Failed to reset password",
    });
  }
});

// Cleanup expired reset codes (admin endpoint or cron job)
router.post("/cleanup-expired-codes", async (req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredResetCodes();
    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.count} expired reset codes`,
      count: result.count,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to cleanup expired codes",
    });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your_jwt_secret') as JwtPayload & { id: number };
        
       
        
      } catch (tokenError) {
        // Token is invalid, but we still want to clear the cookie
        console.log("Invalid token during logout, clearing anyway");
      }
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "strict",
      path: "/"
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to logout"
    });
  }
});
  
export default router;