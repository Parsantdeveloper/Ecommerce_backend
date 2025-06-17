-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'ESEWA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "PaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
ADD COLUMN     "PaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "EsewaPayment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "transaction_uuid" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,

    CONSTRAINT "EsewaPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EsewaPayment" ADD CONSTRAINT "EsewaPayment_id_fkey" FOREIGN KEY ("id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsewaPayment" ADD CONSTRAINT "EsewaPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
