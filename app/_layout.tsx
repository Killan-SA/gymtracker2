import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { getDb } from '../lib/database';
import { COLORS } from '../constants/theme';

// Empêche le splash screen de se fermer automatiquement
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Initialise la base de données au démarrage
    try {
      getDb();
    } catch (error) {
      console.error('Erreur d\'initialisation de la BDD :', error);
    } finally {
      // Cache le splash screen
      SplashScreen.hideAsync();
    }
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="session/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Séance en cours',
            headerBackTitle: ' ',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Détail de la séance',
            headerBackTitle: ' ',
          }}
        />
        <Stack.Screen
          name="exercises/[name]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Progression',
            headerBackTitle: ' ',
          }}
        />
        <Stack.Screen
          name="import"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.surface },
            headerTintColor: COLORS.textPrimary,
            headerTitle: 'Importer un historique',
            headerBackTitle: ' ',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
