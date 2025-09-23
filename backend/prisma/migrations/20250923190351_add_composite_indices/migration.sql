-- CreateIndex
CREATE INDEX "CalendarEvent_partnerId_idx" ON "CalendarEvent"("partnerId");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRecord_partnerId_idx" ON "ServiceRecord"("partnerId");

-- CreateIndex
CREATE INDEX "ServiceRecord_assignedToId_idx" ON "ServiceRecord"("assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_partnerId_status_idx" ON "Ticket"("partnerId", "status");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_priority_status_idx" ON "Ticket"("priority", "status");
