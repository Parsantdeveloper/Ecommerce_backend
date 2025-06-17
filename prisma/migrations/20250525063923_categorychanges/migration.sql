-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "categoryTypeId" INTEGER;

-- CreateTable
CREATE TABLE "categoryType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categoryType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoryType_name_key" ON "categoryType"("name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_categoryTypeId_fkey" FOREIGN KEY ("categoryTypeId") REFERENCES "categoryType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
