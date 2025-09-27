import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import styles from './AnalyticsDashboard.module.css';

interface DashboardData {
  overview: {
    totalPartners: number;
    totalTickets: number;
    activeTickets: number;
    totalUsers: number;
    todayLogins: number;
  };
  ticketStats: {
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
    recentTickets: Array<{
      id: string;
      subject: string;
      priority: string;
      status: string;
      partnerName: string;
      createdAt: string;
    }>;
  };
  activityStats: {
    loginTrends: Array<{ date: string; logins: number; uniqueUsers: number }>;
    topActions: Array<{ action: string; count: number }>;
    userActivity: Array<{ userRole: string; count: number }>;
    recentActivity: Array<{
      userEmail: string;
      userRole: string;
      action: string;
      success: boolean;
      createdAt: string;
    }>;
  };
}

interface ActivityLog {
  id: string;
  userEmail: string;
  userRole: string;
  action: string;
  success: boolean;
  createdAt: string;
  details?: any;
  ipAddress?: string;
  errorMessage?: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview');
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const apiCall = async (url: string) => {
    const token = localStorage.getItem('auth_token');
    const response = await apiFetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return response.json();
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, activityResponse] = await Promise.all([
        apiCall(`/api/analytics/enhanced-dashboard?days=${timeRange}`),
        apiCall('/api/analytics/activity-logs?limit=20'),
      ]);

      setDashboardData(dashboardResponse);
      setActivityLogs(activityResponse.logs);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return '#ff6b6b';
      case 'in_progress': return '#ffa726';
      case 'resolved': return '#66bb6a';
      case 'closed': return '#90a4ae';
      default: return '#9e9e9e';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={loadDashboardData} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Analytics Dashboard</h1>
        <div className={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className={styles.timeRangeSelect}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'activity' ? styles.active : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity Logs
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'security' ? styles.active : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>

      {activeTab === 'overview' && dashboardData && (
        <div className={styles.overviewTab}>
          {/* Overview Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Total Partners</h3>
              <div className={styles.statValue}>{dashboardData.overview.totalPartners}</div>
              <div className={styles.statIcon}>🏢</div>
            </div>
            <div className={styles.statCard}>
              <h3>Total Tickets</h3>
              <div className={styles.statValue}>{dashboardData.overview.totalTickets}</div>
              <div className={styles.statIcon}>🎫</div>
            </div>
            <div className={styles.statCard}>
              <h3>Active Tickets</h3>
              <div className={styles.statValue}>{dashboardData.overview.activeTickets}</div>
              <div className={styles.statIcon}>⚡</div>
            </div>
            <div className={styles.statCard}>
              <h3>Today's Logins</h3>
              <div className={styles.statValue}>{dashboardData.overview.todayLogins}</div>
              <div className={styles.statIcon}>👥</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className={styles.chartsRow}>
            {/* Ticket Status Chart */}
            <div className={styles.chartCard}>
              <h3>Tickets by Status</h3>
              <div className={styles.chartContent}>
                {dashboardData.ticketStats.byStatus.map((item) => (
                  <div key={item.status} className={styles.chartItem}>
                    <div className={styles.chartLabel}>
                      <span
                        className={styles.chartDot}
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      ></span>
                      {item.status}
                    </div>
                    <div className={styles.chartValue}>{item.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Chart */}
            <div className={styles.chartCard}>
              <h3>Tickets by Priority</h3>
              <div className={styles.chartContent}>
                {dashboardData.ticketStats.byPriority.map((item) => (
                  <div key={item.priority} className={styles.chartItem}>
                    <div className={styles.chartLabel}>
                      <span
                        className={styles.chartDot}
                        style={{ backgroundColor: getPriorityColor(item.priority) }}
                      ></span>
                      {item.priority}
                    </div>
                    <div className={styles.chartValue}>{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tickets */}
          <div className={styles.recentTickets}>
            <h3>Recent Tickets</h3>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span>Subject</span>
                <span>Partner</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Created</span>
              </div>
              {dashboardData.ticketStats.recentTickets.map((ticket) => (
                <div key={ticket.id} className={styles.tableRow}>
                  <span>{ticket.subject}</span>
                  <span>{ticket.partnerName}</span>
                  <span>
                    <span
                      className={styles.priority}
                      style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                    >
                      {ticket.priority}
                    </span>
                  </span>
                  <span>
                    <span
                      className={styles.status}
                      style={{ backgroundColor: getStatusColor(ticket.status) }}
                    >
                      {ticket.status}
                    </span>
                  </span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className={styles.activityTab}>
          <div className={styles.activityHeader}>
            <h3>Recent Activity Logs</h3>
            <button onClick={loadDashboardData} className={styles.refreshButton}>
              Refresh
            </button>
          </div>

          <div className={styles.activityTable}>
            <div className={styles.tableHeader}>
              <span>User</span>
              <span>Role</span>
              <span>Action</span>
              <span>Status</span>
              <span>Time</span>
              <span>IP Address</span>
            </div>
            {activityLogs.map((log) => (
              <div key={log.id} className={styles.tableRow}>
                <span>{log.userEmail || 'System'}</span>
                <span>
                  <span className={`${styles.role} ${styles[log.userRole?.toLowerCase() || 'unknown']}`}>
                    {log.userRole || 'Unknown'}
                  </span>
                </span>
                <span>{log.action}</span>
                <span>
                  <span className={`${styles.statusBadge} ${log.success ? styles.success : styles.failure}`}>
                    {log.success ? '✓' : '✗'}
                  </span>
                </span>
                <span>{formatDate(log.createdAt)}</span>
                <span className={styles.ipAddress}>{log.ipAddress || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className={styles.securityTab}>
          <div className={styles.securityAlert}>
            <h3>🔒 Security Monitoring</h3>
            <p>Monitor failed login attempts and suspicious activity in real-time.</p>
          </div>

          <div className={styles.securityMetrics}>
            <div className={styles.metricCard}>
              <h4>Failed Login Attempts (24h)</h4>
              <div className={styles.metricValue}>
                {activityLogs.filter(log => log.action === 'LOGIN' && !log.success).length}
              </div>
            </div>
            <div className={styles.metricCard}>
              <h4>Unique IP Addresses</h4>
              <div className={styles.metricValue}>
                {new Set(activityLogs.map(log => log.ipAddress).filter(Boolean)).size}
              </div>
            </div>
            <div className={styles.metricCard}>
              <h4>Active Users Today</h4>
              <div className={styles.metricValue}>
                {new Set(activityLogs
                  .filter(log => new Date(log.createdAt).toDateString() === new Date().toDateString())
                  .map(log => log.userEmail)
                ).size}
              </div>
            </div>
          </div>

          <div className={styles.failedLogins}>
            <h4>Recent Failed Login Attempts</h4>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span>User</span>
                <span>IP Address</span>
                <span>Time</span>
                <span>Error</span>
              </div>
              {activityLogs
                .filter(log => log.action === 'LOGIN' && !log.success)
                .slice(0, 10)
                .map((log) => (
                  <div key={log.id} className={styles.tableRow}>
                    <span>{log.userEmail}</span>
                    <span className={styles.ipAddress}>{log.ipAddress}</span>
                    <span>{formatDate(log.createdAt)}</span>
                    <span className={styles.errorMessage}>{log.errorMessage || 'Authentication failed'}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;