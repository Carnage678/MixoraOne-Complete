-- AlterTable
ALTER TABLE "ai_conversations" ADD COLUMN "productId" UUID;

-- CreateEnum
CREATE TYPE "ContentSuggestionField" AS ENUM ('TAGLINE', 'DESCRIPTION', 'CATEGORY', 'CHANGELOG', 'DOC');

-- CreateEnum
CREATE TYPE "ContentSuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "product_content_suggestions" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "conversationId" UUID,
    "field" "ContentSuggestionField" NOT NULL,
    "currentValue" TEXT,
    "suggestedValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ContentSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_content_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_productId_createdAt_idx" ON "ai_conversations"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "product_content_suggestions_productId_status_createdAt_idx" ON "product_content_suggestions"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "product_content_suggestions_conversationId_createdAt_idx" ON "product_content_suggestions"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_content_suggestions" ADD CONSTRAINT "product_content_suggestions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_content_suggestions" ADD CONSTRAINT "product_content_suggestions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
