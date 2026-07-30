import React, { useState, useEffect } from 'react';
import { 
  Bell, Activity, Settings, Archive, Trash2, CheckCircle2, AlertCircle, Info, Watch, Search, Shield, UploadCloud
} from 'lucide-react';
import { apiClient } from '../../api';

interface Notification {
  id: string;
  title?: string;
  text: string;
  event_type: string;
  priority: string;
  is_read: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  module?: string;
  device?: string;
  browser?: string;
  ip_address?: string;
  timestamp: string;
}

export const NotificationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'activity' | 'preferences'>('notifications');
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [preferences, setPreferences] = useState<any>({});
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('newest'); // newest, oldest, high, unread
  
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let queryParams = `?limit=100`;
      if (searchQuery) queryParams += `&search=${searchQuery}`;
      if (filter === 'unread') queryParams += `&unread_only=true`;
      if (filter === 'high') queryParams += `&priority=high`;
      
      const res = await apiClient.get('/notifications/' + queryParams);
      let items = res.data.items || [];
      if (filter === 'oldest') {
        items = items.reverse(); // Simplified oldest sort
      }
      setNotifications(items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/notifications/activity?limit=100' + (searchQuery ? `&search=${searchQuery}` : ''));
      setActivities(res.data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await apiClient.get('/auth/profile/full'); // Get settings from full profile endpoint
      if (res.data && res.data.settings) {
        setPreferences(res.data.settings);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'activity') {
      fetchActivities();
    } else if (activeTab === 'preferences') {
      fetchPreferences();
    }
  }, [activeTab, searchQuery, filter]);

  const markAllRead = async () => {
    try {
      await apiClient.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      import('../../state').then(m => m.useAuthStore.getState().fetchNotifications());
    } catch (error) {
      console.error(error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      import('../../state').then(m => m.useAuthStore.getState().fetchNotifications());
    } catch (error) {
      console.error(error);
    }
  };

  const archiveNotif = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/archive`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_archived: !n.is_archived } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // update unreadCount in store
      import('../../state').then(m => m.useAuthStore.getState().fetchNotifications());
    } catch (error) {
      console.error(error);
    }
  };

  const deleteAllNotifs = async () => {
    try {
      await apiClient.delete(`/notifications`);
      setNotifications([]);
      import('../../state').then(m => m.useAuthStore.getState().fetchNotifications());
    } catch (error) {
      console.error(error);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    try {
      setPreferences((prev: any) => ({ ...prev, [key]: value }));
      await apiClient.put('/notifications/preferences', { [key]: value });
    } catch (error) {
      console.error(error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'high': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'medium': return <Info className="w-5 h-5 text-blue-500" />;
      case 'low': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 p-8 overflow-auto max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 mb-2">
            Notification Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400">View your alerts, recent activities, and communication settings.</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-2 px-1 text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 ${
            activeTab === 'notifications' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-2 px-1 text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 ${
            activeTab === 'activity' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-2 px-1 text-sm font-medium flex items-center space-x-2 transition-colors border-b-2 ${
            activeTab === 'preferences' ? 'border-indigo-500 text-indigo-600 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Preferences</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-6 min-h-[500px]">
        {activeTab !== 'preferences' && (
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {activeTab === 'notifications' && (
              <div className="flex items-center space-x-3">
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="high">High Priority</option>
                  <option value="unread">Unread Only</option>
                </select>
                <button onClick={markAllRead} className="px-4 py-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg text-sm font-medium transition-colors">
                  Mark All Read
                </button>
                <button onClick={deleteAllNotifs} className="px-4 py-2 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:text-red-300 rounded-lg text-sm font-medium transition-colors">
                  Delete All
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-12">No notifications found.</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`flex items-start justify-between p-4 rounded-lg border ${notif.is_read ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800' : 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-500/30'} transition-all`}>
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">{getPriorityIcon(notif.priority)}</div>
                        <div>
                          <h4 className={`text-sm font-medium ${notif.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                            {notif.title || notif.event_type}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notif.text}</p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 block">
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notif.is_read && (
                          <button onClick={() => markAsRead(notif.id)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors" title="Mark as Read">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => archiveNotif(notif.id)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Archive">
                          <Archive className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteNotif(notif.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-8">
                {activities.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-12">No activities recorded.</div>
                ) : (
                  activities.map(log => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-9 top-1 bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                        {log.action.includes('LOGIN') ? <Shield className="w-4 h-4 text-green-500 dark:text-green-400" /> : <UploadCloud className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                      </span>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">{log.action.replace(/_/g, ' ')}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.details}</p>
                        <div className="flex space-x-4 mt-2">
                          <span className="text-xs text-gray-500 flex items-center"><Watch className="w-3 h-3 mr-1" /> {new Date(log.timestamp).toLocaleString()}</span>
                          {log.device && <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{log.device}</span>}
                          {log.browser && <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{log.browser}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive alerts via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={preferences.email_notifications ?? true} onChange={(e) => updatePreference('email_notifications', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Toast Alerts</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Show on-screen popups</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={preferences.toast_alerts ?? true} onChange={(e) => updatePreference('toast_alerts', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Sound Alerts</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Play sound for new notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={preferences.sound_alerts ?? true} onChange={(e) => updatePreference('sound_alerts', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Desktop Notifications</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Show OS level notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={preferences.desktop_notifications ?? false} onChange={(e) => updatePreference('desktop_notifications', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
