import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';

// ─── Audio asset: a short "tick" click sound (base64 wav, 8-bit sine burst) ───
// We generate the click sound programmatically via a small utility below.
// If you want a real sound file, replace CLICK_SOUND_URI with your asset path.
// For now we use expo-audio's useAudioPlayer with a hosted tiny click wav.



const sound1 = require('../assets/sounds/meme.mp3');
const sound2 = require('../assets/sounds/faah.mp3');

const sounds = [sound1, sound2];

function getRandomSound() {
  return sounds[Math.floor(Math.random() * sounds.length)];
}

// create player with random sound
const player = useAudioPlayer(getRandomSound());

export function playRandomClick() {
  player.play();
}

const { width, height } = Dimensions.get('window');

export default function App() {
  // ── Calculator state ──────────────────────────────────────────────────────
  const [displayValue, setDisplayValue] = useState('0');
  const [equation, setEquation] = useState('');
  const [liveResult, setLiveResult] = useState(''); // live preview result
  const [firstOperand, setFirstOperand] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [justCalculated, setJustCalculated] = useState(false);

  // ── Currency/Crypto state ─────────────────────────────────────────────────
  const [exchangeRates, setExchangeRates] = useState({});
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [convertedKSH, setConvertedKSH] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');

  // ── Menu / modal state ────────────────────────────────────────────────────
  const [showMenu, setShowMenu] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false);

  // ── Settings state ────────────────────────────────────────────────────────
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const appVersion = '1.0.0';
  const buildNumber = '1';

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'KES', 'RUB', 'CAD', 'AUD', 'CHF', 'SGD', 'HKD'];
  const cryptos = ['BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XLM', 'EOS'];


  // ── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchExchangeRates();
    fetchCryptoPrices();
    loadHistory();
    loadSettings();

    const interval = setInterval(() => {
      fetchExchangeRates();
      fetchCryptoPrices();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // ── API Calls ─────────────────────────────────────────────────────────────
  const fetchExchangeRates = async () => {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      setExchangeRates(response.data.rates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  };

  const fetchCryptoPrices = async () => {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,cardano,polkadot,chainlink,litecoin,bitcoin-cash,stellar,eos&vs_currencies=usd'
      );
      setCryptoPrices({
        BTC: response.data.bitcoin?.usd || 0,
        ETH: response.data.ethereum?.usd || 0,
        XRP: response.data.ripple?.usd || 0,
        ADA: response.data.cardano?.usd || 0,
        DOT: response.data.polkadot?.usd || 0,
        LINK: response.data.chainlink?.usd || 0,
        LTC: response.data.litecoin?.usd || 0,
        BCH: response.data['bitcoin-cash']?.usd || 0,
        XLM: response.data.stellar?.usd || 0,
        EOS: response.data.eos?.usd || 0,
      });
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    }
  };

  // ── SecureStore ───────────────────────────────────────────────────────────
  const saveToSecureStore = async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error saving to SecureStore:', error);
      return false;
    }
  };

  const getFromSecureStore = async (key) => {
    try {
      const result = await SecureStore.getItemAsync(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Error reading from SecureStore:', error);
      return null;
    }
  };

  const loadHistory = async () => {
    try {
      const saved = await getFromSecureStore('calculatorHistory');
      if (saved && Array.isArray(saved)) setHistory(saved);
    } catch (error) {
      setHistory([]);
    }
  };

  const saveHistory = async (newHistory) => {
    await saveToSecureStore('calculatorHistory', newHistory);
  };

  const loadSettings = async () => {
    try {
      const savedVibration = await getFromSecureStore('vibrationEnabled');
      const savedAutoCalc = await getFromSecureStore('autoCalculate');
      const savedSound = await getFromSecureStore('soundEnabled');
      if (savedVibration !== null) setVibrationEnabled(savedVibration);
      if (savedAutoCalc !== null) setAutoCalculate(savedAutoCalc);
      if (savedSound !== null) setSoundEnabled(savedSound);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    await saveToSecureStore('vibrationEnabled', vibrationEnabled);
    await saveToSecureStore('autoCalculate', autoCalculate);
    await saveToSecureStore('soundEnabled', soundEnabled);
  };

  useEffect(() => { saveSettings(); }, [vibrationEnabled, autoCalculate, soundEnabled]);

  const addToHistory = (calculation) => {
    const newHistory = [calculation, ...history].slice(0, 20);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const clearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear all calculation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await saveToSecureStore('calculatorHistory', []);
          setHistory([]);
          triggerFeedback('medium');
        },
      },
    ]);
  };

  // ── Feedback (Haptics + Sound) ─────────────────────────────────────────────
  // Haptics work much better than Vibration API on iOS & Android
  const triggerFeedback = useCallback(
    (style = 'light') => {
      if (vibrationEnabled && Platform.OS !== 'web') {
        switch (style) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'selection':
            Haptics.selectionAsync();
            break;
          default:
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    },
    [vibrationEnabled]
  );

  const playClickSound = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      if (player) {
        // Seek to beginning so rapid taps each play from start
        player.seekTo(0);
        player.play();
      }
    } catch (e) {
      // Fail silently — sound is enhancement only
      console.log('Audio play error (non-critical):', e);
    }
  }, [soundEnabled, player]);

  const buttonFeedback = useCallback(
    (style = 'light') => {
      triggerFeedback(style);
      playClickSound();
    },
    [triggerFeedback, playClickSound]
  );

  // ── Auto-calculation engine ────────────────────────────────────────────────
  /**
   * evaluateExpression: parses and evaluates a math string like "123+45×6"
   * Returns a formatted result string, or null if incomplete/invalid.
   * Only shows result when the expression is "complete" (ends with a number).
   */
  const evaluateExpression = useCallback((expr) => {
    if (!expr || expr.trim() === '') return null;

    // Expression must end with a digit or closing paren to be evaluable
    const lastChar = expr[expr.length - 1];
    if (['+', '-', '×', '÷', '.'].includes(lastChar)) return null;

    // Must contain an operator (otherwise nothing to "preview")
    if (!/[+\-×÷]/.test(expr)) return null;

    try {
      // Replace display operators with JS operators
      const jsExpr = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');

      // eslint-disable-next-line no-new-func
      const result = new Function('return (' + jsExpr + ')')();

      if (isNaN(result) || !isFinite(result)) return null;

      // Format nicely: up to 10 significant digits, strip trailing zeros
      const rounded = parseFloat(result.toPrecision(10));
      return rounded % 1 === 0
        ? String(Math.round(rounded))
        : String(rounded);
    } catch {
      return null;
    }
  }, []);

  // ── Calculator core ────────────────────────────────────────────────────────
  const inputDigit = (digit) => {
    buttonFeedback('light');

    let newEquation;

    if (justCalculated) {
      // Start fresh after a completed calculation
      newEquation = String(digit);
      setJustCalculated(false);
      setFirstOperand(null);
      setOperator(null);
    } else if (waitingForSecondOperand) {
      // After an operator was pressed, start building second operand
      // equation already has the operator appended, just add digit
      newEquation = equation + String(digit);
      setWaitingForSecondOperand(false);
    } else {
      newEquation = equation === '' ? String(digit) : equation + String(digit);
    }

    setEquation(newEquation);
    setDisplayValue(newEquation); // show full expression in display

    // Live preview
    if (autoCalculate) {
      const preview = evaluateExpression(newEquation);
      setLiveResult(preview || '');
    }
  };

  const inputDecimal = () => {
    buttonFeedback('light');

    if (waitingForSecondOperand) {
      const newEq = equation + '0.';
      setEquation(newEq);
      setDisplayValue(newEq);
      setWaitingForSecondOperand(false);
      return;
    }

    // Find the current number segment (after last operator)
    const segments = equation.split(/[+\-×÷]/);
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment.includes('.')) {
      const newEq = equation + '.';
      setEquation(newEq);
      setDisplayValue(newEq);
    }
  };

  const clearDisplay = () => {
    buttonFeedback('medium');
    setDisplayValue('0');
    setEquation('');
    setLiveResult('');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
    setJustCalculated(false);
  };

  // Backspace — delete last character
  const backspace = () => {
    buttonFeedback('light');
    if (justCalculated) {
      clearDisplay();
      return;
    }
    const newEq = equation.slice(0, -1);
    setEquation(newEq);
    setDisplayValue(newEq || '0');
    if (autoCalculate) {
      const preview = evaluateExpression(newEq);
      setLiveResult(preview || '');
    }
  };

  const getOperatorSymbol = (op) => ({ '+': '+', '-': '-', '*': '×', '/': '÷' }[op] || '');

  const calculate = (first, second, op) => {
    switch (op) {
      case '+': return parseFloat((first + second).toPrecision(10));
      case '-': return parseFloat((first - second).toPrecision(10));
      case '*': return parseFloat((first * second).toPrecision(10));
      case '/': return second !== 0 ? parseFloat((first / second).toPrecision(10)) : null;
      default: return second;
    }
  };

  const performOperation = (nextOperator) => {
    buttonFeedback('medium');

    // If we already have a pending operation and a second operand, chain it
    const lastChar = equation[equation.length - 1];
    if (['+', '-', '×', '÷'].includes(lastChar)) {
      // Replace last operator
      const newEq = equation.slice(0, -1) + getOperatorSymbol(nextOperator);
      setEquation(newEq);
      setOperator(nextOperator);
      return;
    }

    const currentValue = parseFloat(
      equation.split(/[+\-×÷]/).filter(Boolean).pop() || '0'
    );

    if (firstOperand !== null && operator && !waitingForSecondOperand) {
      const result = calculate(firstOperand, currentValue, operator);
      if (result === null) {
        triggerFeedback('error');
        Alert.alert('Error', 'Cannot divide by zero');
        clearDisplay();
        return;
      }
      const calcStr = `${firstOperand} ${getOperatorSymbol(operator)} ${currentValue} = ${result}`;
      addToHistory(calcStr);
      const newEq = String(result) + getOperatorSymbol(nextOperator);
      setEquation(newEq);
      setDisplayValue(newEq);
      setFirstOperand(result);
      setLiveResult('');
    } else {
      const newEq = equation + getOperatorSymbol(nextOperator);
      setEquation(newEq);
      setDisplayValue(newEq);
      setFirstOperand(currentValue);
    }

    setOperator(nextOperator);
    setWaitingForSecondOperand(true);
    setJustCalculated(false);
  };

  const handleEquals = () => {
    buttonFeedback('success');

    const preview = evaluateExpression(equation);
    if (preview === null) return;

    // Find operands and operator from equation for history
    const calcStr = `${equation} = ${preview}`;
    addToHistory(calcStr);

    setDisplayValue(String(preview));
    setEquation(String(preview));
    setLiveResult('');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
    setJustCalculated(true);
  };

  const handlePercentage = () => {
    buttonFeedback('light');
    // If there's an expression, divide last number by 100
    const segments = equation.split(/([+\-×÷])/);
    const lastNum = parseFloat(segments[segments.length - 1]);
    if (isNaN(lastNum)) return;
    const percentVal = lastNum / 100;
    segments[segments.length - 1] = String(percentVal);
    const newEq = segments.join('');
    setEquation(newEq);
    setDisplayValue(newEq);
    if (autoCalculate) {
      const preview = evaluateExpression(newEq);
      setLiveResult(preview || '');
    }
  };

  const toggleSign = () => {
    buttonFeedback('light');
    const segments = equation.split(/([+\-×÷])/);
    const lastNum = parseFloat(segments[segments.length - 1]);
    if (isNaN(lastNum)) return;
    segments[segments.length - 1] = String(-lastNum);
    const newEq = segments.join('');
    setEquation(newEq);
    setDisplayValue(newEq);
    if (autoCalculate) {
      const preview = evaluateExpression(newEq);
      setLiveResult(preview || '');
    }
  };

  // ── Conversion ─────────────────────────────────────────────────────────────
  const convertCurrency = () => {
    buttonFeedback('medium');
    if (!amount || !exchangeRates[selectedCurrency]) {
      Alert.alert('Invalid Input', 'Please enter an amount to convert');
      return;
    }
    const usdAmount = parseFloat(amount) / exchangeRates[selectedCurrency];
    const kshRate = exchangeRates['KES'] || 150;
    setConvertedKSH(`KES ${(usdAmount * kshRate).toFixed(2)}`);
  };

  const convertCrypto = () => {
    buttonFeedback('medium');
    if (!amount || !cryptoPrices[selectedCrypto]) {
      Alert.alert('Invalid Input', 'Please enter a crypto amount to convert');
      return;
    }
    const usdValue = parseFloat(amount) * cryptoPrices[selectedCrypto];
    const kshRate = exchangeRates['KES'] || 150;
    setConvertedKSH(`KES ${(usdValue * kshRate).toFixed(2)}`);
  };

  // ── Display scaling ────────────────────────────────────────────────────────
  const isSmallScreen = height < 700;
  const buttonSize = isSmallScreen ? 60 : 75;

  // Dynamic font size for the equation display (shrinks for long expressions)
  const getEquationFontSize = () => {
    const len = displayValue.length;
    if (len > 16) return 22;
    if (len > 12) return 28;
    if (len > 8) return 34;
    return isSmallScreen ? 42 : 50;
  };

  // ── Button renderer ────────────────────────────────────────────────────────
  const renderButton = (text, onPress, buttonStyle, textStyle, disabled = false) => (
    <TouchableOpacity
      style={[styles.button, { height: buttonSize }, buttonStyle, disabled && styles.disabledButton]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );

  // ── Modals ─────────────────────────────────────────────────────────────────
  const MenuModal = () => (
    <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
        <View style={styles.menuContainer}>
          {[
            { icon: 'document-text-outline', label: 'Privacy Policy', action: () => { setShowMenu(false); setShowPolicy(true); } },
            { icon: 'file-tray-full-outline', label: 'Terms of Service', action: () => { setShowMenu(false); setShowTerms(true); } },
            { icon: 'code-slash-outline', label: 'Developer Info', action: () => { setShowMenu(false); setShowDeveloperInfo(true); } },
          ].map(({ icon, label, action }) => (
            <TouchableOpacity key={label} style={styles.menuItem} onPress={action}>
              <Ionicons name={icon} size={22} color="#FF9F0A" />
              <Text style={styles.menuItemText}>{label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => { setSoundEnabled(!soundEnabled); triggerFeedback('selection'); }}>
            <Ionicons name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={22} color="#FF9F0A" />
            <Text style={styles.menuItemText}>Sound: {soundEnabled ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { setVibrationEnabled(!vibrationEnabled); triggerFeedback('selection'); }}>
            <Ionicons name="phone-portrait-outline" size={22} color="#FF9F0A" />
            <Text style={styles.menuItemText}>Vibration: {vibrationEnabled ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { setAutoCalculate(!autoCalculate); triggerFeedback('selection'); }}>
            <Ionicons name="flash-outline" size={22} color="#FF9F0A" />
            <Text style={styles.menuItemText}>Live Preview: {autoCalculate ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={clearHistory}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Clear History</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={22} color="#555" />
            <Text style={[styles.menuItemText, { color: '#555', fontSize: 13 }]}>
              v{appVersion} (Build {buildNumber})
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const PolicyModal = () => (
    <Modal visible={showPolicy} animationType="slide" transparent={false} onRequestClose={() => setShowPolicy(false)}>
      <SafeAreaView style={styles.infoModalContainer}>
        <View style={styles.infoModalHeader}>
          <Text style={styles.infoModalTitle}>Privacy Policy</Text>
          <TouchableOpacity onPress={() => setShowPolicy(false)}>
            <Ionicons name="close" size={28} color="#FF9F0A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.infoModalContent}>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Last updated: May 29, 2026</Text>
            {'\n\n'}
            <Text style={styles.infoBold}>1. Information We Collect</Text>
            {'\n'}NovaSec1 Calculator does not collect any personal information. All calculations are stored locally on your device using encrypted storage.
            {'\n\n'}
            <Text style={styles.infoBold}>2. Currency and Crypto Data</Text>
            {'\n'}The app fetches live exchange rates and cryptocurrency prices from public APIs. No personal data is transmitted.
            {'\n\n'}
            <Text style={styles.infoBold}>3. Data Storage</Text>
            {'\n'}Calculation history is stored locally using Expo SecureStore, which encrypts all data on your device.
            {'\n\n'}
            <Text style={styles.infoBold}>4. Third-Party Services</Text>
            {'\n'}• ExchangeRate-API for currency rates{'\n'}• CoinGecko API for cryptocurrency prices
            {'\n\n'}
            <Text style={styles.infoBold}>5. Contact</Text>
            {'\n'}Email: novasec@example.com
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const TermsModal = () => (
    <Modal visible={showTerms} animationType="slide" transparent={false} onRequestClose={() => setShowTerms(false)}>
      <SafeAreaView style={styles.infoModalContainer}>
        <View style={styles.infoModalHeader}>
          <Text style={styles.infoModalTitle}>Terms of Service</Text>
          <TouchableOpacity onPress={() => setShowTerms(false)}>
            <Ionicons name="close" size={28} color="#FF9F0A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.infoModalContent}>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>1. Use of App</Text>
            {'\n'}This app is for informational purposes only. Currency and crypto prices may not be real-time accurate.
            {'\n\n'}
            <Text style={styles.infoBold}>2. Financial Disclaimer</Text>
            {'\n'}Do not make financial decisions based solely on this app. Always verify rates with official sources.
            {'\n\n'}
            <Text style={styles.infoBold}>3. Limitation of Liability</Text>
            {'\n'}NovaSec1 is not responsible for any losses incurred from using this app.
            {'\n\n'}
            <Text style={styles.infoBold}>4. Changes to Terms</Text>
            {'\n'}We may update these terms at any time. Continued use constitutes acceptance.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const DeveloperModal = () => (
    <Modal visible={showDeveloperInfo} animationType="slide" transparent={false} onRequestClose={() => setShowDeveloperInfo(false)}>
      <SafeAreaView style={styles.infoModalContainer}>
        <View style={styles.infoModalHeader}>
          <Text style={styles.infoModalTitle}>Developer Info</Text>
          <TouchableOpacity onPress={() => setShowDeveloperInfo(false)}>
            <Ionicons name="close" size={28} color="#FF9F0A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.infoModalContent}>
          <View style={styles.developerCard}>
            <FontAwesome5 name="code" size={60} color="#FF9F0A" style={styles.developerIcon} />
            <Text style={styles.developerName}>NovaSec1 Team</Text>
            <Text style={styles.developerRole}>Financial Technology Division</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>📱 App Info</Text>
              <Text style={styles.infoLine}>Version: {appVersion}</Text>
              <Text style={styles.infoLine}>Build: {buildNumber}</Text>
              <Text style={styles.infoLine}>SDK: Expo 54</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>🛠️ Technologies</Text>
              <Text style={styles.infoLine}>• React Native / Expo</Text>
              <Text style={styles.infoLine}>• Expo SecureStore</Text>
              <Text style={styles.infoLine}>• Expo Haptics</Text>
              <Text style={styles.infoLine}>• Expo Audio</Text>
              <Text style={styles.infoLine}>• ExchangeRate-API</Text>
              <Text style={styles.infoLine}>• CoinGecko API</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>✨ Features</Text>
              <Text style={styles.infoLine}>• Live auto-calculation preview</Text>
              <Text style={styles.infoLine}>• Haptic touch feedback</Text>
              <Text style={styles.infoLine}>• Click sound effects</Text>
              <Text style={styles.infoLine}>• Currency converter (to KES)</Text>
              <Text style={styles.infoLine}>• Crypto converter (to KES)</Text>
              <Text style={styles.infoLine}>• Encrypted local history</Text>
            </View>


         <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Developer</Text>
              <Text style={styles.infoLine}>• John Munga</Text>
              <Text style={styles.infoLine}>• Email: technologiesnovasec@gmail.com</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ── History Modal ──────────────────────────────────────────────────────────
  const HistoryModal = () => (
    <Modal visible={showHistory} animationType="slide" transparent={false} onRequestClose={() => setShowHistory(false)}>
      <SafeAreaView style={styles.infoModalContainer}>
        <View style={styles.infoModalHeader}>
          <Text style={styles.infoModalTitle}>History</Text>
          <TouchableOpacity onPress={() => setShowHistory(false)}>
            <Ionicons name="close" size={28} color="#FF9F0A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.infoModalContent}>
          {history.length === 0 ? (
            <Text style={[styles.infoText, { color: '#555', textAlign: 'center', marginTop: 40 }]}>
              No calculations yet.
            </Text>
          ) : (
            history.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.historyItem}
                onPress={() => {
                  // Tap history item to load result back
                  const result = item.split('=').pop()?.trim();
                  if (result) {
                    setEquation(result);
                    setDisplayValue(result);
                    setLiveResult('');
                    setJustCalculated(true);
                    setShowHistory(false);
                    buttonFeedback('selection');
                  }
                }}
              >
                <Text style={styles.historyText}>{item}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ── Currency Modal ─────────────────────────────────────────────────────────
  const CurrencyModal = () => (
    <Modal visible={showCurrencyModal} transparent animationType="slide" onRequestClose={() => setShowCurrencyModal(false)}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>Select Currency</Text>
          <ScrollView>
            {currencies.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.pickerItem, selectedCurrency === c && styles.pickerItemSelected]}
                onPress={() => { setSelectedCurrency(c); setShowCurrencyModal(false); buttonFeedback('selection'); }}
              >
                <Text style={[styles.pickerItemText, selectedCurrency === c && styles.pickerItemTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.pickerClose} onPress={() => setShowCurrencyModal(false)}>
            <Text style={styles.pickerCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const CryptoModal = () => (
    <Modal visible={showCryptoModal} transparent animationType="slide" onRequestClose={() => setShowCryptoModal(false)}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>Select Crypto</Text>
          <ScrollView>
            {cryptos.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.pickerItem, selectedCrypto === c && styles.pickerItemSelected]}
                onPress={() => { setSelectedCrypto(c); setShowCryptoModal(false); buttonFeedback('selection'); }}
              >
                <Text style={[styles.pickerItemText, selectedCrypto === c && styles.pickerItemTextSelected]}>{c}</Text>
                {cryptoPrices[c] ? (
                  <Text style={styles.pickerItemSub}>${cryptoPrices[c].toLocaleString()}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.pickerClose} onPress={() => setShowCryptoModal(false)}>
            <Text style={styles.pickerCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Modals ── */}
      <MenuModal />
      <PolicyModal />
      <TermsModal />
      <DeveloperModal />
      <HistoryModal />
      <CurrencyModal />
      <CryptoModal />

      <SafeAreaView style={styles.container}>

        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { setShowHistory(true); buttonFeedback('light'); }}>
            <Ionicons name="time-outline" size={26} color="#FF9F0A" />
          </TouchableOpacity>
          <Text style={styles.appTitle}>Calculator</Text>
          <TouchableOpacity onPress={() => { setShowMenu(true); buttonFeedback('light'); }}>
            <Ionicons name="ellipsis-vertical" size={26} color="#FF9F0A" />
          </TouchableOpacity>
        </View>






{/* ── Tab Bar ── */}
<View style={styles.tabBar}>
  {['calculator', 'currency', 'crypto'].map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => {
        setActiveTab(tab);
        buttonFeedback('selection');
      }}
    >
      {tab === 'calculator' && (
        <Ionicons
          name="calculator-outline"
          size={22}
          color={activeTab === tab ? '#00e5ff' : '#aaa'}
        />
      )}

      {tab === 'currency' && (
        <MaterialCommunityIcons
          name="currency-usd"
          size={22}
          color={activeTab === tab ? '#00e5ff' : '#aaa'}
        />
      )}

      {tab === 'crypto' && (
        <MaterialCommunityIcons
          name="bitcoin"
          size={22}
          color={activeTab === tab ? '#00e5ff' : '#aaa'}
        />
      )}

      <Text
        style={[
          styles.tabText,
          activeTab === tab && styles.activeTabText,
        ]}
      >
        {tab === 'calculator'
          ? ' Calc'
          : tab === 'currency'
          ? ' FX'
          : ' Crypto'}
      </Text>
    </TouchableOpacity>
  ))}
</View>


        {/* ══════════════════════ CALCULATOR TAB ══════════════════════ */}
        {activeTab === 'calculator' && (
          <View style={styles.calculatorContainer}>

            {/* Display */}
            <View style={styles.displayContainer}>
              {/* Live preview result (shown while typing) */}
              {autoCalculate && liveResult !== '' && (
                <Text style={styles.livePreviewText} numberOfLines={1}>
                  = {liveResult}
                </Text>
              )}

              {/* Main equation display */}
              <Text
                style={[styles.displayText, { fontSize: getEquationFontSize() }]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {displayValue === '' ? '0' : displayValue}
              </Text>
            </View>

            {/* Button grid */}
            <View style={styles.buttonsContainer}>

              {/* Row 1 */}
              <View style={styles.buttonRow}>
                {renderButton('AC', clearDisplay, styles.functionButton, styles.functionButtonText)}
                {renderButton('+/-', toggleSign, styles.functionButton, styles.functionButtonText)}
                {renderButton('%', handlePercentage, styles.functionButton, styles.functionButtonText)}
                {renderButton('÷', () => performOperation('/'), styles.operatorButton, styles.operatorButtonText)}
              </View>

              {/* Row 2 */}
              <View style={styles.buttonRow}>
                {renderButton('7', () => inputDigit('7'), styles.numberButton, styles.numberButtonText)}
                {renderButton('8', () => inputDigit('8'), styles.numberButton, styles.numberButtonText)}
                {renderButton('9', () => inputDigit('9'), styles.numberButton, styles.numberButtonText)}
                {renderButton('×', () => performOperation('*'), styles.operatorButton, styles.operatorButtonText)}
              </View>

              {/* Row 3 */}
              <View style={styles.buttonRow}>
                {renderButton('4', () => inputDigit('4'), styles.numberButton, styles.numberButtonText)}
                {renderButton('5', () => inputDigit('5'), styles.numberButton, styles.numberButtonText)}
                {renderButton('6', () => inputDigit('6'), styles.numberButton, styles.numberButtonText)}
                {renderButton('−', () => performOperation('-'), styles.operatorButton, styles.operatorButtonText)}
              </View>

              {/* Row 4 */}
              <View style={styles.buttonRow}>
                {renderButton('1', () => inputDigit('1'), styles.numberButton, styles.numberButtonText)}
                {renderButton('2', () => inputDigit('2'), styles.numberButton, styles.numberButtonText)}
                {renderButton('3', () => inputDigit('3'), styles.numberButton, styles.numberButtonText)}
                {renderButton('+', () => performOperation('+'), styles.operatorButton, styles.operatorButtonText)}
              </View>

              {/* Row 5 */}
              <View style={styles.buttonRow}>
                {renderButton('0', () => inputDigit('0'), [styles.numberButton, styles.zeroButton], styles.numberButtonText)}
                {renderButton('⌫', backspace, styles.numberButton, [styles.numberButtonText, { color: '#FF9F0A' }])}
                {renderButton('=', handleEquals, styles.equalsButton, styles.equalsButtonText)}
              </View>

            </View>
          </View>
        )}

        {/* ══════════════════════ CURRENCY TAB ══════════════════════ */}
        {activeTab === 'currency' && (
          <ScrollView style={styles.converterContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.converterTitle}>Currency → KES</Text>

            <TouchableOpacity style={styles.selectorButton} onPress={() => setShowCurrencyModal(true)}>
              <Text style={styles.selectorButtonText}>{selectedCurrency}</Text>
              <Ionicons name="chevron-down" size={20} color="#FF9F0A" />
            </TouchableOpacity>

            {exchangeRates[selectedCurrency] ? (
              <Text style={styles.rateInfo}>
                1 {selectedCurrency} ≈ KES {((exchangeRates['KES'] || 150) / exchangeRates[selectedCurrency]).toFixed(2)}
              </Text>
            ) : null}

            <TextInput
              style={styles.converterInput}
              placeholder={`Amount in ${selectedCurrency}`}
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TouchableOpacity style={styles.convertButton} onPress={convertCurrency}>
              <Text style={styles.convertButtonText}>Convert</Text>
            </TouchableOpacity>

            {convertedKSH !== '' && (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Result</Text>
                <Text style={styles.resultValue}>{convertedKSH}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ══════════════════════ CRYPTO TAB ══════════════════════ */}
        {activeTab === 'crypto' && (
          <ScrollView style={styles.converterContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.converterTitle}>Crypto → KES</Text>

            <TouchableOpacity style={styles.selectorButton} onPress={() => setShowCryptoModal(true)}>
              <Text style={styles.selectorButtonText}>{selectedCrypto}</Text>
              <Ionicons name="chevron-down" size={20} color="#FF9F0A" />
            </TouchableOpacity>

            {cryptoPrices[selectedCrypto] ? (
              <Text style={styles.rateInfo}>
                1 {selectedCrypto} ≈ ${cryptoPrices[selectedCrypto].toLocaleString()} USD
              </Text>
            ) : (
              <Text style={styles.rateInfo}>Loading price...</Text>
            )}

            <TextInput
              style={styles.converterInput}
              placeholder={`Amount in ${selectedCrypto}`}
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TouchableOpacity style={styles.convertButton} onPress={convertCrypto}>
              <Text style={styles.convertButtonText}>Convert</Text>
            </TouchableOpacity>

            {convertedKSH !== '' && (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Result</Text>
                <Text style={styles.resultValue}>{convertedKSH}</Text>
              </View>
            )}
          </ScrollView>
        )}

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const DARK_BG = '#000000';
const BUTTON_DARK = '#1C1C1E';
const BUTTON_FUNC = '#2C2C2E';
const OPERATOR_COLOR = '#FF9F0A';
const EQUALS_COLOR = '#FF9F0A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#EBEBF5';
const ACCENT = '#FF9F0A';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  appTitle: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: BUTTON_DARK,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: ACCENT,
  },
  tabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#000',
  },

  // ── Calculator ──
  calculatorContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Display
  displayContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-end',
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  livePreviewText: {
    color: '#888',
    fontSize: 22,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  displayText: {
    color: TEXT_PRIMARY,
    fontWeight: '300',
    textAlign: 'right',
    letterSpacing: -1,
  },

  // Buttons
  buttonsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 26,
    fontWeight: '400',
  },
  disabledButton: {
    opacity: 0.4,
  },

  numberButton: {
    backgroundColor: BUTTON_DARK,
  },
  numberButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 26,
  },
  zeroButton: {
    flex: 2,
    alignItems: 'center',
    paddingLeft: 0,
  },
  functionButton: {
    backgroundColor: BUTTON_FUNC,
  },
  functionButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 22,
  },
  operatorButton: {
    backgroundColor: OPERATOR_COLOR,
  },
  operatorButtonText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '500',
  },
  equalsButton: {
    backgroundColor: EQUALS_COLOR,
    flex: 1,
  },
  equalsButtonText: {
    color: '#000',
    fontSize: 30,
    fontWeight: '500',
  },

  // ── Converter ──
  converterContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  converterTitle: {
    color: ACCENT,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BUTTON_DARK,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 8,
  },
  selectorButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
  },
  rateInfo: {
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
    marginLeft: 4,
  },
  converterInput: {
    backgroundColor: BUTTON_DARK,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: TEXT_PRIMARY,
    fontSize: 18,
    marginBottom: 16,
  },
  convertButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  convertButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: BUTTON_DARK,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  resultLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  resultValue: {
    color: ACCENT,
    fontSize: 32,
    fontWeight: '700',
  },

  // ── Picker modals ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  pickerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: ACCENT + '30',
  },
  pickerItemText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
  },
  pickerItemTextSelected: {
    color: ACCENT,
    fontWeight: '700',
  },
  pickerItemSub: {
    color: '#888',
    fontSize: 14,
  },
  pickerClose: {
    backgroundColor: BUTTON_FUNC,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  pickerCloseText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Menu modal ──
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 4,
  },

  // ── Info modals ──
  infoModalContainer: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoModalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
  },
  infoModalContent: {
    flex: 1,
    padding: 20,
  },
  infoText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 24,
  },
  infoBold: {
    fontWeight: '700',
    color: ACCENT,
  },

  // Developer card
  developerCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  developerIcon: {
    marginBottom: 16,
  },
  developerName: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  developerRole: {
    color: '#888',
    fontSize: 15,
    marginBottom: 24,
  },
  infoSection: {
    width: '100%',
    backgroundColor: BUTTON_DARK,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  infoSectionTitle: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  infoLine: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 6,
  },

  // History
  historyItem: {
    backgroundColor: BUTTON_DARK,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  historyText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
  },
});
