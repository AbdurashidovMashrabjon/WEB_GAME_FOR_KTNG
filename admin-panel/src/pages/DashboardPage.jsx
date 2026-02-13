// src/pages/DashboardPage.jsx - Main Dashboard with Analytics
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analytics } from '../lib/api';
import {
  TrendingUp,
  Users,
  Gamepad2,
  Gift,
  Award,
  Clock,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await analytics.getOverview(30);
      return res.data;
    },
  });

  const { data: topPlayers } = useQuery({
    queryKey: ['top-players'],
    queryFn: async () => {
      const res = await analytics.getPlayers();
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Players',
      value: overview?.overview?.total_players || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      name: 'Total Sessions',
      value: overview?.overview?.total_sessions || 0,
      icon: Gamepad2,
      color: 'bg-green-500',
      change: '+23%',
    },
    {
      name: 'Active Sessions',
      value: overview?.overview?.active_sessions_period || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+8%',
    },
    {
      name: 'Promo Codes',
      value: `${overview?.overview?.claimed_promos || 0}/${overview?.overview?.total_promos || 0}`,
      icon: Gift,
      color: 'bg-pink-500',
      change: `${overview?.overview?.claim_rate || 0}%`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to Fruit Game Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className="text-sm font-semibold text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Chart */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Sessions (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overview?.daily_sessions || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} sessions`, 'Sessions']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Difficulty Stats */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance by Difficulty</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={overview?.difficulty_stats || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="level"
                tickFormatter={(value) => {
                  const names = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
                  return names[value] || `Level ${value}`;
                }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg_score" fill="#10b981" name="Avg Score" />
              <Bar dataKey="total_games" fill="#6366f1" name="Total Games" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Difficulty Stats Details */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Difficulty Level Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview?.difficulty_stats?.map((stat) => (
            <div
              key={stat.level}
              className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  {stat.level === 1 ? '🌱 Easy' : stat.level === 2 ? '⚡ Medium' : '🔥 Hard'}
                </h4>
                <span className="text-sm text-gray-600">{stat.total_games} games</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Award size={16} />
                    Avg Score
                  </span>
                  <span className="font-semibold text-gray-900">{stat.avg_score}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock size={16} />
                    Avg Duration
                  </span>
                  <span className="font-semibold text-gray-900">{stat.avg_duration}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Players */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Players</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Games Played
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Best Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topPlayers?.slice(0, 10).map((player, index) => (
                <tr key={player.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="font-semibold text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-500">{player.phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                    {player.total_games}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {player.best_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                    {player.avg_score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
