-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderType" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 1;
