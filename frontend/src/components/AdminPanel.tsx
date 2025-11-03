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

  // Upload & Import State
  const [showAssets, setShowAssets] = useState(false);
  const [showPartnerImport, setShowPartnerImport] = useState(false);
  const [showUserImport, setShowUserImport] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [partnerImportFile, setPartnerImportFile] = useState<File | null>(null);
  const [userImportFile, setUserImportFile] = useState<File | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

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

  // Logo Upload Handler
  const handleLogoUpload = async () => {
    if (!logoFile) {
      alert("Please select a logo file");
      return;
    }

    try {
      setUploadProgress("Uploading logo...");
      const token = localStorage.getItem("jwt");
      const formData = new FormData();
      formData.append("file", logoFile);

      const response = await fetch("/api/assets/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentLogo(data.url);
        setLogoFile(null);
        setUploadProgress("");
        alert("Logo uploaded successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        setUploadProgress("");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo");
      setUploadProgress("");
    }
  };

  // Video Upload Handler
  const handleVideoUpload = async () => {
    if (!videoFile) {
      alert("Please select a video file");
      return;
    }

    try {
      setUploadProgress("Uploading video...");
      const token = localStorage.getItem("jwt");
      const formData = new FormData();
      formData.append("file", videoFile);

      const response = await fetch("/api/assets/video", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        setVideoFile(null);
        setUploadProgress("");
        alert("Video uploaded successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        setUploadProgress("");
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video");
      setUploadProgress("");
    }
  };

  // Partner CSV Import Handler
  const handlePartnerImport = async (dryRun: boolean = false) => {
    if (!partnerImportFile) {
      alert("Please select a CSV or Excel file");
      return;
    }

    try {
      setUploadProgress(dryRun ? "Previewing import..." : "Importing partners...");
      const token = localStorage.getItem("jwt");
      const formData = new FormData();
      formData.append("file", partnerImportFile);

      const url = dryRun ? "/api/partners/import?dryRun=true" : "/api/partners/import";
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (dryRun) {
          alert(`Preview: ${data.created} new, ${data.updated} updated partners`);
        } else {
          alert(`Success: ${data.created} created, ${data.updated} updated partners`);
          setPartnerImportFile(null);
          setShowPartnerImport(false);
          await fetchPartners();
        }
        setUploadProgress("");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        setUploadProgress("");
      }
    } catch (error) {
      console.error("Error importing partners:", error);
      alert("Failed to import partners");
      setUploadProgress("");
    }
  };

  // User CSV Import Handler
  const handleUserImport = async (dryRun: boolean = false) => {
    if (!userImportFile) {
      alert("Please select a CSV or Excel file");
      return;
    }

    try {
      setUploadProgress(dryRun ? "Previewing import..." : "Importing users...");
      const token = localStorage.getItem("jwt");
      const formData = new FormData();
      formData.append("file", userImportFile);

      const url = dryRun ? "/api/users/import?dryRun=true" : "/api/users/import";
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (dryRun) {
          alert(`Preview: ${data.created} new, ${data.updated} updated users`);
        } else {
          alert(`Success: ${data.created} created, ${data.updated} updated users`);
          setUserImportFile(null);
          setShowUserImport(false);
          await fetchUsers();
        }
        setUploadProgress("");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        setUploadProgress("");
      }
    } catch (error) {
      console.error("Error importing users:", error);
      alert("Failed to import users");
      setUploadProgress("");
    }
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
        <button className={styles.primaryButton} onClick={() => setShowAssets(true)}>
          🎨 Manage Assets
        </button>
        <button className={styles.primaryButton} onClick={() => setShowPartnerImport(true)}>
          📊 Import Partners
        </button>
        <button className={styles.primaryButton} onClick={() => setShowUserImport(true)}>
          👥 Import Users
        </button>
      </div>

      {uploadProgress && (
        <div className={styles.progressMessage}>{uploadProgress}</div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Add New User</h3>
            <form onSubmit={handleAddUser} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="user-email">Email:</label>
                <input
                  id="user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  aria-label="User email address"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="user-displayname">Display Name:</label>
                <input
                  id="user-displayname"
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  aria-label="User display name"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="user-role">Role:</label>
                <select
                  id="user-role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  aria-label="User role"
                >
                  <option value="SUPPORT">Support Staff</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="PARTNER">Partner User</option>
                </select>
              </div>

              {newUser.role === "PARTNER" && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="user-partner">Partner:</label>
                    <select
                      id="user-partner"
                      value={newUser.partnerId}
                      onChange={(e) => setNewUser({ ...newUser, partnerId: e.target.value })}
                      required
                      aria-label="Select partner"
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
                    <label htmlFor="user-password">Password:</label>
                    <input
                      id="user-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      aria-label="User password"
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
                <label htmlFor="partner-company">Company Name:</label>
                <input
                  id="partner-company"
                  type="text"
                  value={newPartner.companyName}
                  onChange={(e) => setNewPartner({ ...newPartner, companyName: e.target.value })}
                  required
                  aria-label="Partner company name"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="partner-management">Management Company:</label>
                <input
                  id="partner-management"
                  type="text"
                  value={newPartner.managementCompany}
                  onChange={(e) =>
                    setNewPartner({ ...newPartner, managementCompany: e.target.value })
                  }
                  aria-label="Management company name"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="partner-address">Street Address:</label>
                <input
                  id="partner-address"
                  type="text"
                  value={newPartner.streetAddress}
                  onChange={(e) => setNewPartner({ ...newPartner, streetAddress: e.target.value })}
                  aria-label="Street address"
                />
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label htmlFor="partner-city">City:</label>
                  <input
                    id="partner-city"
                    type="text"
                    value={newPartner.city}
                    onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })}
                    aria-label="City"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="partner-state">State:</label>
                  <input
                    id="partner-state"
                    type="text"
                    value={newPartner.state}
                    onChange={(e) => setNewPartner({ ...newPartner, state: e.target.value })}
                    aria-label="State"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="partner-zip">ZIP:</label>
                  <input
                    id="partner-zip"
                    type="text"
                    value={newPartner.zip}
                    onChange={(e) => setNewPartner({ ...newPartner, zip: e.target.value })}
                    aria-label="ZIP code"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="partner-units">Number of Lounge Units:</label>
                <input
                  id="partner-units"
                  type="number"
                  value={newPartner.numberOfLoungeUnits}
                  onChange={(e) =>
                    setNewPartner({ ...newPartner, numberOfLoungeUnits: parseInt(e.target.value) })
                  }
                  min={0}
                  aria-label="Number of lounge units"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="partner-colour">Top Colour:</label>
                <input
                  id="partner-colour"
                  type="text"
                  value={newPartner.topColour}
                  onChange={(e) => setNewPartner({ ...newPartner, topColour: e.target.value })}
                  aria-label="Top colour"
                />
              </div>

              <hr className={styles.divider} />
              <h4>Create Partner User Account</h4>

              <div className={styles.field}>
                <label htmlFor="partner-user-email">User Email:</label>
                <input
                  id="partner-user-email"
                  type="email"
                  value={newPartner.userEmail}
                  onChange={(e) => setNewPartner({ ...newPartner, userEmail: e.target.value })}
                  aria-label="Partner user email"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="partner-user-password">User Password:</label>
                <input
                  id="partner-user-password"
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

      {/* Assets Management Modal */}
      {showAssets && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>🎨 Asset Management</h3>
            <div className={styles.form}>
              {/* Logo Upload */}
              <div className={styles.uploadSection}>
                <h4>Company Logo</h4>
                {currentLogo && (
                  <div className={styles.logoPreview}>
                    <img src={currentLogo} alt="Current Logo" style={{ maxWidth: "200px" }} />
                  </div>
                )}
                <div className={styles.field}>
                  <label htmlFor="logo-upload">Upload New Logo (PNG, JPG, SVG, WebP):</label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  {logoFile && <div className={styles.fileName}>{logoFile.name}</div>}
                </div>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleLogoUpload}
                  disabled={!logoFile}
                >
                  Upload Logo
                </button>
              </div>

              <hr className={styles.divider} />

              {/* Video Upload */}
              <div className={styles.uploadSection}>
                <h4>Training Videos</h4>
                <div className={styles.field}>
                  <label htmlFor="video-upload">Upload Video (MP4, WebM, MOV, AVI - max 100MB):</label>
                  <input
                    id="video-upload"
                    type="file"
                    accept=".mp4,.webm,.mov,.avi"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                  {videoFile && <div className={styles.fileName}>{videoFile.name}</div>}
                </div>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleVideoUpload}
                  disabled={!videoFile}
                >
                  Upload Video
                </button>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowAssets(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partner Import Modal */}
      {showPartnerImport && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>📊 Import Partners (CSV/Excel)</h3>
            <div className={styles.form}>
              <div className={styles.importInstructions}>
                <p><strong>Required columns:</strong> companyName</p>
                <p><strong>Optional columns:</strong> managementCompany, streetAddress, city, state, zip, country, numberOfLoungeUnits, topColour, latitude, longitude</p>
                <p><em>Note: Existing partners will be updated by company name.</em></p>
              </div>

              <div className={styles.field}>
                <label htmlFor="partner-import-file">Select CSV or Excel file:</label>
                <input
                  id="partner-import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setPartnerImportFile(e.target.files?.[0] || null)}
                />
                {partnerImportFile && <div className={styles.fileName}>{partnerImportFile.name}</div>}
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handlePartnerImport(true)}
                  disabled={!partnerImportFile}
                >
                  Preview Import
                </button>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={() => handlePartnerImport(false)}
                  disabled={!partnerImportFile}
                >
                  Import Now
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowPartnerImport(false);
                    setPartnerImportFile(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Import Modal */}
      {showUserImport && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>👥 Import Support Users (CSV/Excel)</h3>
            <div className={styles.form}>
              <div className={styles.importInstructions}>
                <p><strong>Required columns:</strong> email</p>
                <p><strong>Optional columns:</strong> displayName, role (ADMIN or SUPPORT), password</p>
                <p><em>Note: If password is not provided, it defaults to "ChangeMe123!!"</em></p>
                <p><em>Existing users will be updated by email.</em></p>
              </div>

              <div className={styles.field}>
                <label htmlFor="user-import-file">Select CSV or Excel file:</label>
                <input
                  id="user-import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setUserImportFile(e.target.files?.[0] || null)}
                />
                {userImportFile && <div className={styles.fileName}>{userImportFile.name}</div>}
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleUserImport(true)}
                  disabled={!userImportFile}
                >
                  Preview Import
                </button>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={() => handleUserImport(false)}
                  disabled={!userImportFile}
                >
                  Import Now
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowUserImport(false);
                    setUserImportFile(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
