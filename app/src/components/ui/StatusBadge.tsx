import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending:    { bg: "#fef9c3", color: "#854d0e", label: "Pending"    },
    processing: { bg: "#dbeafe", color: "#1e40af", label: "Processing" },
    shipped:    { bg: "#ede9fe", color: "#5b21b6", label: "Shipped"    },
    delivered:  { bg: "#dcfce7", color: "#14532d", label: "Delivered"  },
    cancelled:  { bg: "#fee2e2", color: "#7f1d1d", label: "Cancelled"  },
    failed:     { bg: "#fee2e2", color: "#7f1d1d", label: "Failed"     },
    refunded:   { bg: "#f1f5f9", color: "#475569", label: "Refunded"   },
    approved:   { bg: "#dcfce7", color: "#14532d", label: "Approved"   },
    active:     { bg: "#dcfce7", color: "#14532d", label: "Active"     },
    inactive:   { bg: "#fee2e2", color: "#7f1d1d", label: "Inactive"   },
  };
  
  const c = cfg[status] ?? cfg["pending"];
  
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontSize: 11,
      fontWeight: 600,
      padding: "3px 9px",
      borderRadius: 20,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.04em"
    }}>
      {c.label}
    </span>
  );
}


