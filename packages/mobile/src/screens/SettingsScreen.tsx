import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AuthService, getOverrides, saveOverride, deleteOverride } from '../services';
import type { PlayerOverride } from '../services';

export function SettingsScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [overrides, setOverrides] = useState<PlayerOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOverride, setEditingOverride] = useState<PlayerOverride | null>(null);
  const [formData, setFormData] = useState({
    searchName: '',
    duprId: '',
    displayName: '',
    rating: '',
  });

  // Load overrides on mount
  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    try {
      setLoading(true);
      const loaded = await getOverrides();
      setOverrides(loaded);
    } catch (error) {
      console.error('Failed to load overrides:', error);
      Alert.alert('Error', 'Failed to load player overrides');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await AuthService.logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  const handleAddOverride = () => {
    setEditingOverride(null);
    setFormData({
      searchName: '',
      duprId: '',
      displayName: '',
      rating: '',
    });
    setModalVisible(true);
  };

  const handleEditOverride = (override: PlayerOverride) => {
    setEditingOverride(override);
    setFormData({
      searchName: override.searchName,
      duprId: override.duprId,
      displayName: override.displayName,
      rating: String(typeof override.rating === 'number' ? override.rating : 0),
    });
    setModalVisible(true);
  };

  const handleSaveOverride = async () => {
    // Validate form
    if (!formData.searchName.trim()) {
      Alert.alert('Validation Error', 'Search name is required');
      return;
    }
    if (!formData.duprId.trim()) {
      Alert.alert('Validation Error', 'DUPR ID is required');
      return;
    }
    if (!formData.displayName.trim()) {
      Alert.alert('Validation Error', 'Display name is required');
      return;
    }

    const rating = parseFloat(formData.rating);
    if (isNaN(rating) || rating < 0 || rating > 8) {
      Alert.alert('Validation Error', 'Rating must be a number between 0 and 8');
      return;
    }

    try {
      const override: PlayerOverride = {
        searchName: formData.searchName.trim(),
        duprId: formData.duprId.trim(),
        displayName: formData.displayName.trim(),
        rating,
      };

      await saveOverride(override);
      await loadOverrides();
      setModalVisible(false);
      Alert.alert('Success', 'Player override saved');
    } catch (error) {
      console.error('Failed to save override:', error);
      Alert.alert('Error', 'Failed to save override. Please try again.');
    }
  };

  const handleDeleteOverride = (override: PlayerOverride) => {
    Alert.alert(
      'Delete Override',
      `Are you sure you want to delete the override for "${override.searchName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOverride(override.searchName);
              await loadOverrides();
              Alert.alert('Success', 'Override deleted');
            } catch (error) {
              console.error('Failed to delete override:', error);
              Alert.alert('Error', 'Failed to delete override. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Player Overrides Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Overrides</Text>
        <Text style={styles.sectionDescription}>
          Override player lookups with specific DUPR IDs and ratings
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : overrides.length === 0 ? (
          <Text style={styles.emptyText}>No overrides configured</Text>
        ) : (
          <View style={styles.overrideList}>
            {overrides.map((override, index) => (
              <View key={index} style={styles.overrideItem}>
                <View style={styles.overrideInfo}>
                  <Text style={styles.overrideName}>{override.searchName}</Text>
                  <Text style={styles.overrideDetails}>
                    {override.displayName} ({override.duprId})
                  </Text>
                  <Text style={styles.overrideRating}>Rating: {(typeof override.rating === 'number' ? override.rating : 0).toFixed(2)}</Text>
                </View>
                <View style={styles.overrideActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditOverride(override)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteOverride(override)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleAddOverride}>
          <Text style={styles.addButtonText}>+ Add Override</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Text style={styles.logoutButtonText}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Override Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingOverride ? 'Edit Override' : 'Add Override'}
            </Text>

            <Text style={styles.inputLabel}>Search Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John Smith"
              value={formData.searchName}
              onChangeText={(text) => setFormData({ ...formData, searchName: text })}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>DUPR ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 12345"
              value={formData.duprId}
              onChangeText={(text) => setFormData({ ...formData, duprId: text })}
            />

            <Text style={styles.inputLabel}>Display Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John Smith"
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Rating (0-8) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 4.5"
              value={formData.rating}
              onChangeText={(text) => setFormData({ ...formData, rating: text })}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveOverride}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  overrideList: {
    marginBottom: 15,
  },
  overrideItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  overrideInfo: {
    flex: 1,
  },
  overrideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  overrideDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  overrideRating: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  overrideActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
