/*
  Warnings:

  - The `sales` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `salesLast` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `categoryId` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sales",
ADD COLUMN     "sales" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "salesLast",
ADD COLUMN     "salesLast" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "categoryId",
ADD COLUMN     "categoryId" INTEGER[];
