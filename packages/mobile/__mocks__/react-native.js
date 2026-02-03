const React = require('react');

module.exports = {
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => {
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style || {};
    }),
  },
  View: jest.fn(({ children, ...props }) => React.createElement('View', props, children)),
  Text: jest.fn(({ children, ...props }) => React.createElement('Text', props, children)),
  TextInput: jest.fn(({ children, ...props }) => React.createElement('TextInput', props, children)),
  TouchableOpacity: jest.fn(({ children, ...props }) => React.createElement('TouchableOpacity', props, children)),
  ActivityIndicator: jest.fn((props) => React.createElement('ActivityIndicator', props)),
  KeyboardAvoidingView: jest.fn(({ children, ...props }) => React.createElement('KeyboardAvoidingView', props, children)),
  ScrollView: jest.fn(({ children, ...props }) => React.createElement('ScrollView', props, children)),
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
};
