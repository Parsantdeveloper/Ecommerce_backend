import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const generateAccessToken=(userID:Number)=>{
    return jwt.sign({id:userID},JWT_SECRET,{expiresIn:'20m'});

}
export const generateRefreshToken=(userId:Number)=>{
    return jwt.sign({id:userId},JWT_SECRET,{expiresIn:'7d'})
}
export const verifyToken=(token:string)=>{
    return jwt.verify(token,JWT_SECRET);
}
