/**
 * Export Service Tests
 * Tests for all export functionality: copy, share, print, PDF
 */

import { ExportService } from '../exportService';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';
import {
  writeAsStringAsync,
  moveAsync,
  cacheDirectory,
  documentDirectory,
} from 'expo-file-system/legacy';

// Mock modules
jest.mock('expo-clipboard');
jest.mock('expo-sharing');
jest.mock('expo-print');
jest.mock('expo-file-system/legacy');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('copyToClipboard', () => {
    it('should copy HTML to clipboard and show success alert', async () => {
      const html = '<html><body>Test Report</body></html>';
      (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(undefined);

      await ExportService.copyToClipboard(html);

      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(html);
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'HTML report copied to clipboard!');
    });

    it('should show error alert if copy fails', async () => {
      const html = '<html><body>Test Report</body></html>';
      const error = new Error('Clipboard error');
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValue(error);

      await expect(ExportService.copyToClipboard(html)).rejects.toThrow('Clipboard error');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to copy to clipboard: Clipboard error');
    });
  });

  describe('share', () => {
    it('should create temp file and share HTML', async () => {
      const html = '<html><body>Test Report</body></html>';
      const filename = 'test-report.html';
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await ExportService.share(html, filename);

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(writeAsStringAsync).toHaveBeenCalledWith(
        `${cacheDirectory}${filename}`,
        html,
        expect.objectContaining({ encoding: 'utf8' })
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        `${cacheDirectory}${filename}`,
        expect.objectContaining({
          mimeType: 'text/html',
          dialogTitle: 'Share DUPR Report',
        })
      );
    });

    it('should use default filename if not provided', async () => {
      const html = '<html><body>Test Report</body></html>';
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await ExportService.share(html);

      expect(writeAsStringAsync).toHaveBeenCalledWith(
        `${cacheDirectory}dupr-report.html`,
        html,
        expect.any(Object)
      );
    });

    it('should show error if sharing is not available', async () => {
      const html = '<html><body>Test Report</body></html>';
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      await ExportService.share(html);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Sharing is not available on this device');
      expect(writeAsStringAsync).not.toHaveBeenCalled();
    });

    it('should show error alert if share fails', async () => {
      const html = '<html><body>Test Report</body></html>';
      const error = new Error('Share error');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (writeAsStringAsync as jest.Mock).mockRejectedValue(error);

      await expect(ExportService.share(html)).rejects.toThrow('Share error');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to share: Share error');
    });
  });

  describe('print', () => {
    it('should print HTML using expo-print', async () => {
      const html = '<html><body>Test Report</body></html>';
      (Print.printAsync as jest.Mock).mockResolvedValue(undefined);

      await ExportService.print(html);

      expect(Print.printAsync).toHaveBeenCalledWith({ html });
    });

    it('should show error alert if print fails', async () => {
      const html = '<html><body>Test Report</body></html>';
      const error = new Error('Print error');
      (Print.printAsync as jest.Mock).mockRejectedValue(error);

      await expect(ExportService.print(html)).rejects.toThrow('Print error');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to print: Print error');
    });
  });

  describe('savePdf', () => {
    it('should save PDF and move to permanent location on iOS', async () => {
      const html = '<html><body>Test Report</body></html>';
      const filename = 'test-report.pdf';
      const tempUri = 'file:///temp/abc123.pdf';
      (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: tempUri });
      (moveAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await ExportService.savePdf(html, filename);

      expect(Print.printToFileAsync).toHaveBeenCalledWith({ html });
      expect(moveAsync).toHaveBeenCalledWith({
        from: tempUri,
        to: `${documentDirectory}${filename}`,
      });
      expect(result).toBe(`${documentDirectory}${filename}`);
    });

    it('should use default filename if not provided', async () => {
      const html = '<html><body>Test Report</body></html>';
      const tempUri = 'file:///temp/abc123.pdf';
      (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: tempUri });
      (moveAsync as jest.Mock).mockResolvedValue(undefined);

      await ExportService.savePdf(html);

      expect(moveAsync).toHaveBeenCalledWith({
        from: tempUri,
        to: `${documentDirectory}dupr-report.pdf`,
      });
    });

    it('should show error alert if save fails', async () => {
      const html = '<html><body>Test Report</body></html>';
      const error = new Error('Save error');
      (Print.printToFileAsync as jest.Mock).mockRejectedValue(error);

      await expect(ExportService.savePdf(html)).rejects.toThrow('Save error');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save PDF: Save error');
    });
  });

  describe('printAndShare', () => {
    it('should generate PDF and share it', async () => {
      const html = '<html><body>Test Report</body></html>';
      const filename = 'test-report.pdf';
      const pdfUri = 'file:///temp/abc123.pdf';
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: pdfUri });
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await ExportService.printAndShare(html, filename);

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Print.printToFileAsync).toHaveBeenCalledWith({ html });
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        pdfUri,
        expect.objectContaining({
          mimeType: 'application/pdf',
          dialogTitle: 'Share DUPR Report PDF',
        })
      );
    });

    it('should show error if sharing is not available', async () => {
      const html = '<html><body>Test Report</body></html>';
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      await ExportService.printAndShare(html);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Sharing is not available on this device');
      expect(Print.printToFileAsync).not.toHaveBeenCalled();
    });

    it('should show error alert if print and share fails', async () => {
      const html = '<html><body>Test Report</body></html>';
      const error = new Error('Print and share error');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Print.printToFileAsync as jest.Mock).mockRejectedValue(error);

      await expect(ExportService.printAndShare(html)).rejects.toThrow('Print and share error');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to print and share: Print and share error');
    });
  });
});
