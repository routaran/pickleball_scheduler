import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGameStore } from '../stores/gameStore';
import { GameType, PlayerWithRating } from '@dupr/core';
import { RatingEditModal } from '../components/RatingEditModal';

/**
 * Get rating tier color based on rating value
 * - Green: >= 4.0 (#059669)
 * - Blue: >= 3.0 (#2563eb)
 * - Amber: < 3.0 (#d97706)
 */
const getRatingColor = (rating: number | null | undefined): string => {
  const r = rating ?? 0;
  if (r >= 4.0) return '#059669'; // green
  if (r >= 3.0) return '#2563eb'; // blue
  return '#d97706'; // amber
};

/**
 * Get custom rating badge color (purple for custom ratings)
 */
const getCustomRatingColor = (): string => '#7c3aed'; // purple

/**
 * Memoized Player Row Component for better performance
 */
interface PlayerRowProps {
  player: PlayerWithRating;
  hasCustomRating: boolean;
  onEditPress?: (player: PlayerWithRating) => void;
}

const PlayerRow = React.memo(({ player, hasCustomRating, onEditPress }: PlayerRowProps) => {
  const isEditable = !player.found || hasCustomRating;
  const badgeColor = hasCustomRating
    ? getCustomRatingColor()
    : getRatingColor(player.rating);

  const handlePress = () => {
    if (isEditable && onEditPress) {
      onEditPress(player);
    }
  };

  return (
    <View style={styles.playerRow}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.name}</Text>
        {hasCustomRating ? (
          <Text style={styles.customBadge}>Custom</Text>
        ) : !player.found ? (
          <Text style={styles.notFoundBadge}>Not Found</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={handlePress}
        disabled={!isEditable}
        activeOpacity={isEditable ? 0.7 : 1}
      >
        <View
          style={[
            styles.ratingBadge,
            { backgroundColor: badgeColor },
            isEditable && styles.editableRatingBadge,
          ]}
        >
          <Text style={styles.ratingText}>
            {(typeof player.rating === 'number' ? player.rating : 0).toFixed(2)}
          </Text>
          {isEditable && <Text style={styles.editIcon}>  ✎</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );
});

/**
 * ResultsScreen Component
 * Displays processed game results with player pools and ratings
 * Optimized with React.memo for smooth performance with large lists
 */
export function ResultsScreen() {
  const {
    results,
    html,
    isProcessing,
    error,
    format,
    ratingOverrides,
    editingPlayer,
    setEditingPlayer,
    updatePlayerRating,
    resetPlayerRating,
  } = useGameStore();
  const navigation = useNavigation();

  // Check if a player has a custom rating override
  const hasCustomRating = useCallback((playerName: string) => {
    return playerName in ratingOverrides;
  }, [ratingOverrides]);

  // Handler for opening the edit modal
  const handleEditPress = useCallback((player: PlayerWithRating) => {
    setEditingPlayer(player);
  }, [setEditingPlayer]);

  // Handler for saving a new rating
  const handleSaveRating = useCallback((rating: number) => {
    if (editingPlayer) {
      updatePlayerRating(editingPlayer.name, rating);
      Alert.alert('Success', 'Rating updated. Pools recalculated.');
    }
  }, [editingPlayer, updatePlayerRating]);

  // Handler for resetting to default rating
  const handleResetRating = useCallback(() => {
    if (editingPlayer) {
      resetPlayerRating(editingPlayer.name);
      Alert.alert('Success', 'Rating reset to default. Pools recalculated.');
    }
  }, [editingPlayer, resetPlayerRating]);

  // Handler for closing the modal
  const handleCloseModal = useCallback(() => {
    setEditingPlayer(null);
  }, [setEditingPlayer]);

  // Debug logging
  console.log('[ResultsScreen] Rendering, results:', results ? {
    playersCount: results.players?.length,
    teamsCount: results.teams?.length,
    poolsCount: results.pools?.length,
    playerRatings: results.players?.map(p => ({ name: p.name, rating: p.rating, type: typeof p.rating })),
  } : 'null');

  // Loading state
  if (isProcessing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Processing players...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  // No results state
  if (!results || !results.players || results.players.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Results Yet</Text>
        <Text style={styles.emptyMessage}>
          Select a game format and enter players to see results here.
        </Text>
      </View>
    );
  }

  // Handle export button press - navigate to ReportViewScreen
  const handleExportHtml = () => {
    if (html) {
      navigation.navigate('ReportView' as never);
    } else {
      Alert.alert('Error', 'No HTML report available.');
    }
  };

  // Render results based on format
  const renderResults = () => {
    switch (format) {
      case GameType.DUPR_LADDER:
      case GameType.PICKLEBROS_MONDAY:
        return renderPoolResults();
      case GameType.PARTNER_DUPR:
        return renderTeamResults();
      default:
        return renderPlayerList();
    }
  };

  // Render pool-based results (Ladder, PickleBros)
  const renderPoolResults = () => {
    if (!results.pools || results.pools.length === 0) {
      // Fallback: show players in a single list
      return renderPlayerList();
    }

    return (
      <>
        <Text style={styles.resultsTitle}>
          {format === GameType.PICKLEBROS_MONDAY ? 'PickleBros Pools' : 'DUPR Ladder Pools'}
        </Text>
        <Text style={styles.resultsSubtitle}>
          {results.players.length} player{results.players.length !== 1 ? 's' : ''} in {results.pools.length} pool{results.pools.length !== 1 ? 's' : ''}
        </Text>

        {results.pools.map((pool) => (
          <View key={pool.name} style={styles.poolContainer}>
            <Text style={styles.poolHeader}>Pool {pool.name}</Text>
            {pool.players.map((player, index) => (
              <PlayerRow
                key={`${pool.name}-${player.name}-${index}`}
                player={player}
                hasCustomRating={hasCustomRating(player.name)}
                onEditPress={handleEditPress}
              />
            ))}
          </View>
        ))}
      </>
    );
  };

  // Render team-based results (Partner DUPR)
  const renderTeamResults = () => {
    if (!results.teams || results.teams.length === 0) {
      return renderPlayerList();
    }

    return (
      <>
        <Text style={styles.resultsTitle}>Partner DUPR Teams</Text>
        <Text style={styles.resultsSubtitle}>
          {results.teams.length} team{results.teams.length !== 1 ? 's' : ''}
        </Text>

        {results.teams.map((team, index) => (
          <View key={`team-${index}`} style={styles.teamContainer}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamTitle}>Team {index + 1}</Text>
              <View
                style={[
                  styles.ratingBadge,
                  { backgroundColor: getRatingColor(team.teamRating) },
                ]}
              >
                <Text style={styles.ratingText}>{(typeof team.teamRating === 'number' ? team.teamRating : 0).toFixed(2)}</Text>
              </View>
            </View>

            <PlayerRow
              player={team.player1}
              hasCustomRating={hasCustomRating(team.player1.name)}
              onEditPress={handleEditPress}
            />
            <PlayerRow
              player={team.player2}
              hasCustomRating={hasCustomRating(team.player2.name)}
              onEditPress={handleEditPress}
            />
          </View>
        ))}
      </>
    );
  };

  // Render simple player list (fallback)
  const renderPlayerList = () => {
    const sortedPlayers = [...results.players].sort((a, b) => b.rating - a.rating);

    return (
      <>
        <Text style={styles.resultsTitle}>Player Results</Text>
        <Text style={styles.resultsSubtitle}>
          {sortedPlayers.length} player{sortedPlayers.length !== 1 ? 's' : ''}
        </Text>

        {sortedPlayers.map((player, index) => (
          <PlayerRow
            key={`${player.name}-${index}`}
            player={player}
            hasCustomRating={hasCustomRating(player.name)}
            onEditPress={handleEditPress}
          />
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderResults()}

        {/* Export button */}
        {html && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportHtml}
          >
            <Text style={styles.exportButtonText}>📄 View/Export HTML Report</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Rating Edit Modal */}
      <RatingEditModal
        visible={editingPlayer !== null}
        player={editingPlayer}
        hasCustomRating={editingPlayer ? hasCustomRating(editingPlayer.name) : false}
        onClose={handleCloseModal}
        onSave={handleSaveRating}
        onReset={handleResetRating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  poolContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  poolHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
  teamContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    color: '#333',
  },
  notFoundBadge: {
    marginLeft: 8,
    fontSize: 12,
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
  customBadge: {
    marginLeft: 8,
    fontSize: 12,
    color: '#7c3aed',
    fontStyle: 'italic',
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editableRatingBadge: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editIcon: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  exportButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
