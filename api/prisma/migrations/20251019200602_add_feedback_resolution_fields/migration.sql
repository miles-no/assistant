-- AlterTable
ALTER TABLE "room_feedback" ADD COLUMN     "resolutionComment" TEXT,
ADD COLUMN     "resolvedBy" TEXT;

-- CreateIndex
CREATE INDEX "room_feedback_resolvedBy_idx" ON "room_feedback"("resolvedBy");

-- AddForeignKey
ALTER TABLE "room_feedback" ADD CONSTRAINT "room_feedback_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
