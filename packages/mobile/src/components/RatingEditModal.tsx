import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PlayerWithRating, DEFAULT_RATING } from '@dupr/core';
import { useGameStore } from '../stores/gameStore';

interface RatingEditModalProps {
  visible: boolean;
  player: PlayerWithRating | null;
  hasCustomRating: boolean;
  onClose: () => void;
  onSave: (rating: number) => void;
  onReset: () => void;
}

const PRESET_RATINGS = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const MIN_RATING = 0;
const MAX_RATING = 8;

export function RatingEditModal({
  visible,
  player,
  hasCustomRating,
  onClose,
  onSave,
  onReset,
}: RatingEditModalProps) {
  const [ratingText, setRatingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setRatingText(player.rating.toFixed(2));
      setError(null);
    }
  }, [player]);

  const validateAndParse = (text: string): number | null => {
    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      return null;
    }
    if (parsed < MIN_RATING || parsed > MAX_RATING) {
      return null;
    }
    return parsed;
  };

  const handleTextChange = (text: string) => {
    // Allow only valid decimal number input
    const sanitized = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    setRatingText(sanitized);
    setError(null);
  };

  const handlePresetPress = (rating: number) => {
    setRatingText(rating.toFixed(2));
    setError(null);
  };

  const handleSave = () => {
    const rating = validateAndParse(ratingText);
    if (rating === null) {
      setError(`Rating must be between ${MIN_RATING} and ${MAX_RATING}`);
      return;
    }
    onSave(rating);
  };

  const handleReset = () => {
    setRatingText(DEFAULT_RATING.toFixed(2));
    onReset();
  };

  if (!player) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <Text style={styles.title}>Edit Player Rating</Text>

            {/* Player Info */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>Player:</Text>
              <Text style={styles.playerName}>{player.name}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={styles.statusValue}>
                {hasCustomRating ? 'Custom rating' : 'Not found in DUPR'}
              </Text>
            </View>

            {/* Rating Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>New Rating:</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={ratingText}
                onChangeText={handleTextChange}
                keyboardType="decimal-pad"
                placeholder="0.00 - 8.00"
                placeholderTextColor="#999"
                maxLength={5}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Quick Select */}
            <View style={styles.quickSelectSection}>
              <Text style={styles.quickSelectLabel}>Quick Select:</Text>
              <View style={styles.presetRow}>
                {PRESET_RATINGS.map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.presetButton,
                      parseFloat(ratingText) === rating && styles.presetButtonActive,
                    ]}
                    onPress={() => handlePresetPress(rating)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        parseFloat(ratingText) === rating && styles.presetButtonTextActive,
                      ]}
                    >
                      {rating.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reset to Default */}
            {hasCustomRating && (
              <TouchableOpacity style={styles.resetLink} onPress={handleReset}>
                <Text style={styles.resetLinkText}>
                  Reset to Default ({DEFAULT_RATING.toFixed(1)})
                </Text>
              </TouchableOpacity>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  playerInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  playerLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    color: '#d97706',
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  quickSelectSection: {
    marginBottom: 16,
  },
  quickSelectLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  presetButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  presetButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  resetLink: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  resetLinkText: {
    fontSize: 14,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
