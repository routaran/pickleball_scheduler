/**
 * Report View Screen
 * Displays HTML report in a WebView with export options
 * - Read-only preview of the generated HTML report
 * - Export buttons: Copy, Share, Print
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../stores/gameStore';
import { ExportService } from '../services/exportService';

export function ReportViewScreen() {
  const { html } = useGameStore();
  const [isExporting, setIsExporting] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);

  // Handle Share as PDF (preserves formatting)
  const handleSharePdf = async () => {
    if (!html) {
      Alert.alert('Error', 'No HTML report available');
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      await ExportService.printAndShare(html, `dupr-report-${timestamp}.pdf`);
    } catch (error) {
      // Error already handled in ExportService
      console.error('Share PDF failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // No HTML available
  if (!html) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyTitle}>No Report Available</Text>
        <Text style={styles.emptyMessage}>
          Generate a game report first to preview and export it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HTML Preview */}
      <View style={styles.webViewContainer}>
        {webViewLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading report...</Text>
          </View>
        )}
        <WebView
          source={{ html }}
          style={styles.webView}
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={() => setWebViewLoading(false)}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          scalesPageToFit={true}
          originWhitelist={['*']}
        />
      </View>

      {/* Export Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleSharePdf}
          disabled={isExporting}
        >
          <Ionicons name="share-outline" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Share as PDF</Text>
        </TouchableOpacity>
      </View>
      {isExporting && (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
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
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  exportingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
