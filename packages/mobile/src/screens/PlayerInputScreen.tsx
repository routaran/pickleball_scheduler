import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { GameService } from '../services/gameService';
import { GameType, isValidPickleBrosCount, distributePlayersToPool, TokenExpiredError } from '@dupr/core';
import { useNavigation } from '@react-navigation/native';

export function PlayerInputScreen({ onSubmit }: { onSubmit?: () => void }) {
  const navigation = useNavigation();
  const { format, inputText, setInputText, setProcessing, setResults, setHtml, setError } = useGameStore();
  const { token, logout } = useAuthStore();

  const getPlaceholder = () => {
    switch (format) {
      case GameType.DUPR_LADDER:
        return 'Enter player names, one per line:\n\nJohn Smith\nJane Doe\nBob Wilson';
      case GameType.PARTNER_DUPR:
        return 'Enter team pairs:\n\nJohn Smith / Jane Doe\nBob Wilson / Alice Brown';
      case GameType.PICKLEBROS_MONDAY:
        return 'Enter player names (multiple of 4):\n\nPlayer 1\nPlayer 2\nPlayer 3\nPlayer 4';
      default:
        return 'Enter player names...';
    }
  };

  const validateInput = (): boolean => {
    // Format-specific validation
    switch (format) {
      case GameType.DUPR_LADDER: {
        // Check if input is empty
        if (!inputText || inputText.trim().length === 0) {
          Alert.alert('Validation Error', 'Please enter at least one player name.');
          return false;
        }
        // Split by newline and count non-empty lines
        const lines = inputText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          Alert.alert('Validation Error', 'Please enter at least one player name.');
          return false;
        }

        // Check for max players (100)
        if (lines.length > 100) {
          Alert.alert(
            'Validation Error',
            'Maximum 100 players allowed for DUPR Ladder format.'
          );
          return false;
        }

        return true;
      }

      case GameType.PARTNER_DUPR: {
        // Check if input is empty
        if (!inputText || inputText.trim().length === 0) {
          Alert.alert('Validation Error', 'Please enter at least one team pair.');
          return false;
        }

        // Split by newline and validate team pairs
        const lines = inputText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          Alert.alert('Validation Error', 'Please enter at least one team pair.');
          return false;
        }

        // Check each line has "/" delimiter
        const invalidLines = lines.filter((line) => !line.includes('/'));
        if (invalidLines.length > 0) {
          Alert.alert(
            'Validation Error',
            'Each team must be formatted as "Player1 / Player2". Please check your input.'
          );
          return false;
        }

        // Check for max teams (50)
        if (lines.length > 50) {
          Alert.alert(
            'Validation Error',
            'Maximum 50 teams allowed for Partner DUPR format.'
          );
          return false;
        }

        return true;
      }

      case GameType.PICKLEBROS_MONDAY: {
        // Check if input is empty
        if (!inputText || inputText.trim().length === 0) {
          Alert.alert('Validation Error', 'Please enter at least 4 player names.');
          return false;
        }

        // Split by newline and count players
        const lines = inputText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          Alert.alert('Validation Error', 'Please enter at least 4 player names.');
          return false;
        }

        // Check if player count is multiple of 4
        if (!isValidPickleBrosCount(lines.length)) {
          Alert.alert(
            'Validation Error',
            `PickleBros format requires a multiple of 4 players. You entered ${lines.length} player(s).`
          );
          return false;
        }

        return true;
      }

      default:
        Alert.alert('Error', 'Please select a game format first.');
        return false;
    }
  };

  const handleSubmit = async () => {
    // Validate input first
    if (!validateInput()) {
      return;
    }

    // Check authentication
    if (!token) {
      Alert.alert('Error', 'Not authenticated. Please log in again.');
      return;
    }

    // Check format is selected
    if (!format) {
      Alert.alert('Error', 'Please select a game format first.');
      return;
    }

    try {
      // Set processing state and clear errors
      setProcessing(true);
      setError(null);

      // Create GameService instance with auth token
      const service = new GameService(token);

      // Process the input based on format
      const result = await service.process(format, inputText);

      // Store results in gameStore
      setResults({
        players: result.players,
        teams: result.teams,
        pools: result.teams ? undefined : distributePlayersToPool(result.players),
      });
      setHtml(result.html);

      // Navigate to Results tab after successful processing
      navigation.navigate('Results' as never);

      // Call optional callback if provided (for backwards compatibility)
      onSubmit?.();
    } catch (error) {
      // Handle token expiration specially
      if (error instanceof TokenExpiredError) {
        console.log('[PlayerInputScreen] Token expired - logging out');
        logout();
        Alert.alert(
          'Session Expired',
          'Your DUPR session has expired. Please log in again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Processing Error', errorMessage);
    } finally {
      // Always clear processing state
      setProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Enter Players</Text>
          <Text style={styles.subtitle}>
            Format: {format ? format.replace(/_/g, ' ').toUpperCase() : 'Not selected'}
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder={getPlaceholder()}
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
            autoCapitalize="words"
            autoCorrect={false}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.clearButton, !inputText && styles.buttonDisabled]}
              onPress={() => setInputText('')}
              disabled={!inputText}
            >
              <Text style={[styles.clearButtonText, !inputText && styles.clearButtonTextDisabled]}>Clear List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.processButton, !format && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!format}
            >
              <Text style={styles.buttonText}>Process</Text>
            </TouchableOpacity>
          </View>

          {!format && (
            <Text style={styles.warningText}>
              Please select a game format from the Game Type Selector first.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    maxHeight: 400,
    backgroundColor: '#f9f9f9',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  processButton: {
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButtonText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButtonTextDisabled: {
    color: '#999',
  },
  warningText: {
    marginTop: 12,
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
});
