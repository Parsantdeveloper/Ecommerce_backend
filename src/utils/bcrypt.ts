import bcrypt from 'bcrypt';

const saltrounds = 10;

export const hashPassword = async (password: string): Promise<string> => {

  const hashpassword=await bcrypt.hash(password, saltrounds);
    return hashpassword;
}

export const comparePassword=async(password:string , hashpassword:string):Promise<boolean>=>{
    const isMatch = await bcrypt.compare(password, hashpassword);
    return isMatch;
}