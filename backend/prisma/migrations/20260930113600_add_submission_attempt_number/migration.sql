-- AlterTable
ALTER TABLE "IeltsSubmission" ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX IF EXISTS "IeltsSubmission_studentId_taskId_key";

-- CreateIndex
CREATE UNIQUE INDEX "IeltsSubmission_studentId_taskId_attempt_key" ON "IeltsSubmission"("studentId", "taskId", "attempt");

-- CreateIndex
CREATE INDEX "IeltsSubmission_studentId_taskId_idx" ON "IeltsSubmission"("studentId", "taskId");
