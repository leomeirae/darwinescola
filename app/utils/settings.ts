import { UserSettings } from './types';

/**
 * Valor padrão para as configurações do usuário
 */
export function getDefaultUserSettings(): UserSettings {
  return {
    id: 'default',
    name: '',
    email: '',
    theme: 'light' as const,
    fontSize: 'medium' as const,
    notifications: true
  };
}

/**
 * Carrega as configurações do usuário do localStorage
 */
export function loadUserSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return getDefaultUserSettings();
  }
  
  try {
    const settings = localStorage.getItem('userSettings');
    if (!settings) {
      return getDefaultUserSettings();
    }
    
    return JSON.parse(settings) as UserSettings;
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    return getDefaultUserSettings();
  }
}

/**
 * Salva as configurações do usuário no localStorage
 */
export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
} 