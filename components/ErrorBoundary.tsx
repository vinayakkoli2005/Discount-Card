import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the fallback UI for easier debugging */
  screenName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Per-screen error boundary.
 * Catches render-time crashes and shows a recoverable fallback UI.
 * Activate Sentry in Phase 3.2 — stub is already in componentDidCatch.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.screenName ? ` — ${this.props.screenName}` : ""}]`, error, info);
    // Phase 3.2: activate Sentry here
    // Sentry.Native.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-rubik-bold text-black-300 mb-2">
          Something went wrong
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          {this.props.screenName
            ? `The ${this.props.screenName} screen encountered an error.`
            : "An unexpected error occurred."}
        </Text>
        {__DEV__ && (
          <Text className="text-xs text-red-400 text-center mb-6 font-mono">
            {this.state.errorMessage}
          </Text>
        )}
        <TouchableOpacity
          onPress={this.handleRetry}
          className="bg-primary-300 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-rubik-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
