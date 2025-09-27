/*
  Warnings:

  - You are about to drop the column `userEmail` on the `Partner` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "userPass" TEXT,
    "managementCompany" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "numberOfLoungeUnits" INTEGER NOT NULL DEFAULT 0,
    "topColour" TEXT,
    "lock" TEXT,
    "masterCode" TEXT,
    "subMasterCode" TEXT,
    "lockPart" TEXT,
    "key" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Partner" ("city", "companyName", "country", "createdAt", "id", "key", "latitude", "lock", "lockPart", "longitude", "managementCompany", "masterCode", "numberOfLoungeUnits", "state", "streetAddress", "subMasterCode", "topColour", "updatedAt", "userPass", "zip") SELECT "city", "companyName", "country", "createdAt", "id", "key", "latitude", "lock", "lockPart", "longitude", "managementCompany", "masterCode", "numberOfLoungeUnits", "state", "streetAddress", "subMasterCode", "topColour", "updatedAt", "userPass", "zip" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
CREATE UNIQUE INDEX "Partner_companyName_key" ON "Partner"("companyName");
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "contactId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "title" TEXT,
    "createdByName" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "description" TEXT,
    "unitsAffected" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "contactPreference" TEXT,
    "recurringIssue" BOOLEAN NOT NULL DEFAULT false,
    "dateOfOccurrence" DATETIME,
    "severity" INTEGER,
    "assignedToId" TEXT,
    "internalNotes" TEXT,
    "followUpNotes" TEXT,
    "resolutionTime" INTEGER,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("assignedToId", "category", "contactPreference", "createdAt", "createdByName", "dateOfOccurrence", "description", "escalated", "firstName", "followUpNotes", "id", "internalNotes", "lastName", "partnerId", "priority", "recurringIssue", "resolutionTime", "severity", "status", "subject", "title", "unitsAffected", "updatedAt") SELECT "assignedToId", "category", "contactPreference", "createdAt", "createdByName", "dateOfOccurrence", "description", "escalated", "firstName", "followUpNotes", "id", "internalNotes", "lastName", "partnerId", "priority", "recurringIssue", "resolutionTime", "severity", "status", "subject", "title", "unitsAffected", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE INDEX "Ticket_partnerId_status_idx" ON "Ticket"("partnerId", "status");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");
CREATE INDEX "Ticket_priority_status_idx" ON "Ticket"("priority", "status");
CREATE INDEX "Ticket_contactId_idx" ON "Ticket"("contactId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Contact_partnerId_idx" ON "Contact"("partnerId");

-- CreateIndex
CREATE INDEX "Contact_partnerId_isPrimary_idx" ON "Contact"("partnerId", "isPrimary");
