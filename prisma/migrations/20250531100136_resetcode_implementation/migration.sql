-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetCode" VARCHAR(255),
ADD COLUMN     "resetCodeExpires" TIMESTAMP(3);
