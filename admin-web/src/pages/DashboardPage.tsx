import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { API_ENDPOINTS } from '../config/api';
import KpiCard from '../components/KpiCard';
import PageCard from '../components/PageCard';
import DataTable from '../components/DataTable';
import { apiCall, getDataPayload } from '../lib/http';
import { readItems } from '../lib/normalize';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const activityChart = useMemo(() => {
    const buckets = recentActivity.reduce<Record<string, number>>((acc, row) => {
      const rawType = String(row?.type || 'other');
      const key = rawType
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const labels = entries.length > 0 ? entries.map(([label]) => label) : ['Users', 'Bookings', 'Revenue'];
    const values =
      entries.length > 0
        ? entries.map(([, value]) => value)
        : [
            Number(stats?.users?.total || 0),
            Number(stats?.bookings?.total || 0),
            Math.max(1, Math.round(Number(stats?.revenue?.total || 0) / 1000)),
          ];

    return {
      data: {
        labels,
        datasets: [
          {
            label: entries.length > 0 ? 'Events' : 'KPI Snapshot',
            data: values,
            backgroundColor: 'rgba(254, 136, 0, 0.75)',
            borderColor: '#FE8800',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false as const,
            hoverBackgroundColor: 'rgba(255, 174, 77, 0.9)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#D4D4D8',
              boxWidth: 14,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#B8B8B8' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#B8B8B8' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
          },
        },
      },
    };
  }, [recentActivity, stats]);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, realtimeRes] = await Promise.all([
          apiCall(API_ENDPOINTS.DASHBOARD_STATS),
          apiCall(API_ENDPOINTS.ANALYTICS.REALTIME),
        ]);
        const s = getDataPayload(statsRes);
        const r = getDataPayload(realtimeRes);
        setStats(s || {});
        setRecentActivity(readItems(r?.recentActivity ? { data: r.recentActivity } : r));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="bg-light rounded p-4">Loading dashboard...</div>;
  }

  return (
    <>
      <div className="row g-4 mb-4">
        <KpiCard icon="bi bi-people" title="Total Users" value={stats?.users?.total || 0} />
        <KpiCard icon="bi bi-person-check" title="Active Users" value={stats?.users?.active || 0} />
        <KpiCard icon="bi bi-receipt" title="Total Bookings" value={stats?.bookings?.total || 0} />
        <KpiCard icon="bi bi-currency-rupee" title="Total Revenue" value={`₹${stats?.revenue?.total || 0}`} />
      </div>

      <PageCard title="Realtime Data Visualization" subtitle="Live distribution of recent events and key activity">
        <div className="dashboard-chart-wrap">
          <Bar data={activityChart.data} options={activityChart.options} />
        </div>
      </PageCard>

      <PageCard title="Recent Activity" subtitle="Latest admin-side transactional events">
        <DataTable
          rows={recentActivity.slice(0, 12)}
          columns={[
            { key: 'bookingId', label: 'Reference' },
            { key: 'type', label: 'Type' },
            {
              key: 'name',
              label: 'User',
              render: (row) => row.passengerName || row.driverName || '-',
            },
            {
              key: 'amount',
              label: 'Amount',
              render: (row) => `₹${row.amount || row.totalAmount || 0}`,
            },
            {
              key: 'createdAt',
              label: 'Date',
              render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'),
            },
          ]}
        />
      </PageCard>
    </>
  );
}
