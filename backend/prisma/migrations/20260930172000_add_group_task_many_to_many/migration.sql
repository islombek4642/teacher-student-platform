-- CreateTable
CREATE TABLE IF NOT EXISTS "GroupTask" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GroupTask_groupId_taskId_key" ON "GroupTask"("groupId", "taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupTask_groupId_idx" ON "GroupTask"("groupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupTask_taskId_idx" ON "GroupTask"("taskId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupTask_groupId_fkey') THEN
        ALTER TABLE "GroupTask" ADD CONSTRAINT "GroupTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupTask_taskId_fkey') THEN
        ALTER TABLE "GroupTask" ADD CONSTRAINT "GroupTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "IeltsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migrate existing assignments from IeltsTask to GroupTask
INSERT INTO "GroupTask" ("id", "groupId", "taskId", "createdAt")
SELECT gen_random_uuid(), "groupId", "id", NOW()
FROM "IeltsTask"
WHERE "groupId" IS NOT NULL
ON CONFLICT ("groupId", "taskId") DO NOTHING;
