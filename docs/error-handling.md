# Error Handling System Documentation

## Overview

The Pool Safe Inc Portal implements a comprehensive error handling system that provides robust error tracking, user-friendly error messages, and detailed error reporting for developers and administrators.

## Features

### 1. Error Boundaries

- **React Error Boundaries**: Catch JavaScript errors in React components
- **Global Error Boundary**: Wraps the entire application to catch unhandled errors
- **Async Error Boundary**: Handles Promise rejections and async errors
- **User-friendly fallback UI**: Shows helpful error messages instead of white screens

### 2. Error Tracking & Logging

- **Automatic error capture**: JavaScript errors, network errors, resource loading errors
- **Error deduplication**: Groups similar errors together with occurrence counts
- **Context collection**: User ID, route, timestamp, user agent, stack traces
- **Severity classification**: Low, Medium, High, Critical error levels
- **Local storage backup**: Errors stored locally when offline

### 3. Error Reporting

- **Backend API**: RESTful endpoints for error submission and retrieval
- **Database storage**: Persistent error logs in SQLite/PostgreSQL
- **Admin dashboard**: View, filter, and analyze error reports
- **Export functionality**: Download error reports for analysis
- **Rate limiting**: Prevents error spam and abuse

### 4. User Experience

- **Offline support**: Graceful handling when internet is unavailable
- **Toast notifications**: Non-intrusive error notifications
- **Custom 404 page**: Professional not-found page with navigation options
- **Loading error states**: User-friendly loading failure messages
- **Retry mechanisms**: Easy retry buttons for failed operations

## Implementation

### Components

#### ErrorBoundary.tsx

```typescript
// React component that catches JavaScript errors
import { ErrorBoundary } from './components/ErrorBoundary';

// Usage
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

#### ErrorHandling.tsx

```typescript
// Additional error handling utilities
import {
  OfflineStatus,
  ErrorToast,
  LoadingError,
  useErrorToasts,
} from "./components/ErrorHandling";
```

#### NotFoundPage.tsx

```typescript
// Custom 404 page
import NotFoundPage from "./pages/NotFoundPage";
```

#### ErrorDashboard.tsx

```typescript
// Admin dashboard for viewing error reports
import ErrorDashboard from "./components/ErrorDashboard";
```

### Utils

#### errorTracking.ts

```typescript
// Error tracking utilities
import {
  logError,
  getErrorReports,
  clearErrors,
  getUserFriendlyMessage,
} from "./utils/errorTracking";

// Log an error
logError(new Error("Something went wrong"), {
  type: "user-action",
  severity: "medium",
  metadata: { action: "button-click" },
});
```

### Backend API

#### Error Reporting Endpoints

**POST /api/errors**

- Submit error reports from frontend
- Rate limited (100 requests per 15 minutes per IP)
- Automatic error deduplication

**GET /api/errors** (Admin/Staff only)

- Retrieve error reports with pagination
- Filter by severity, type, date range, search terms
- Response includes error details and context

**GET /api/errors/stats** (Admin/Staff only)

- Error statistics and analytics
- Error trends, top errors, severity breakdown
- Configurable time period (default 7 days)

**DELETE /api/errors** (Admin only)

- Clear error reports
- Optional parameter to delete only old errors

#### Database Schema

```sql
-- ErrorLog table
CREATE TABLE ErrorLog (
  id TEXT PRIMARY KEY,
  errorId TEXT UNIQUE,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT, -- JSON string
  count INTEGER DEFAULT 1,
  firstSeen TEXT,
  lastSeen TEXT,
  severity TEXT DEFAULT 'medium',
  type TEXT DEFAULT 'unknown',
  ipAddress TEXT,
  userAgent TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Frontend Configuration

Add to your main App component:

```typescript
import { GlobalErrorBoundary } from './components/ErrorHandling';

function App() {
  return (
    <GlobalErrorBoundary>
      {/* Your app content */}
    </GlobalErrorBoundary>
  );
}
```

### Backend Configuration

Add error handling routes:

```typescript
import errorsRouter from "./routes/errors";
app.use("/api/errors", errorsRouter);
```

Update Prisma schema:

```prisma
model ErrorLog {
  id         String   @id @default(uuid())
  errorId    String   @unique
  message    String
  stack      String?
  context    String?
  count      Int      @default(1)
  firstSeen  String
  lastSeen   String
  severity   String   @default("medium")
  type       String   @default("unknown")
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## Usage Examples

### Basic Error Logging

```typescript
import { logError } from "./utils/errorTracking";

try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  logError(error, {
    type: "api-call",
    severity: "high",
    metadata: { endpoint: "/api/data" },
  });
}
```

### Using Error Toasts

```typescript
import { useErrorToasts } from './components/ErrorHandling';

function MyComponent() {
  const { showError, ErrorToasts } = useErrorToasts();

  const handleError = (error) => {
    showError(error, () => retryOperation());
  };

  return (
    <div>
      {/* Your component content */}
      <ErrorToasts />
    </div>
  );
}
```

### Wrapping Components with Error Boundaries

```typescript
import { withErrorBoundary } from './components/ErrorBoundary';

const SafeComponent = withErrorBoundary(
  YourComponent,
  <div>Something went wrong in this component</div>
);
```

## Error Types & Severity

### Error Types

- **javascript**: Runtime JavaScript errors
- **network**: API calls, fetch requests
- **resource**: Image/script loading failures
- **unhandledRejection**: Promise rejections
- **user-action**: User-triggered errors
- **critical**: System-critical failures

### Severity Levels

- **low**: Minor issues, cosmetic problems
- **medium**: Functional issues, degraded experience
- **high**: Major functionality broken
- **critical**: System failure, data loss risk

## Monitoring & Analytics

### Error Dashboard Features

- Real-time error monitoring
- Error trend analysis
- Top error reports
- Severity distribution
- User impact assessment
- Search and filtering capabilities

### Key Metrics

- Total error count
- Error rate trends
- Most frequent errors
- Error resolution time
- User-affected percentage

## Performance Monitoring Integration

### Frontend (Core Web Vitals & Lighthouse)

- The portal tracks Core Web Vitals (LCP, FID, CLS, FCP, TTFB) using the `PerformanceManager` utility in `frontend/src/utils/performance.ts`.
- Performance metrics are collected via the browser's PerformanceObserver API and sent to the backend for analytics.
- Use Google Lighthouse to audit performance, accessibility, SEO, and PWA compliance. Run Lighthouse in Chrome DevTools or via CI for automated reports.
- Bundle analysis and lazy loading are implemented for optimal load times.

### Backend (API & Resource Metrics)

- Backend performance metrics (response time, error rate, memory, CPU) are tracked via Express middleware in `backend/src/middleware/monitoring.ts`.
- Metrics are available via the monitoring dashboard and API endpoints.
- Alerts are triggered for slow responses, high error rates, or resource exhaustion.

### How to Audit Performance

1. Run Lighthouse in Chrome DevTools on your deployed site for a full report.
2. Review Core Web Vitals in the browser console and backend analytics dashboard.
3. Monitor backend metrics and alerts via the admin dashboard or `/api/monitoring` endpoints.
4. Use bundle analysis tools (e.g., `vite-plugin-visualizer`) to inspect frontend build size.

## Best Practices

### 1. Error Prevention

- Input validation
- Type checking
- Defensive programming
- Error-prone operation wrapping

### 2. Error Handling

- Graceful degradation
- User-friendly messages
- Retry mechanisms
- Fallback options

### 3. Error Reporting

- Sufficient context collection
- Appropriate severity classification
- Privacy-conscious logging
- Performance impact minimization

### 4. Error Resolution

- Regular error review
- Quick critical error response
- Root cause analysis
- Preventive measures implementation

## Testing

### Error Testing Page

Access `/error-test.html` to test various error scenarios:

- JavaScript errors
- Network failures
- Promise rejections
- Resource loading errors
- Critical system errors
- Offline behavior

### Test Scenarios

1. **Error Boundary Testing**: Trigger component errors
2. **Network Error Testing**: Simulate API failures
3. **Offline Testing**: Test offline behavior
4. **Error Recovery Testing**: Verify retry mechanisms
5. **Admin Dashboard Testing**: Check error reporting interface

## Security Considerations

### 1. Error Information Disclosure

- Stack traces only in development
- Sanitized error messages for users
- No sensitive data in error logs

### 2. Rate Limiting

- Error submission rate limiting
- IP-based restrictions
- Abuse prevention measures

### 3. Access Control

- Admin-only error dashboard access
- Role-based error report viewing
- Secure error data transmission

### 4. Data Privacy

- No personal data in error logs
- GDPR compliance considerations
- Error data retention policies

## Troubleshooting

### Common Issues

**1. Errors not being logged**

- Check console for error tracker initialization
- Verify network connectivity for backend submission
- Ensure proper component wrapping with error boundaries

**2. Error dashboard not loading**

- Verify admin/staff role permissions
- Check backend API connectivity
- Ensure database table exists

**3. Performance impact**

- Monitor error logging frequency
- Check for error logging loops
- Verify rate limiting configuration

**4. Missing error context**

- Check error tracking initialization
- Verify context data collection
- Ensure proper error wrapping

### Debug Steps

1. Check browser console for error tracker logs
2. Verify network requests to `/api/errors`
3. Check database for error log entries
4. Test with error test page
5. Review error dashboard for captured errors

## Future Enhancements

### Planned Features

- Error alerting via email/Slack
- Error trend predictions
- Automated error categorization
- Performance impact analysis
- User session replay integration
- External error service integration (Sentry, LogRocket)

### Integration Opportunities

- Performance monitoring correlation
- User analytics integration
- Customer support ticket linking
- Deployment error tracking
- A/B testing error impact analysis

## Support

### Documentation

- Component API documentation
- Backend API specifications
- Database schema reference
- Configuration examples

### Debugging Tools

- Error test page (`/error-test.html`)
- Browser console logging
- Network request monitoring
- Database query tools

### Contact

For issues or questions about the error handling system:

- Technical Documentation: See inline code comments
- Backend API: Check `/api/errors` endpoints
- Frontend Components: Review component prop interfaces
- Database: Refer to Prisma schema definitions

## Email Alerting for Critical Errors

### Setup

- Add the following to your `.env` file in the backend directory:

  ```env
  SUPPORT_ADMIN_EMAIL=support@poolsafe.com
  SMTP_HOST=your.smtp.host
  SMTP_PORT=587
  SMTP_USER=your_smtp_username
  SMTP_PASS=your_smtp_password
  SMTP_FROM=your_from_address
  ```

- The system will send an email to the address in `SUPPORT_ADMIN_EMAIL` whenever a critical error is reported.

### How It Works

- When a frontend or backend error is reported with `severity: "critical"`, the backend triggers an email alert to the support admin.
- The email includes error details, severity, type, route, timestamp, user ID, and stack trace.

### Testing Email Alerts

1. Ensure your SMTP credentials and `SUPPORT_ADMIN_EMAIL` are set in `.env`.
2. Submit a test error report to `/api/errors` with `severity: "critical"`:

   ```json
   {
     "id": "test-critical-error-001",
     "message": "Test critical error for alerting",
     "stack": "Error: Test stack trace",
     "context": {
       "severity": "critical",
       "type": "test",
       "route": "/test",
       "timestamp": "2025-09-24T12:00:00Z",
       "userId": "admin"
     },
     "count": 1,
     "firstSeen": "2025-09-24T12:00:00Z",
     "lastSeen": "2025-09-24T12:00:00Z"
   }
   ```

3. Check the support admin inbox for the alert email.

### Troubleshooting

- If no email is received, check backend logs for SMTP errors.
- Verify all SMTP and email environment variables are correct.
- Use the `sendTestEmail` method in `emailService.ts` to verify SMTP setup independently.

---
