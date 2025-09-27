import React, { useState } from "react";

const FeedbackForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !message) {
      setError("All fields are required.");
      return;
    }
    // Simulate API call
    try {
      // Replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSubmitted(true);
    } catch {
      setError("Failed to submit feedback. Please try again.");
    }
  };

  if (submitted) {
    return <div className="feedback-success">Thank you for your feedback!</div>;
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <h2>Feedback</h2>
      {error && <div className="feedback-error">{error}</div>}
      <label>
        Name:
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Email:
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Message:
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
};

export default FeedbackForm;
