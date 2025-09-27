import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import styles from './Header.module.css';

interface User {
  id: string;
  email?: string;
  displayName?: string;
  role: string;
  partnerId?: string;
}

interface Partner {
  id: string;
  companyName: string;
  managementCompany?: string;
  numberOfLoungeUnits: number;
  city?: string;
  state?: string;
}

interface HeaderProps {
  user: User;
  onLogout?: () => void;
  onAccessibilitySettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onAccessibilitySettings }) => {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'PARTNER' && user.partnerId) {
      fetchPartnerInfo();
    }
  }, [user]);

  const fetchPartnerInfo = async () => {
    if (!user.partnerId) return;
    
    setLoading(true);
    try {
      const response = await apiFetch(`/api/partners/${user.partnerId}`);
      if (response.ok) {
        const partnerData = await response.json();
        setPartner(partnerData);
      }
    } catch (error) {
      console.error('Failed to fetch partner info:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUserInfo = () => {
    if (user.role === 'PARTNER' && partner) {
      return (
        <div className={styles.userInfo}>
          <div className={styles.companyInfo}>
            <h3 className={styles.companyName}>{partner.companyName}</h3>
            <p className={styles.managementCompany}>
              {partner.managementCompany && (
                <span>Managed by {partner.managementCompany}</span>
              )}
            </p>
            <div className={styles.businessDetails}>
              <span className={styles.unitCount}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                {partner.numberOfLoungeUnits} Units
              </span>
              {partner.city && partner.state && (
                <span className={styles.location}>
                  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {partner.city}, {partner.state}
                </span>
              )}
            </div>
          </div>
          <div className={styles.userRole}>
            <span className={`${styles.roleBadge} ${styles.partner}`}>Partner</span>
          </div>
        </div>
      );
    }

    // Admin/Support users
    return (
      <div className={styles.userInfo}>
        <div className={styles.profileInfo}>
          <h3 className={styles.userName}>{user.displayName || user.email}</h3>
          <p className={styles.userEmail}>{user.email}</p>
        </div>
        <div className={styles.userRole}>
          <span className={`${styles.roleBadge} ${user.role?.toLowerCase() === 'admin' ? styles.admin : styles.support}`}>
            {user.role === 'ADMIN' ? 'Administrator' : 'Support Team'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.brandSection}>
          <div className={styles.logoContainer}>
            <svg className={styles.logo} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div className={styles.brandText}>
              <h1 className={styles.title}>Pool Safe Inc</h1>
              <p className={styles.subtitle}>Support Partner Portal</p>
            </div>
          </div>
        </div>

        <div className={styles.userSection}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
            </div>
          ) : (
            renderUserInfo()
          )}
          
          <div className={styles.actions}>
            {onAccessibilitySettings && (
              <button 
                className={styles.accessibilityButton}
                onClick={onAccessibilitySettings}
                aria-label="Open accessibility settings"
                title="Accessibility Settings"
              >
                <svg className={styles.accessibilityIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                </svg>
              </button>
            )}
            
            {onLogout && (
              <button 
                className={styles.logoutButton}
                onClick={onLogout}
                aria-label="Logout"
              >
                <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;