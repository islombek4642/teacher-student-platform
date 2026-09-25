-- CreateEnum
CREATE TYPE "IeltsTaskType" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateTable
CREATE TABLE "IeltsTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "IeltsTaskType" NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IeltsTask_teacherId_idx" ON "IeltsTask"("teacherId");

-- CreateIndex
CREATE INDEX "IeltsTask_groupId_idx" ON "IeltsTask"("groupId");

-- AddForeignKey
ALTER TABLE "IeltsTask" ADD CONSTRAINT "IeltsTask_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsTask" ADD CONSTRAINT "IeltsTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
