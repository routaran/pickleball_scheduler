/**
 * Export Service
 * Provides functionality to export HTML reports via:
 * - Copy to clipboard
 * - Share via native share sheet
 * - Print or save as PDF
 */

import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';
import {
  cacheDirectory,
  documentDirectory,
  writeAsStringAsync,
  moveAsync,
  EncodingType,
} from 'expo-file-system/legacy';

// =============================================================================
// Export Service
// =============================================================================

export const ExportService = {
  /**
   * Copy HTML content to clipboard
   * Shows success toast/alert after copying
   */
  async copyToClipboard(html: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(html);
      Alert.alert('Success', 'HTML report copied to clipboard!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to copy to clipboard: ${errorMessage}`);
      throw error;
    }
  },

  /**
   * Share HTML via native share sheet
   * Creates a temporary HTML file and opens the share dialog
   */
  async share(html: string, filename: string = 'dupr-report.html'): Promise<void> {
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Create temporary file
      const fileUri = `${cacheDirectory}${filename}`;
      await writeAsStringAsync(fileUri, html, {
        encoding: EncodingType.UTF8,
      });

      // Open share dialog
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Share DUPR Report',
        UTI: 'public.html',
      });

      // Note: We don't delete the file immediately as the share dialog may still be using it
      // The file will be cleaned up when the app cache is cleared
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to share: ${errorMessage}`);
      throw error;
    }
  },

  /**
   * Print HTML or save as PDF
   * Opens the native print dialog
   */
  async print(html: string): Promise<void> {
    try {
      await Print.printAsync({
        html,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to print: ${errorMessage}`);
      throw error;
    }
  },

  /**
   * Save HTML as PDF file
   * Returns the URI of the saved PDF
   */
  async savePdf(html: string, filename: string = 'dupr-report.pdf'): Promise<string> {
    try {
      const { uri } = await Print.printToFileAsync({
        html,
      });

      // On iOS, we can move the file to a permanent location
      // On Android, the file is already in a permanent location
      if (Platform.OS === 'ios') {
        const permanentUri = `${documentDirectory}${filename}`;
        await moveAsync({
          from: uri,
          to: permanentUri,
        });
        return permanentUri;
      }

      return uri;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to save PDF: ${errorMessage}`);
      throw error;
    }
  },

  /**
   * Print to PDF and then share
   * Convenient method that combines savePdf and share
   */
  async printAndShare(html: string, filename: string = 'dupr-report.pdf'): Promise<void> {
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      console.log('[ExportService] Generating PDF from HTML...');
      console.log('[ExportService] HTML length:', html.length);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
      });

      console.log('[ExportService] PDF generated successfully!');
      console.log('[ExportService] PDF URI:', uri);

      // Share the PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share DUPR Report PDF',
        UTI: 'com.adobe.pdf',
      });

      console.log('[ExportService] Share dialog opened');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ExportService] Failed to print and share:', errorMessage);
      Alert.alert('Error', `Failed to print and share: ${errorMessage}`);
      throw error;
    }
  },
};
