-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "developer_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "websiteUrl" TEXT,
    "githubUrl" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_verifications" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "legalName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "evidenceUrl" TEXT,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developer_profiles_userId_key" ON "developer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "developer_profiles_slug_key" ON "developer_profiles"("slug");

-- CreateIndex
CREATE INDEX "developer_verifications_profileId_createdAt_idx" ON "developer_verifications"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "developer_verifications_status_createdAt_idx" ON "developer_verifications"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_verifications" ADD CONSTRAINT "developer_verifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
