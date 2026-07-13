"use client";

export function SkeletonLoading() {
  return (
    <div className="skeleton-screen">
      <div className="skeleton-layout">
        <div className="skeleton-sidebar">
          <div className="skeleton-block" style={{ height: 40, width: "80%", marginBottom: 16 }} />
          <div className="skeleton-block" style={{ height: 12, width: "60%", marginBottom: 8 }} />
          <div className="skeleton-block" style={{ height: 12, width: "70%", marginBottom: 8 }} />
          <div className="skeleton-block" style={{ height: 12, width: "50%", marginBottom: 8 }} />
          <div className="skeleton-block" style={{ height: 12, width: "65%" }} />
        </div>
        <div className="skeleton-main">
          <div className="skeleton-header" />
          <div className="skeleton-thread">
            <div className="skeleton-message assistant">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-block" style={{ height: 14, width: "40%" }} />
                <div className="skeleton-block" style={{ height: 14, width: "80%" }} />
                <div className="skeleton-block" style={{ height: 14, width: "60%" }} />
              </div>
            </div>
            <div className="skeleton-message user">
              <div className="skeleton-lines">
                <div className="skeleton-block" style={{ height: 14, width: "50%" }} />
                <div className="skeleton-block" style={{ height: 14, width: "30%" }} />
              </div>
            </div>
            <div className="skeleton-message assistant">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-block" style={{ height: 14, width: "70%" }} />
                <div className="skeleton-block" style={{ height: 14, width: "45%" }} />
              </div>
            </div>
          </div>
          <div className="skeleton-composer">
            <div className="skeleton-block" style={{ height: 44, width: "100%", borderRadius: 26 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
