-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "pricingPlanId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "subscriptionId" UUID,
    "licenseKeyHash" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "seatLimit" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_seats" (
    "id" UUID NOT NULL,
    "licenseId" UUID NOT NULL,
    "assignedUserId" UUID,
    "assignedEmail" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_activations" (
    "id" UUID NOT NULL,
    "licenseId" UUID NOT NULL,
    "seatId" UUID,
    "userId" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "activationTokenHash" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licenses_orderId_key" ON "licenses"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_subscriptionId_key" ON "licenses"("subscriptionId");

-- CreateIndex
CREATE INDEX "licenses_userId_status_createdAt_idx" ON "licenses"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "licenses_productId_idx" ON "licenses"("productId");

-- CreateIndex
CREATE INDEX "license_seats_licenseId_createdAt_idx" ON "license_seats"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "license_seats_assignedUserId_idx" ON "license_seats"("assignedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "license_activations_activationTokenHash_key" ON "license_activations"("activationTokenHash");

-- CreateIndex
CREATE INDEX "license_activations_licenseId_revokedAt_idx" ON "license_activations"("licenseId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "license_activations_licenseId_deviceId_userId_key" ON "license_activations"("licenseId", "deviceId", "userId");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "product_pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_seats" ADD CONSTRAINT "license_seats_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_seats" ADD CONSTRAINT "license_seats_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_activations" ADD CONSTRAINT "license_activations_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_activations" ADD CONSTRAINT "license_activations_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "license_seats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
