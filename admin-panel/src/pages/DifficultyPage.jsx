// src/pages/DifficultyPage.jsx - Complete Difficulty Settings Management
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { difficulty, preview } from '../lib/api';
import { toast } from 'sonner';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Save,
  X,
  Clock,
  Target,
  Zap,
  Shuffle,
  Lightbulb,
  TrendingUp,
  Award,
} from 'lucide-react';

export default function DifficultyPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [previewData, setPreviewData] = useState(null);

  // Fetch difficulty settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['difficulty'],
    queryFn: async () => {
      const res = await difficulty.getAll();
      return res.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => difficulty.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['difficulty']);
      toast.success('Settings updated successfully!');
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => difficulty.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['difficulty']);
      toast.success('New difficulty level created!');
      setIsCreating(false);
      setFormData(getDefaultFormData());
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create difficulty');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => difficulty.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['difficulty']);
      toast.success('Difficulty level deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete');
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (data) => preview.settings(data),
    onSuccess: (response) => {
      setPreviewData(response.data.preview);
    },
  });

  function getDefaultFormData() {
    return {
      level: 1,
      names: { en: 'Easy', uz: 'Oson', ru: 'Легко' },
      descriptions: { en: '5 Points + Hints', uz: '5 ball + maslahatlar', ru: '5 очков + подсказки' },
      time_seconds: 180,
      base_points: 5,
      level_multiplier: 2,
      combo_bonus: 1.5,
      combo_penalty: 0.5,
      shuffle_enabled: false,
      shuffle_frequency: 0,
      hints_enabled: true,
      card_colors: {
        text: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fruit: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      },
      is_active: true,
      order: 0,
    };
  }

  function handleEdit(setting) {
    setEditingId(setting.id);
    setFormData({
      level: setting.level,
      names: setting.names,
      descriptions: setting.descriptions,
      time_seconds: setting.time_seconds,
      base_points: setting.base_points,
      level_multiplier: setting.level_multiplier,
      combo_bonus: setting.combo_bonus,
      combo_penalty: setting.combo_penalty,
      shuffle_enabled: setting.shuffle_enabled,
      shuffle_frequency: setting.shuffle_frequency,
      hints_enabled: setting.hints_enabled,
      card_colors: setting.card_colors,
      is_active: setting.is_active,
      order: setting.order,
    });
  }

  function handleSave() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else if (isCreating) {
      createMutation.mutate(formData);
    }
  }

  function handleCancel() {
    setEditingId(null);
    setIsCreating(false);
    setFormData(getDefaultFormData());
    setPreviewData(null);
  }

  function handlePreview() {
    previewMutation.mutate(formData);
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to delete this difficulty level?')) {
      deleteMutation.mutate(id);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Difficulty Settings</h1>
          <p className="text-gray-600 mt-1">Manage game difficulty levels and scoring</p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Add New Level
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isCreating ? 'Create New Difficulty Level' : 'Edit Difficulty Settings'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
              >
                <Eye size={18} />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Settings size={20} />
                Basic Settings
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Multilingual Names */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                <input
                  type="text"
                  value={formData.names.en}
                  onChange={(e) => setFormData({
                    ...formData,
                    names: { ...formData.names, en: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Uzbek)</label>
                <input
                  type="text"
                  value={formData.names.uz}
                  onChange={(e) => setFormData({
                    ...formData,
                    names: { ...formData.names, uz: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Russian)</label>
                <input
                  type="text"
                  value={formData.names.ru}
                  onChange={(e) => setFormData({
                    ...formData,
                    names: { ...formData.names, ru: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Time Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Clock size={16} />
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={formData.time_seconds}
                  onChange={(e) => setFormData({ ...formData, time_seconds: parseInt(e.target.value) })}
                  min="30"
                  max="600"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {Math.floor(formData.time_seconds / 60)}:{(formData.time_seconds % 60).toString().padStart(2, '0')} minutes
                </p>
              </div>
            </div>

            {/* Scoring Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Target size={20} />
                Scoring Settings
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Award size={16} />
                  Base Points
                </label>
                <input
                  type="number"
                  value={formData.base_points}
                  onChange={(e) => setFormData({ ...formData, base_points: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Level Multiplier
                </label>
                <input
                  type="number"
                  value={formData.level_multiplier}
                  onChange={(e) => setFormData({ ...formData, level_multiplier: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Zap size={16} />
                  Combo Bonus
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.combo_bonus}
                  onChange={(e) => setFormData({ ...formData, combo_bonus: parseFloat(e.target.value) })}
                  min="0"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Combo Penalty (on wrong match)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.combo_penalty}
                  onChange={(e) => setFormData({ ...formData, combo_penalty: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Combo reduced to {(formData.combo_penalty * 100).toFixed(0)}% on wrong match
                </p>
              </div>

              {/* Feature Toggles */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shuffle size={18} className="text-indigo-600" />
                  <span className="font-medium text-gray-700">Enable Shuffling</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.shuffle_enabled}
                    onChange={(e) => setFormData({ ...formData, shuffle_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.shuffle_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shuffle Frequency (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.shuffle_frequency}
                    onChange={(e) => setFormData({ ...formData, shuffle_frequency: parseInt(e.target.value) })}
                    min="0"
                    max="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lightbulb size={18} className="text-yellow-600" />
                  <span className="font-medium text-gray-700">Show Hints</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hints_enabled}
                    onChange={(e) => setFormData({ ...formData, hints_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {previewData && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Eye size={20} />
                Game Preview
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Perfect Score</p>
                  <p className="text-2xl font-bold text-indigo-600">{previewData.total_score_perfect}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Avg Points/Match</p>
                  <p className="text-2xl font-bold text-green-600">{previewData.average_points_per_match}</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Time/Match</p>
                  <p className="text-2xl font-bold text-blue-600">{previewData.time_per_match}s</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">Difficulty</p>
                  <p className="text-2xl font-bold text-purple-600">{previewData.estimated_difficulty}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing Settings List */}
      {!isCreating && !editingId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settings?.map((setting) => (
            <div
              key={setting.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{setting.names.en}</h3>
                  <p className="text-sm text-gray-600 mt-1">{setting.descriptions.en}</p>
                </div>
                {!setting.is_active && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock size={16} />
                    Time
                  </span>
                  <span className="font-semibold text-gray-900">
                    {Math.floor(setting.time_seconds / 60)}:{(setting.time_seconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Award size={16} />
                    Points
                  </span>
                  <span className="font-semibold text-gray-900">{setting.base_points}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Zap size={16} />
                    Combo
                  </span>
                  <span className="font-semibold text-gray-900">+{setting.combo_bonus}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Shuffle size={16} />
                    Shuffle
                  </span>
                  <span className="font-semibold text-gray-900">
                    {setting.shuffle_enabled ? `${setting.shuffle_frequency}s` : 'Off'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Lightbulb size={16} />
                    Hints
                  </span>
                  <span className="font-semibold text-gray-900">
                    {setting.hints_enabled ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(setting)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(setting.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
