'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  Settings, 
  Mail, 
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Truck,
  MapPin,
  RotateCcw,
  Eye,
  Send,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  ChevronDown,
  Search,
  Filter,
  BarChart3
} from 'lucide-react'
import {
  getNotificationStatus,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationTemplates,
  toggleNotificationTemplate,
  getNotificationLogs,
  getNotificationStats,
  seedNotificationTemplates
} from '@/lib/api'

// Types
interface NotificationSettings {
  sender: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    footerText: string;
  };
  socialLinks: {
    instagram: string;
    facebook: string;
    twitter: string;
    website: string;
  };
  defaults: {
    includeOrderItems: boolean;
    includeShippingAddress: boolean;
    includeTrackingLink: boolean;
  };
}

interface NotificationTemplate {
  _id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  trigger: string;
  subject: string;
  stats: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalFailed: number;
  };
}

interface NotificationLog {
  _id: string;
  type: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
}

interface Stats {
  overview: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  byType: Record<string, { sent: number; delivered: number; opened: number }>;
}

// Tab definitions
const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'templates', label: 'Templates', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'history', label: 'History', icon: History },
]

// Template icons mapping
const templateIcons: Record<string, any> = {
  order_shipped: Package,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  delivery_exception: AlertCircle,
  delivery_attempt_failed: RotateCcw,
  address_issue: MapPin,
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serviceEnabled, setServiceEnabled] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filters for history
  const [logFilters, setLogFilters] = useState({
    type: '',
    status: '',
    search: ''
  })

  // Load initial data
  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      // Check service status
      const statusRes = await getNotificationStatus()
      setServiceEnabled(statusRes.enabled)
      
      // Load all data in parallel
      const [settingsRes, templatesRes, logsRes, statsRes] = await Promise.all([
        getNotificationSettings().catch(() => null),
        getNotificationTemplates().catch(() => ({ templates: [] })),
        getNotificationLogs({ limit: 50 }).catch(() => ({ logs: [] })),
        getNotificationStats().catch(() => null)
      ])
      
      if (settingsRes?.settings) setSettings(settingsRes.settings)
      if (templatesRes?.templates) setTemplates(templatesRes.templates)
      if (logsRes?.logs) setLogs(logsRes.logs)
      if (statsRes) setStats(statsRes)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Save settings
  async function handleSaveSettings() {
    if (!settings) return
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      await updateNotificationSettings(settings)
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Toggle template
  async function handleToggleTemplate(type: string) {
    try {
      const result = await toggleNotificationTemplate(type)
      setTemplates(prev => prev.map(t => 
        t.type === type ? { ...t, enabled: result.enabled } : t
      ))
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Seed default templates
  async function handleSeedTemplates() {
    try {
      const result = await seedNotificationTemplates()
      setTemplates(result.templates)
      setSuccess('Default templates created!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilters.type && log.type !== logFilters.type) return false
    if (logFilters.status && log.status !== logFilters.status) return false
    if (logFilters.search) {
      const search = logFilters.search.toLowerCase()
      if (!log.orderNumber?.toLowerCase().includes(search) &&
          !log.recipientEmail?.toLowerCase().includes(search)) {
        return false
      }
    }
    return true
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Manage email notifications for shipments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Service Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            serviceEnabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {serviceEnabled ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Resend Connected
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Resend Not Configured
              </>
            )}
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {!serviceEnabled && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Resend API Key Required</p>
              <p className="text-sm text-yellow-700 mt-1">
                To send email notifications, configure your Resend API key in Heroku:
              </p>
              <code className="block mt-2 text-xs bg-yellow-100 px-3 py-2 rounded font-mono">
                heroku config:set RESEND_API_KEY=re_xxxxxxxxxx
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-pickle-600 text-pickle-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} templates={templates} />
      )}
      
      {activeTab === 'templates' && (
        <TemplatesTab 
          templates={templates} 
          onToggle={handleToggleTemplate}
          onSeed={handleSeedTemplates}
        />
      )}
      
      {activeTab === 'settings' && settings && (
        <SettingsTab 
          settings={settings} 
          onChange={setSettings}
          onSave={handleSaveSettings}
          saving={saving}
        />
      )}
      
      {activeTab === 'history' && (
        <HistoryTab 
          logs={filteredLogs}
          filters={logFilters}
          onFilterChange={setLogFilters}
        />
      )}
    </div>
  )
}

// ========================================
// OVERVIEW TAB
// ========================================
function OverviewTab({ stats, templates }: { stats: Stats | null; templates: NotificationTemplate[] }) {
  const overview = stats?.overview || {
    total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0
  }
  
  const openRate = overview.delivered > 0 
    ? ((overview.opened / overview.delivered) * 100).toFixed(1) 
    : '0'
  
  const clickRate = overview.opened > 0
    ? ((overview.clicked / overview.opened) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Sent</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{overview.sent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{overview.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Open Rate</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{openRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Click Rate</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{clickRate}%</p>
        </div>
      </div>

      {/* Template Performance */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Performance</h3>
        <div className="space-y-4">
          {templates.map(template => {
            const Icon = templateIcons[template.type] || Mail
            const templateOpenRate = template.stats.totalDelivered > 0
              ? ((template.stats.totalOpened / template.stats.totalDelivered) * 100).toFixed(1)
              : '0'
            
            return (
              <div key={template._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${template.enabled ? 'bg-pickle-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${template.enabled ? 'text-pickle-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">
                      {template.stats.totalSent} sent · {templateOpenRate}% open rate
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  template.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {template.enabled ? 'Active' : 'Disabled'}
                </div>
              </div>
            )
          })}
          
          {templates.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No templates configured yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ========================================
// TEMPLATES TAB
// ========================================
function TemplatesTab({ 
  templates, 
  onToggle,
  onSeed 
}: { 
  templates: NotificationTemplate[]
  onToggle: (type: string) => void
  onSeed: () => void
}) {
  return (
    <div className="space-y-6">
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
          <p className="text-gray-500 mb-4">Create default notification templates to get started</p>
          <button
            onClick={onSeed}
            className="px-4 py-2 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700"
          >
            Create Default Templates
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(template => {
            const Icon = templateIcons[template.type] || Mail
            
            return (
              <div 
                key={template._id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${template.enabled ? 'bg-pickle-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-6 h-6 ${template.enabled ? 'text-pickle-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          template.trigger === 'auto_after_label' 
                            ? 'bg-blue-100 text-blue-700'
                            : template.trigger === 'ups_webhook'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {template.trigger === 'auto_after_label' ? 'Auto' : 
                           template.trigger === 'ups_webhook' ? 'Webhook' : 'Manual'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Subject:</span> {template.subject}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>{template.stats.totalSent} sent</span>
                        <span>{template.stats.totalDelivered} delivered</span>
                        <span>{template.stats.totalOpened} opened</span>
                        <span>{template.stats.totalFailed} failed</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    onClick={() => onToggle(template.type)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      template.enabled ? 'bg-pickle-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      template.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ========================================
// SETTINGS TAB
// ========================================
function SettingsTab({ 
  settings, 
  onChange, 
  onSave,
  saving 
}: { 
  settings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
  onSave: () => void
  saving: boolean
}) {
  const updateSender = (field: string, value: string) => {
    onChange({
      ...settings,
      sender: { ...settings.sender, [field]: value }
    })
  }
  
  const updateBranding = (field: string, value: string) => {
    onChange({
      ...settings,
      branding: { ...settings.branding, [field]: value }
    })
  }
  
  const updateSocial = (field: string, value: string) => {
    onChange({
      ...settings,
      socialLinks: { ...settings.socialLinks, [field]: value }
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Sender Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sender Information</h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input
              type="text"
              value={settings.sender.fromName}
              onChange={(e) => updateSender('fromName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="Jersey Pickles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input
              type="email"
              value={settings.sender.fromEmail}
              onChange={(e) => updateSender('fromEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="shipping@jerseypickles.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To Email</label>
            <input
              type="email"
              value={settings.sender.replyTo}
              onChange={(e) => updateSender('replyTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="support@jerseypickles.com"
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={settings.branding.logoUrl}
              onChange={(e) => updateBranding('logoUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://jerseypickles.com/logo.png"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.branding.primaryColor}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.branding.primaryColor}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.branding.secondaryColor}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.branding.secondaryColor}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
            <textarea
              value={settings.branding.footerText}
              onChange={(e) => updateBranding('footerText', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="© 2024 Jersey Pickles. All rights reserved."
            />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={settings.socialLinks.website}
              onChange={(e) => updateSocial('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://jerseypickles.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <input
              type="url"
              value={settings.socialLinks.instagram}
              onChange={(e) => updateSocial('instagram', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://instagram.com/jerseypickles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
            <input
              type="url"
              value={settings.socialLinks.facebook}
              onChange={(e) => updateSocial('facebook', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://facebook.com/jerseypickles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
            <input
              type="url"
              value={settings.socialLinks.twitter}
              onChange={(e) => updateSocial('twitter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
              placeholder="https://twitter.com/jerseypickles"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-pickle-600 text-white rounded-lg hover:bg-pickle-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ========================================
// HISTORY TAB
// ========================================
function HistoryTab({ 
  logs, 
  filters,
  onFilterChange 
}: { 
  logs: NotificationLog[]
  filters: { type: string; status: string; search: string }
  onFilterChange: (filters: any) => void
}) {
  const statusColors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    opened: 'bg-purple-100 text-purple-700',
    clicked: 'bg-indigo-100 text-indigo-700',
    failed: 'bg-red-100 text-red-700',
    bounced: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Search by order # or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
          />
        </div>
        <select
          value={filters.type}
          onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
        >
          <option value="">All Types</option>
          <option value="order_shipped">Shipped</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="delivery_exception">Exception</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickle-500 focus:border-pickle-500"
        >
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(log => {
              const Icon = templateIcons[log.type] || Mail
              
              return (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{log.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {log.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{log.recipientName}</p>
                      <p className="text-xs text-gray-500">{log.recipientEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[log.status] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.sentAt 
                      ? new Date(log.sentAt).toLocaleString()
                      : new Date(log.createdAt).toLocaleString()
                    }
                  </td>
                </tr>
              )
            })}
            
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  No notifications found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}