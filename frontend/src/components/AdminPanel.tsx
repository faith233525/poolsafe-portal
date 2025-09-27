import React, { useState, useEffect } from "react";
import styles from "./AdminPanel.module.css";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  partnerId?: string;
  partner?: {
    id: string;
    companyName: string;
  };
  createdAt: string;
}

interface Partner {
  id: string;
  companyName: string;
  city?: string;
  state?: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showLockInfo, setShowLockInfo] = useState(false);
  const [showViewLockInfo, setShowViewLockInfo] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [currentLockInfo, setCurrentLockInfo] = useState<any>(null);

  // Add User Form State
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "SUPPORT",
    partnerId: "",
  });

  // Add Partner Form State
  const [newPartner, setNewPartner] = useState({
    companyName: "",
    managementCompany: "",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
    numberOfLoungeUnits: 0,
    topColour: "",
    userEmail: "",
    userPass: "",
  });

  // Lock Information Form State
  const [lockInfo, setLockInfo] = useState({
    topColour: "",
    lock: "",
    masterCode: "",
    subMasterCode: "",
    lockPart: "",
    key: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchPartners();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchPartners = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPartners(data.data || data);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        await fetchUsers();
        setNewUser({ email: "", password: "", displayName: "", role: "SUPPORT", partnerId: "" });
        setShowAddUser(false);
        alert("User created successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user");
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPartner),
      });

      if (response.ok) {
        await fetchPartners();
        setNewPartner({
          companyName: "",
          managementCompany: "",
          streetAddress: "",
          city: "",
          state: "",
          zip: "",
          country: "USA",
          numberOfLoungeUnits: 0,
          topColour: "",
          userEmail: "",
          userPass: "",
        });
        setShowAddPartner(false);
        alert("Partner created successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating partner:", error);
      alert("Failed to create partner");
    }
  };

  const handleUpdateLockInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) return;

    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch(`/api/partners/${selectedPartnerId}/lock-info`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(lockInfo),
      });

      if (response.ok) {
        setLockInfo({
          topColour: "",
          lock: "",
          masterCode: "",
          subMasterCode: "",
          lockPart: "",
          key: "",
        });
        setShowLockInfo(false);
        setSelectedPartnerId("");
        alert("Lock information updated successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating lock information:", error);
      alert("Failed to update lock information");
    }
  };

  const fetchLockInfo = async (partnerId: string) => {
    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch(`/api/partners/${partnerId}/lock-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error fetching lock information:", error);
    }
    return null;
  };

  const openLockInfoModal = async (partnerId: string) => {
    setSelectedPartnerId(partnerId);

    // Load existing lock information
    const existingData = await fetchLockInfo(partnerId);
    if (existingData) {
      setLockInfo({
        topColour: existingData.topColour || "",
        lock: existingData.lock || "",
        masterCode: existingData.masterCode || "",
        subMasterCode: existingData.subMasterCode || "",
        lockPart: existingData.lockPart || "",
        key: existingData.key || "",
      });
    }

    setShowLockInfo(true);
  };

  const viewLockInfo = async (partnerId: string, companyName: string) => {
    const lockData = await fetchLockInfo(partnerId);
    setCurrentLockInfo({ ...lockData, companyName });
    setShowViewLockInfo(true);
  };

  if (loading) return <div className={styles.loading}>Loading admin panel...</div>;

  return (
    <div className={styles.adminPanel}>
      <h2 className={styles.title}>Admin Panel - User Management</h2>

      {/* Quick Actions */}
      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={() => setShowAddUser(true)}>
          + Add Support Staff
        </button>
        <button className={styles.primaryButton} onClick={() => setShowAddPartner(true)}>
          + Add Partner
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Add New User</h3>
            <form onSubmit={handleAddUser} className={styles.form}>
              <div className={styles.field}>
                <label>Email:</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Display Name:</label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label>Role:</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="SUPPORT">Support Staff</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="PARTNER">Partner User</option>
                </select>
              </div>

              {newUser.role === "PARTNER" && (
                <>
                  <div className={styles.field}>
                    <label>Partner:</label>
                    <select
                      value={newUser.partnerId}
                      onChange={(e) => setNewUser({ ...newUser, partnerId: e.target.value })}
                      required
                    >
                      <option value="">Select a partner...</option>
                      {partners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Password:</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>
                </>
              )}

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.submitButton}>
                  Create User
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowAddUser(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Partner Modal */}
      {showAddPartner && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Add New Partner</h3>
            <form onSubmit={handleAddPartner} className={styles.form}>
              <div className={styles.field}>
                <label>Company Name:</label>
                <input
                  type="text"
                  value={newPartner.companyName}
                  onChange={(e) => setNewPartner({ ...newPartner, companyName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Management Company:</label>
                <input
                  type="text"
                  value={newPartner.managementCompany}
                  onChange={(e) =>
                    setNewPartner({ ...newPartner, managementCompany: e.target.value })
                  }
                />
              </div>

              <div className={styles.field}>
                <label>Street Address:</label>
                <input
                  type="text"
                  value={newPartner.streetAddress}
                  onChange={(e) => setNewPartner({ ...newPartner, streetAddress: e.target.value })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label>City:</label>
                  <input
                    type="text"
                    value={newPartner.city}
                    onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })}
                  />
                </div>

                <div className={styles.field}>
                  <label>State:</label>
                  <input
                    type="text"
                    value={newPartner.state}
                    onChange={(e) => setNewPartner({ ...newPartner, state: e.target.value })}
                  />
                </div>

                <div className={styles.field}>
                  <label>ZIP:</label>
                  <input
                    type="text"
                    value={newPartner.zip}
                    onChange={(e) => setNewPartner({ ...newPartner, zip: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Number of Lounge Units:</label>
                <input
                  type="number"
                  value={newPartner.numberOfLoungeUnits}
                  onChange={(e) =>
                    setNewPartner({ ...newPartner, numberOfLoungeUnits: parseInt(e.target.value) })
                  }
                  min={0}
                />
              </div>

              <div className={styles.field}>
                <label>Top Colour:</label>
                <input
                  type="text"
                  value={newPartner.topColour}
                  onChange={(e) => setNewPartner({ ...newPartner, topColour: e.target.value })}
                />
              </div>

              <hr className={styles.divider} />
              <h4>Create Partner User Account</h4>

              <div className={styles.field}>
                <label>User Email:</label>
                <input
                  type="email"
                  value={newPartner.userEmail}
                  onChange={(e) => setNewPartner({ ...newPartner, userEmail: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label>User Password:</label>
                <input
                  type="password"
                  value={newPartner.userPass}
                  onChange={(e) => setNewPartner({ ...newPartner, userPass: e.target.value })}
                  minLength={8}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.submitButton}>
                  Create Partner
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowAddPartner(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className={styles.section}>
        <h3>Users ({users.length})</h3>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div>Email</div>
            <div>Name</div>
            <div>Role</div>
            <div>Partner</div>
            <div>Created</div>
          </div>
          {users.map((user) => (
            <div key={user.id} className={styles.tableRow}>
              <div>{user.email}</div>
              <div>{user.displayName}</div>
              <div>
                <span className={`${styles.roleBadge} ${styles[user.role.toLowerCase()]}`}>
                  {user.role}
                </span>
              </div>
              <div>{user.partner?.companyName || "-"}</div>
              <div>{new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Partners List */}
      <div className={styles.section}>
        <h3>Partners ({partners.length})</h3>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div>Company Name</div>
            <div>Location</div>
            <div>Units</div>
            <div>Actions</div>
          </div>
          {partners.map((partner) => (
            <div key={partner.id} className={styles.tableRow}>
              <div>{partner.companyName}</div>
              <div>{partner.city && partner.state ? `${partner.city}, ${partner.state}` : "-"}</div>
              <div>{(partner as any).numberOfLoungeUnits || 0}</div>
              <div>
                <button
                  onClick={() => viewLockInfo(partner.id, partner.companyName)}
                  className={`${styles.smallButton} ${styles.buttonSpacing}`}
                  title="View lock information"
                >
                  View
                </button>
                <button
                  onClick={() => openLockInfoModal(partner.id)}
                  className={styles.smallButton}
                  title="Manage lock information"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lock Information Modal */}
      {showLockInfo && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Manage Lock Information</h3>
            <form onSubmit={handleUpdateLockInfo} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="topColour">Top Colour:</label>
                <input
                  id="topColour"
                  type="text"
                  value={lockInfo.topColour}
                  onChange={(e) => setLockInfo({ ...lockInfo, topColour: e.target.value })}
                  placeholder="Enter top colour"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="lock">Lock:</label>
                <select
                  id="lock"
                  value={lockInfo.lock}
                  onChange={(e) => setLockInfo({ ...lockInfo, lock: e.target.value })}
                >
                  <option value="">Select lock type</option>
                  <option value="MAKE">MAKE</option>
                  <option value="L&F">L&F</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="masterCode">Master Code:</label>
                <input
                  id="masterCode"
                  type="text"
                  value={lockInfo.masterCode}
                  onChange={(e) => setLockInfo({ ...lockInfo, masterCode: e.target.value })}
                  placeholder="Enter master code"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="subMasterCode">Sub Master Code:</label>
                <input
                  id="subMasterCode"
                  type="text"
                  value={lockInfo.subMasterCode}
                  onChange={(e) => setLockInfo({ ...lockInfo, subMasterCode: e.target.value })}
                  placeholder="Enter sub master code"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="lockPart">Lock Part:</label>
                <input
                  id="lockPart"
                  type="text"
                  value={lockInfo.lockPart}
                  onChange={(e) => setLockInfo({ ...lockInfo, lockPart: e.target.value })}
                  placeholder="Enter lock part information"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="key">Key:</label>
                <input
                  id="key"
                  type="text"
                  value={lockInfo.key}
                  onChange={(e) => setLockInfo({ ...lockInfo, key: e.target.value })}
                  placeholder="Enter key information"
                />
              </div>

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.submitButton}>
                  Update Lock Info
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowLockInfo(false);
                    setSelectedPartnerId("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Lock Information Modal */}
      {showViewLockInfo && currentLockInfo && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Lock Information - {currentLockInfo.companyName}</h3>
            <div className={styles.form}>
              <div className={styles.field}>
                <label>Top Colour:</label>
                <div className={styles.readOnlyValue}>
                  {currentLockInfo.topColour || "Not specified"}
                </div>
              </div>

              <div className={styles.field}>
                <label>Lock:</label>
                <div className={styles.readOnlyValue}>
                  {currentLockInfo.lock || "Not specified"}
                </div>
              </div>

              <div className={styles.field}>
                <label>Master Code:</label>
                <div className={styles.readOnlyValue}>
                  {currentLockInfo.masterCode || "Not specified"}
                </div>
              </div>

              <div className={styles.field}>
                <label>Sub Master Code:</label>
                <div className={styles.readOnlyValue}>
                  {currentLockInfo.subMasterCode || "Not specified"}
                </div>
              </div>

              <div className={styles.field}>
                <label>Lock Part:</label>
                <div className={styles.readOnlyValue}>
                  {currentLockInfo.lockPart || "Not specified"}
                </div>
              </div>

              <div className={styles.field}>
                <label>Key:</label>
                <div className={styles.readOnlyValue}>{currentLockInfo.key || "Not specified"}</div>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowViewLockInfo(false);
                    setCurrentLockInfo(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
