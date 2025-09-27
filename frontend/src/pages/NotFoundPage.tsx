import React from "react";
import "../styles/error-handling.css";

const NotFoundPage: React.FC = () => {
  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleContactSupport = () => {
    window.location.href = "/support";
  };

  return (
    <div className="not-found-page">
      <div className="not-found-page__container">
        <h1 className="not-found-page__code">404</h1>
        <h2 className="not-found-page__title">Page Not Found</h2>
        <p className="not-found-page__message">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
          back on track.
        </p>

        <div className="not-found-page__actions">
          <button
            onClick={handleGoHome}
            className="not-found-page__button not-found-page__button--primary"
          >
            Go Home
          </button>

          <button onClick={handleGoBack} className="not-found-page__button">
            Go Back
          </button>

          <button onClick={handleContactSupport} className="not-found-page__button">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
