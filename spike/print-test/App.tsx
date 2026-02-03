import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

/**
 * SPIKE-EXPORT-A1: Test expo-print on Android emulator
 *
 * This spike validates that expo-print can:
 * 1. Generate a PDF from HTML content
 * 2. The PDF is readable and properly formatted
 * 3. Text is not blurry and margins are reasonable
 *
 * Sample HTML mimics the Python desktop app's DUPR Ladder Results output
 */

// Sample HTML matching the Python desktop app's output style
const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>DUPR Ladder Results</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      padding: 20px;
      background-color: #ffffff;
      color: #333333;
      line-height: 1.4;
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .subtitle {
      text-align: center;
      color: #7f8c8d;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .pool-container {
      margin-bottom: 24px;
    }
    .pool-header {
      background-color: #2196F3;
      color: white;
      padding: 10px 15px;
      margin-top: 20px;
      margin-bottom: 0;
      font-weight: bold;
      font-size: 16px;
      border-radius: 4px 4px 0 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      background-color: #ffffff;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px 12px;
      text-align: left;
      font-size: 14px;
    }
    th {
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    tr:hover {
      background-color: #f1f1f1;
    }
    .rating-high {
      color: #27ae60;
      font-weight: bold;
    }
    .rating-mid {
      color: #2980b9;
      font-weight: bold;
    }
    .rating-low {
      color: #e67e22;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #95a5a6;
      font-size: 12px;
      border-top: 1px solid #ecf0f1;
      padding-top: 15px;
    }
    @media print {
      body {
        padding: 10px;
      }
      .pool-header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      th {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <h1>DUPR Ladder Results</h1>
  <div class="subtitle">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>

  <div class="pool-container">
    <div class="pool-header">Pool A - Advanced</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Rating</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>John Smith</td>
          <td class="rating-high">4.52</td>
          <td>Edmonton, AB</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Sarah Johnson</td>
          <td class="rating-high">4.35</td>
          <td>Calgary, AB</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Michael Chen</td>
          <td class="rating-high">4.21</td>
          <td>Vancouver, BC</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Jane Doe</td>
          <td class="rating-high">4.05</td>
          <td>Edmonton, AB</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="pool-container">
    <div class="pool-header">Pool B - Intermediate</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Rating</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Robert Williams</td>
          <td class="rating-mid">3.85</td>
          <td>Red Deer, AB</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Emily Davis</td>
          <td class="rating-mid">3.72</td>
          <td>Sherwood Park, AB</td>
        </tr>
        <tr>
          <td>3</td>
          <td>David Brown</td>
          <td class="rating-mid">3.58</td>
          <td>St. Albert, AB</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Lisa Anderson</td>
          <td class="rating-mid">3.41</td>
          <td>Lethbridge, AB</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="pool-container">
    <div class="pool-header">Pool C - Beginner</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Rating</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Kevin Wilson</td>
          <td class="rating-low">2.95</td>
          <td>Edmonton, AB</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Amanda Martinez</td>
          <td class="rating-low">2.78</td>
          <td>Calgary, AB</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Chris Taylor</td>
          <td class="rating-low">2.62</td>
          <td>Edmonton, AB</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Jennifer Lee</td>
          <td class="rating-low">2.50</td>
          <td>Spruce Grove, AB</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by DUPR Ladder Mobile App</p>
    <p>Player ratings sourced from DUPR (dupr.com)</p>
  </div>
</body>
</html>
`;

// Test result interface
interface TestResult {
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: string;
  duration?: number;
}

export default function App() {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { testName: 'PDF Generation', status: 'pending', message: 'Not started' },
    { testName: 'PDF File Created', status: 'pending', message: 'Not started' },
    { testName: 'Share/View PDF', status: 'pending', message: 'Not started' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
    console.log(`[PRINT-TEST] ${message}`);
  };

  const updateTestResult = (index: number, update: Partial<TestResult>) => {
    setTestResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], ...update };
      return newResults;
    });
  };

  const runPDFGenerationTest = async () => {
    setIsRunning(true);
    setPdfUri(null);
    addLog('Starting PDF generation tests...');

    // Reset all tests
    setTestResults([
      { testName: 'PDF Generation', status: 'running', message: 'Generating...' },
      { testName: 'PDF File Created', status: 'pending', message: 'Waiting...' },
      { testName: 'Share/View PDF', status: 'pending', message: 'Waiting...' },
    ]);

    // Test 1: Generate PDF from HTML
    const startTime = Date.now();
    try {
      addLog('Calling Print.printToFileAsync...');
      addLog(`HTML length: ${SAMPLE_HTML.length} characters`);

      const result = await Print.printToFileAsync({
        html: SAMPLE_HTML,
        base64: false,
      });

      const duration = Date.now() - startTime;
      addLog(`PDF generated successfully in ${duration}ms`);
      addLog(`PDF URI: ${result.uri}`);

      setPdfUri(result.uri);
      updateTestResult(0, {
        status: 'passed',
        message: 'PDF generated successfully',
        details: `Duration: ${duration}ms`,
        duration,
      });

      // Test 2: Verify file exists
      addLog('Verifying PDF file exists...');
      updateTestResult(1, { status: 'running', message: 'Checking file...' });

      try {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        addLog(`File info: exists=${fileInfo.exists}, size=${(fileInfo as any).size || 'N/A'}`);

        if (fileInfo.exists) {
          const fileSize = (fileInfo as any).size || 0;
          updateTestResult(1, {
            status: 'passed',
            message: `File exists (${Math.round(fileSize / 1024)}KB)`,
            details: `Size: ${fileSize} bytes`,
          });
          addLog(`PDF file verified: ${Math.round(fileSize / 1024)}KB`);
        } else {
          throw new Error('File does not exist after generation');
        }
      } catch (fileError: any) {
        addLog(`File verification error: ${fileError.message}`);
        updateTestResult(1, {
          status: 'failed',
          message: 'File check failed',
          details: fileError.message,
        });
      }

      // Test 3: Check sharing availability
      addLog('Checking sharing availability...');
      updateTestResult(2, { status: 'running', message: 'Checking...' });

      const sharingAvailable = await Sharing.isAvailableAsync();
      addLog(`Sharing available: ${sharingAvailable}`);

      updateTestResult(2, {
        status: sharingAvailable ? 'passed' : 'failed',
        message: sharingAvailable ? 'Sharing available' : 'Sharing not available',
        details: sharingAvailable
          ? 'Tap "Open PDF" to view the generated file'
          : 'expo-sharing not available on this device',
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      addLog(`PDF generation FAILED: ${error.message}`);
      addLog(`Error stack: ${error.stack}`);

      updateTestResult(0, {
        status: 'failed',
        message: 'Generation failed',
        details: error.message,
        duration,
      });

      updateTestResult(1, { status: 'failed', message: 'Skipped (generation failed)' });
      updateTestResult(2, { status: 'failed', message: 'Skipped (generation failed)' });
    }

    setIsRunning(false);
    addLog('Test suite completed');
  };

  const openPDF = async () => {
    if (!pdfUri) {
      Alert.alert('No PDF', 'Generate a PDF first');
      return;
    }

    try {
      addLog(`Opening PDF: ${pdfUri}`);
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'DUPR Ladder Results',
        UTI: 'com.adobe.pdf',
      });
      addLog('PDF shared/opened successfully');
    } catch (error: any) {
      addLog(`Error opening PDF: ${error.message}`);
      Alert.alert('Error', `Could not open PDF: ${error.message}`);
    }
  };

  const printDirectly = async () => {
    try {
      addLog('Opening print dialog...');
      await Print.printAsync({
        html: SAMPLE_HTML,
      });
      addLog('Print dialog closed');
    } catch (error: any) {
      addLog(`Print error: ${error.message}`);
      Alert.alert('Error', `Could not print: ${error.message}`);
    }
  };

  const getStatusColor = (status: TestResult['status']): string => {
    switch (status) {
      case 'passed': return '#27ae60';
      case 'failed': return '#e74c3c';
      case 'running': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: TestResult['status']): string => {
    switch (status) {
      case 'passed': return '[OK]';
      case 'failed': return '[X]';
      case 'running': return '[...]';
      default: return '[ ]';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>SPIKE-EXPORT-A1</Text>
        <Text style={styles.subText}>expo-print PDF Generation Test</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.testRow}>
              <Text style={[styles.testStatus, { color: getStatusColor(result.status) }]}>
                {getStatusIcon(result.status)}
              </Text>
              <View style={styles.testInfo}>
                <Text style={styles.testName}>{result.testName}</Text>
                <Text style={styles.testMessage}>{result.message}</Text>
                {result.details && (
                  <Text style={styles.testDetails}>{result.details}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isRunning && styles.disabledButton]}
            onPress={runPDFGenerationTest}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Run PDF Generation Test</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, !pdfUri && styles.disabledButton]}
            onPress={openPDF}
            disabled={!pdfUri}
          >
            <Text style={[styles.buttonText, !pdfUri && styles.disabledText]}>
              Open/Share PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={printDirectly}
          >
            <Text style={styles.buttonText}>Open Print Dialog</Text>
          </TouchableOpacity>
        </View>

        {/* Sample HTML Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample HTML Content</Text>
          <Text style={styles.infoText}>
            The test uses a sample HTML document that mimics the Python desktop app's
            DUPR Ladder Results output:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>- 3 pool groups (A, B, C)</Text>
            <Text style={styles.featureItem}>- 12 players with ratings</Text>
            <Text style={styles.featureItem}>- Color-coded ratings (green/blue/amber)</Text>
            <Text style={styles.featureItem}>- Bootstrap-inspired styling</Text>
            <Text style={styles.featureItem}>- Print-friendly CSS media queries</Text>
          </View>
        </View>

        {/* Debug Console */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Console</Text>
          <ScrollView style={styles.consoleContainer} nestedScrollEnabled>
            {debugLog.length === 0 ? (
              <Text style={styles.consoleEmpty}>Tap "Run PDF Generation Test" to start</Text>
            ) : (
              debugLog.map((log, i) => (
                <Text key={i} style={styles.consoleText}>{log}</Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Technical Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Notes</Text>
          <Text style={styles.notes}>
            {`Platform: ${Platform.OS} ${Platform.Version}
expo-print: HTML -> PDF conversion
expo-sharing: Native share sheet
expo-file-system: File verification

Expected behavior:
1. PDF generated to cache directory
2. File size ~10-50KB for this content
3. Share opens native PDF viewer
4. Print dialog shows system print UI`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#9c27b0',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subText: {
    fontSize: 14,
    color: '#e1bee7',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9c27b0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7b1fa2',
    marginBottom: 12,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  testStatus: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
    width: 36,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  testMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  testDetails: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#9c27b0',
  },
  secondaryButton: {
    backgroundColor: '#7b1fa2',
  },
  tertiaryButton: {
    backgroundColor: '#6a1b9a',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  featureList: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
  },
  featureItem: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  consoleContainer: {
    maxHeight: 150,
    backgroundColor: '#263238',
    borderRadius: 4,
    padding: 8,
  },
  consoleEmpty: {
    color: '#78909c',
    fontSize: 12,
    fontStyle: 'italic',
  },
  consoleText: {
    color: '#ce93d8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
