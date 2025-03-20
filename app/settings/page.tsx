'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserSettings } from '@/types';
import { loadUserSettings, saveUserSettings, getDefaultUserSettings } from '@/app/utils/settings';

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({} as UserSettings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const userSettings = loadUserSettings();
    setSettings(userSettings);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setSettings({
      ...settings,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    });
    
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserSettings(settings);
    setIsSaved(true);
    
    // Reset saved indicator after 3 seconds
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <div className="mb-6">
        <Link 
          href="/"
          className="text-blue-500 hover:text-blue-700 flex items-center"
        >
          &larr; Back to Chat
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={settings.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={settings.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
              Theme
            </label>
            <select
              id="theme"
              name="theme"
              value={settings.theme}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <select
              id="fontSize"
              name="fontSize"
              value={settings.fontSize}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifications"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
              Enable Notifications
            </label>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Settings
          </button>
          
          {isSaved && (
            <span className="text-green-600 text-sm">
              Settings saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
} 