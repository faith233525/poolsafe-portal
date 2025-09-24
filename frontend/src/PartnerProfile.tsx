import React, { useEffect, useState } from "react";
import styles from "./App.module.css";

export default function PartnerProfile({ partnerId, role }: { partnerId: string; role: string }) {
  const [partner, setPartner] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartner() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/partners/${partnerId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load partner");
        setPartner(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPartner();
  }, [partnerId]);

  if (loading) return <div>Loading partner info...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!partner) return <div>No partner found.</div>;

  return (
    <div className={styles.card}>
      <h2>Partner Profile</h2>
      <div>
        <b>Company:</b> {partner.companyName}
      </div>
      <div>
        <b>Management Company:</b> {partner.managementCompany}
      </div>
      <div>
        <b>Address:</b> {partner.streetAddress}, {partner.city}, {partner.state}, {partner.zip},{" "}
        {partner.country}
      </div>
      <div>
        <b>LounGenie Units:</b> {partner.numberOfLoungeUnits}
      </div>
      <div>
        <b>Top Colour:</b> {partner.topColour}
      </div>
      <div>
        <b>Map:</b> Lat {partner.latitude}, Long {partner.longitude}
      </div>
      {role !== "partner" && (
        <>
          <div>
            <b>Lock:</b> {partner.lock}
          </div>
          <div>
            <b>Master Code:</b> {partner.masterCode}
          </div>
          <div>
            <b>Sub Master Code:</b> {partner.subMasterCode}
          </div>
          <div>
            <b>Lock Part:</b> {partner.lockPart}
          </div>
          <div>
            <b>Key:</b> {partner.key}
          </div>
        </>
      )}
      <div>
        <b>Created:</b> {new Date(partner.createdAt).toLocaleString()}
      </div>
      <div>
        <b>Updated:</b> {new Date(partner.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
