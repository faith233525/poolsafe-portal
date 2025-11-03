import React, { useEffect, useState, useMemo, useRef } from "react";
import { apiFetch } from "./utils/api";
import styles from "./App.module.css";

interface Partner {
  id: string;
  companyName: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  createdAt?: string;
}

interface MapCluster {
  id: string;
  x: number;
  y: number;
  partners: Partner[];
  type: "single" | "cluster";
}

interface Tooltip {
  x: number;
  y: number;
  partner: Partner | Partner[];
  visible: boolean;
}

export default function PartnerMap({ role: _role }: { role: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [tooltip, setTooltip] = useState<Tooltip>({
    x: 0,
    y: 0,
    partner: null as any,
    visible: false,
  });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const CLUSTER_DISTANCE = 30;
  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 500;

  useEffect(() => {
    async function fetchPartners() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("jwt");
        const res = await apiFetch("/api/partners/map", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load partners");
        setPartners(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  // Filter partners based on selected criteria
  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const statusMatch = selectedStatus === "all" || partner.status === selectedStatus;
      const regionMatch = selectedRegion === "all" || partner.state === selectedRegion;
      return statusMatch && regionMatch;
    });
  }, [partners, selectedStatus, selectedRegion]);

  // Get unique statuses and regions for filters
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(partners.map((p) => p.status).filter(Boolean))),
    [partners],
  );
  const uniqueRegions = useMemo(
    () => Array.from(new Set(partners.map((p) => p.state).filter(Boolean))),
    [partners],
  );

  // Create clusters from filtered partners
  const clusters = useMemo(() => {
    if (!filteredPartners.length) return [];

    const clusters: MapCluster[] = [];
    const processed = new Set<string>();

    filteredPartners.forEach((partner) => {
      if (processed.has(partner.id)) return;

      const x = MAP_WIDTH / 2 + (partner.longitude || 0) * 4;
      const y = MAP_HEIGHT / 2 - (partner.latitude || 0) * 4;

      // Find nearby partners for clustering
      const nearbyPartners = filteredPartners.filter((p) => {
        if (processed.has(p.id) || p.id === partner.id) return false;

        const px = MAP_WIDTH / 2 + (p.longitude || 0) * 4;
        const py = MAP_HEIGHT / 2 - (p.latitude || 0) * 4;
        const distance = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));

        return distance < CLUSTER_DISTANCE;
      });

      // Mark all partners in this cluster as processed
      processed.add(partner.id);
      nearbyPartners.forEach((p) => processed.add(p.id));

      const allPartnersInCluster = [partner, ...nearbyPartners];

      clusters.push({
        id: `cluster-${partner.id}`,
        x,
        y,
        partners: allPartnersInCluster,
        type: allPartnersInCluster.length > 1 ? "cluster" : "single",
      });
    });

    return clusters;
  }, [filteredPartners]);

  // Get color based on partner status
  const getPartnerColor = (partner: Partner) => {
    switch (partner.status?.toLowerCase()) {
      case "active":
        return "#28a745"; // Green
      case "inactive":
        return "#6c757d"; // Gray
      case "pending":
        return "#ffc107"; // Yellow
      case "suspended":
        return "#dc3545"; // Red
      default:
        return "#0077cc"; // Blue (default)
    }
  };

  // Get CSS class based on partner status
  const getPartnerStatusClass = (partner: Partner) => {
    switch (partner.status?.toLowerCase()) {
      case "active":
        return styles.statusActive;
      case "inactive":
        return styles.statusInactive;
      case "pending":
        return styles.statusPending;
      case "suspended":
        return styles.statusSuspended;
      default:
        return styles.statusDefault;
    }
  };

  // Handle mouse events for tooltips
  const handleMouseEnter = (event: React.MouseEvent, cluster: MapCluster) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
        partner: cluster.type === "single" ? cluster.partners[0] : cluster.partners,
        visible: true,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!tooltip.visible) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip((prev) => ({
        ...prev,
        x: event.clientX - rect.left + 10,
        y: event.clientY - rect.top - 10,
      }));
    }
  };

  // Handle pan and zoom
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 0) {
      // Left mouse button
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseMoveGlobal = (event: MouseEvent) => {
    if (!isPanning) return;

    const deltaX = event.clientX - lastPanPoint.x;
    const deltaY = event.clientY - lastPanPoint.y;

    setPanOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    setLastPanPoint({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  };

  useEffect(() => {
    if (isPanning) {
      document.addEventListener("mousemove", handleMouseMoveGlobal);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMoveGlobal);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isPanning, lastPanPoint]);

  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (loading) return <div>Loading enhanced map...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.card}>
      <h2>Interactive Partner Map</h2>

      {/* Controls */}
      <div className={styles.mapControls}>
        <div className={styles.mapControlGroup}>
          <label htmlFor="status-filter" className={styles.mapLabel}>
            Status:
          </label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.mapSelect}
            title="Filter partners by status"
          >
            <option value="all">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.mapControlGroup}>
          <label htmlFor="region-filter" className={styles.mapLabel}>
            Region:
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className={styles.mapSelect}
            title="Filter partners by region"
          >
            <option value="all">All Regions</option>
            {uniqueRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.mapControlGroup}>
          <button
            onClick={resetView}
            onKeyDown={(e) => e.key === "Enter" && resetView()}
            className={styles.mapButton}
          >
            Reset View
          </button>
        </div>

        <div className={styles.mapStats}>
          Partners: {filteredPartners.length} | Clusters: {clusters.length} | Zoom:{" "}
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Map Container */}
      <div className={styles.mapContainer}>
        <svg
          ref={svgRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className={`${styles.mapSvg} ${isPanning ? styles.mapSvgGrabbing : styles.mapSvgGrab}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
        >
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Clusters */}
            {clusters.map((cluster) => {
              const isCluster = cluster.type === "cluster";
              const radius = isCluster ? 15 + Math.min(cluster.partners.length * 2, 20) : 10;
              const color = isCluster ? "#ff6b35" : getPartnerColor(cluster.partners[0]);

              return (
                <g key={cluster.id}>
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={radius}
                    fill={color}
                    stroke="#fff"
                    strokeWidth="2"
                    opacity="0.8"
                    className={styles.mapPointer}
                    onMouseEnter={(e) => handleMouseEnter(e, cluster)}
                    onMouseLeave={handleMouseLeave}
                  />

                  {/* Cluster count for multiple partners */}
                  {isCluster && (
                    <text
                      x={cluster.x}
                      y={cluster.y + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {cluster.partners.length}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className={styles.tooltip}
            // Use CSS variables to avoid inline style lint violation while preserving dynamic positioning
            {...{
              style: {
                ["--tooltip-left" as any]: `${tooltip.x}px`,
                ["--tooltip-top" as any]: `${tooltip.y}px`,
              },
            }}
          >
            {Array.isArray(tooltip.partner) ? (
              <div>
                <div className={styles.tooltipHeader}>
                  Cluster ({tooltip.partner.length} partners)
                </div>
                {tooltip.partner.slice(0, 3).map((partner) => (
                  <div key={partner.id} className={styles.tooltipItem}>
                    • {partner.companyName} - {partner.city}, {partner.state}
                  </div>
                ))}
                {tooltip.partner.length > 3 && (
                  <div className={styles.tooltipMore}>...and {tooltip.partner.length - 3} more</div>
                )}
              </div>
            ) : (
              <div>
                <div className={styles.tooltipCompany}>{tooltip.partner.companyName}</div>
                <div>
                  {tooltip.partner.city}, {tooltip.partner.state}
                </div>
                {tooltip.partner.status && (
                  <div className={styles.tooltipStatus}>
                    Status:{" "}
                    <span
                      className={`${styles.tooltipStatusSpan} ${getPartnerStatusClass(tooltip.partner)}`}
                    >
                      {tooltip.partner.status}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Legend:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={styles.legendColorActive}></div>
            Active
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColorPending}></div>
            Pending
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColorInactive}></div>
            Inactive
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColorSuspended}></div>
            Suspended
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColorCluster}></div>
            Multiple Partners
          </div>
        </div>
        <div className={styles.legendHint}>
          💡 Use mouse wheel to zoom, drag to pan, hover for details
        </div>
      </div>

      {/* Partner List */}
      <div className={styles.partnerList}>
        <h3 className={styles.partnerListHeader}>Partner Directory ({filteredPartners.length})</h3>
        <div className={styles.partnerListContainer}>
          {filteredPartners.map((partner) => (
            <div key={partner.id} className={styles.partnerListItem}>
              <div className={styles.partnerInfo}>
                <div className={styles.partnerCompany}>{partner.companyName}</div>
                <div className={styles.partnerLocation}>
                  {partner.city}, {partner.state}
                </div>
              </div>
              {partner.status && (
                <span className={`${styles.partnerStatus} ${getPartnerStatusClass(partner)}`}>
                  {partner.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
