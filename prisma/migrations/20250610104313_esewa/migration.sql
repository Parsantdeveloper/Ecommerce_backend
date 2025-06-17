/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `EsewaPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transaction_uuid]` on the table `EsewaPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "EsewaPayment" DROP CONSTRAINT "EsewaPayment_id_fkey";

-- AlterTable
ALTER TABLE "EsewaPayment" ADD COLUMN     "transaction_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EsewaPayment_orderId_key" ON "EsewaPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "EsewaPayment_transaction_uuid_key" ON "EsewaPayment"("transaction_uuid");

-- AddForeignKey
ALTER TABLE "EsewaPayment" ADD CONSTRAINT "EsewaPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
