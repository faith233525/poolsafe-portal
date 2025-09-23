import React, { useState } from "react";
import styles from "./App.module.css";

const initialState = {
  companyName: "",
  managementCompany: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  numberOfLoungeUnits: 0,
  topColour: "",
  latitude: "",
  longitude: "",
  lock: "",
  masterCode: "",
  subMasterCode: "",
  lockPart: "",
  key: "",
};

export default function PartnerForm({
  onSubmit,
  initialData,
  role,
}: {
  onSubmit: (data: any) => void;
  initialData?: any;
  role: string;
}) {
  const [form, setForm] = useState(initialData || initialState);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Basic validation
    if (
      !form.companyName ||
      !form.streetAddress ||
      !form.city ||
      !form.state ||
      !form.zip ||
      !form.country
    ) {
      setError("Please fill all required fields.");
      return;
    }
    onSubmit(form);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>{initialData ? "Edit Partner" : "Add Partner"}</h2>
      {error && <div className={styles.error}>{error}</div>}
      <input
        name="companyName"
        value={form.companyName}
        onChange={handleChange}
        placeholder="Company Name"
        required
      />
      <input
        name="managementCompany"
        value={form.managementCompany}
        onChange={handleChange}
        placeholder="Management Company"
      />
      <input
        name="streetAddress"
        value={form.streetAddress}
        onChange={handleChange}
        placeholder="Street Address"
        required
      />
      <input name="city" value={form.city} onChange={handleChange} placeholder="City" required />
      <input name="state" value={form.state} onChange={handleChange} placeholder="State" required />
      <input name="zip" value={form.zip} onChange={handleChange} placeholder="Zip" required />
      <input
        name="country"
        value={form.country}
        onChange={handleChange}
        placeholder="Country"
        required
      />
      <input
        name="numberOfLoungeUnits"
        type="number"
        value={form.numberOfLoungeUnits}
        onChange={handleChange}
        placeholder="LounGenie Units"
      />
      <input
        name="topColour"
        value={form.topColour}
        onChange={handleChange}
        placeholder="Top Colour"
      />
      <input name="latitude" value={form.latitude} onChange={handleChange} placeholder="Latitude" />
      <input
        name="longitude"
        value={form.longitude}
        onChange={handleChange}
        placeholder="Longitude"
      />
      {role !== "partner" && (
        <>
          <input name="lock" value={form.lock} onChange={handleChange} placeholder="Lock" />
          <input
            name="masterCode"
            value={form.masterCode}
            onChange={handleChange}
            placeholder="Master Code"
          />
          <input
            name="subMasterCode"
            value={form.subMasterCode}
            onChange={handleChange}
            placeholder="Sub Master Code"
          />
          <input
            name="lockPart"
            value={form.lockPart}
            onChange={handleChange}
            placeholder="Lock Part"
          />
          <input name="key" value={form.key} onChange={handleChange} placeholder="Key" />
        </>
      )}
      <button type="submit">{initialData ? "Update" : "Create"}</button>
    </form>
  );
}
