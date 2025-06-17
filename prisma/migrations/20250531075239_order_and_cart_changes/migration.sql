/*
  Warnings:

  - You are about to drop the column `color` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `CartItem` table. All the data in the column will be lost.
  - Added the required column `prductId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "color",
DROP COLUMN "size",
ADD COLUMN     "productVariantId" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "prductId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_prductId_fkey" FOREIGN KEY ("prductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
