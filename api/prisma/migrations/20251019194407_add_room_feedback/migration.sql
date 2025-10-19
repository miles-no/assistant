-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "room_feedback" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_feedback_roomId_idx" ON "room_feedback"("roomId");

-- CreateIndex
CREATE INDEX "room_feedback_userId_idx" ON "room_feedback"("userId");

-- CreateIndex
CREATE INDEX "room_feedback_status_idx" ON "room_feedback"("status");

-- AddForeignKey
ALTER TABLE "room_feedback" ADD CONSTRAINT "room_feedback_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_feedback" ADD CONSTRAINT "room_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
