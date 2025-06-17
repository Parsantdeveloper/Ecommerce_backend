/*
  Warnings:

  - The `orderType` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ThRE_HOUR_DELIVERY', 'CUSTOM');

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "message" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "message" TEXT,
DROP COLUMN "orderType",
ADD COLUMN     "orderType" "OrderType";
