import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { GameType } from '@dupr/core';
import { PlayerInputScreen } from './PlayerInputScreen';
import { GameService } from '../services/gameService';
import { useNavigation } from '@react-navigation/native';

interface GameTypeOption {
  type: GameType;
  title: string;
  description: string;
}

const GAME_TYPES: GameTypeOption[] = [
  {
    type: GameType.DUPR_LADDER,
    title: 'DUPR Ladder',
    description: 'Individual player rankings',
  },
  {
    type: GameType.PARTNER_DUPR,
    title: 'Partner DUPR',
    description: 'Team pairs with combined ratings',
  },
];

export function GameScreen() {
  const navigation = useNavigation();
  const { format, inputText, setFormat, setResults, setHtml, setProcessing, setError, isProcessing } = useGameStore();
  const { token } = useAuthStore();
  const [showInput, setShowInput] = useState(false);

  const handleSelectFormat = (gameType: GameType) => {
    setFormat(gameType);
    setShowInput(true);
  };

  const handleBack = () => {
    setShowInput(false);
    setError(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please log in again.');
      setProcessing(false);
      return;
    }

    if (!format) {
      Alert.alert('Error', 'Please select a game format first.');
      setProcessing(false);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create GameService instance using auth token
      console.log('[GameScreen] Starting game processing...');
      const gameService = new GameService(token);

      // Process the input based on format
      console.log('[GameScreen] Calling gameService.process...');
      const result = await gameService.process(format, inputText);
      console.log('[GameScreen] gameService.process returned, players:',
        result.players.map(p => ({ name: p.name, rating: p.rating, ratingType: typeof p.rating })));

      // Store results in gameStore
      console.log('[GameScreen] Setting results...');
      const pools = result.teams ? undefined : getPools(result.players);
      console.log('[GameScreen] Pools calculated:', pools ? pools.length : 'none');

      setResults({
        players: result.players,
        teams: result.teams,
        pools: pools,
      });
      console.log('[GameScreen] Results set successfully');

      setHtml(result.html);
      console.log('[GameScreen] HTML set successfully');

      // Navigate to Results tab
      navigation.navigate('Results' as never);
    } catch (err) {
      console.error('[GameScreen] Error processing game:', err);
      console.error('[GameScreen] Error stack:', err instanceof Error ? err.stack : 'no stack');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Processing Error', errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [token, format, inputText, setResults, setHtml, setProcessing, setError, navigation]);

  // Helper function to extract pools from players
  // This is a temporary solution until we refactor the core library to return pools directly
  const getPools = (players: { rating: number; [key: string]: unknown }[]) => {
    // Simple grouping by rating range for now
    // This should ideally use the distributePlayersToPool function from core
    const sorted = [...players].sort((a, b) => b.rating - a.rating);
    const poolSize = 5;
    const numPools = Math.ceil(sorted.length / poolSize);

    const pools = [];
    for (let i = 0; i < numPools; i++) {
      const poolName = String.fromCharCode(65 + i); // A, B, C, D...
      const start = i * poolSize;
      const end = Math.min(start + poolSize, sorted.length);
      pools.push({
        name: poolName,
        players: sorted.slice(start, end),
      });
    }
    return pools;
  };

  // If format is selected and user wants to input players, show PlayerInputScreen
  if (showInput && format) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          disabled={isProcessing}
        >
          <Text style={styles.backButtonText}>← Back to Format Selection</Text>
        </TouchableOpacity>
        <PlayerInputScreen onSubmit={handleSubmit} />

        {/* Loading overlay */}
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Processing players...</Text>
              <Text style={styles.loadingSubtext}>Looking up ratings on DUPR</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Otherwise, show format selection
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Game Format</Text>
      <Text style={styles.subtitle}>Choose the type of game you want to organize</Text>

      <View style={styles.optionsContainer}>
        {GAME_TYPES.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.card,
              format === option.type && styles.cardSelected,
            ]}
            onPress={() => handleSelectFormat(option.type)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.cardTitle,
              format === option.type && styles.cardTitleSelected,
            ]}>
              {option.title}
            </Text>
            <Text style={[
              styles.cardDescription,
              format === option.type && styles.cardDescriptionSelected,
            ]}>
              {option.description}
            </Text>
            {format === option.type && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  optionsContainer: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  cardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardTitleSelected: {
    color: '#1976D2',
  },
  cardDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  cardDescriptionSelected: {
    color: '#1565C0',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
