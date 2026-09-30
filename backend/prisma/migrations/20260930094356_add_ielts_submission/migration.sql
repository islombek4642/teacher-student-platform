-- CreateTable
CREATE TABLE "IeltsSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 40,
    "band" DOUBLE PRECISION NOT NULL,
    "answersJson" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IeltsSubmission_studentId_idx" ON "IeltsSubmission"("studentId");

-- CreateIndex
CREATE INDEX "IeltsSubmission_taskId_idx" ON "IeltsSubmission"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsSubmission_studentId_taskId_key" ON "IeltsSubmission"("studentId", "taskId");

-- CreateIndex
CREATE INDEX "Group_teacherId_idx" ON "Group"("teacherId");

-- CreateIndex
CREATE INDEX "StudentProfile_groupId_idx" ON "StudentProfile"("groupId");

-- AddForeignKey
ALTER TABLE "IeltsSubmission" ADD CONSTRAINT "IeltsSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsSubmission" ADD CONSTRAINT "IeltsSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "IeltsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
